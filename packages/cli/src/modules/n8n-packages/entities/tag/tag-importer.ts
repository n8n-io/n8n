import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { TagService } from '@/services/tag.service';

import { decideTagImportAction } from './tag-import-decision';
import type { TagDecisionFailure } from './tag-import-decision';
import { sortedUnique } from './tag.types';
import type {
	ReferencingWorkflow,
	TagImportPlan,
	TagImportRequest,
	TagRef,
	TagResolutionFailure,
} from './tag.types';
import type { ImportContext } from '../../n8n-packages.types';

@Service()
export class TagImporter {
	constructor(
		private readonly tagService: TagService,
		private readonly globalConfig: GlobalConfig,
	) {}

	/**
	 * Resolves the tags referenced by the applied (non-skipped) workflows'
	 * `tagIds` against the target instance, by source id. Read-only. A `tagIds`
	 * entry without a matching `requirements.tags` entry is a malformed package:
	 * apply would FK-fail on it, so it rejects outright instead of gating.
	 */
	async plan(
		context: ImportContext,
		request: TagImportRequest,
		appliedWorkflows: ReferencingWorkflow[],
	): Promise<TagImportPlan> {
		const plan: TagImportPlan = {
			matched: [],
			creations: [],
			renames: [],
			reconciles: [],
			dropped: [],
			failures: [],
		};
		// Disabled tags are a silent no-op: nothing gates, nothing is written.
		if (this.globalConfig.tags.disabled) return plan;

		const referencedTagIds = [...new Set(appliedWorkflows.flatMap(({ tagIds }) => tagIds ?? []))];
		if (referencedTagIds.length === 0) return plan;

		const requirementsById = new Map(
			(request.requirements ?? []).map((requirement) => [requirement.id, requirement]),
		);
		const referencedRequirements = referencedTagIds.map((id) => {
			const requirement = requirementsById.get(id);
			if (!requirement) {
				throw new UserError(
					`Package workflows reference tag "${id}", which is missing from the package's tag requirements.`,
				);
			}
			return requirement;
		});

		const targetsById = new Map(
			(await this.tagService.getByIds(referencedTagIds)).map((tag) => [tag.id, toTagRef(tag)]),
		);
		const wantedNames = [...new Set(referencedRequirements.map(({ name }) => name.trim()))];
		const holdersByName = new Map(
			(await this.tagService.getByNames(wantedNames)).map((tag) => [tag.name, toTagRef(tag)]),
		);

		const decisionFailures: TagDecisionFailure[] = [];
		for (const requirement of referencedRequirements) {
			const holder = holdersByName.get(requirement.name.trim());
			const effect = decideTagImportAction(
				requirement,
				targetsById.get(requirement.id),
				holder && holder.id !== requirement.id ? holder : undefined,
				request.missingMode,
				request.conflictPolicy,
			);
			if (effect.action === 'attach') plan.matched.push(effect.target);
			else if (effect.action === 'create') plan.creations.push(effect.tag);
			else if (effect.action === 'rename') plan.renames.push(effect.rename);
			else if (effect.action === 'reconcile') plan.reconciles.push(effect.reconcile);
			else if (effect.action === 'drop') plan.dropped.push(effect.tag);
			else decisionFailures.push(effect.failure);
		}

		decisionFailures.push(...duplicateWrittenNameFailures(plan));

		const sourceWorkflowIdsReferencing = (tagId: string) =>
			appliedWorkflows
				.filter(({ tagIds }) => tagIds?.includes(tagId))
				.map(({ sourceWorkflowId }) => sourceWorkflowId);

		plan.failures = decisionFailures.map((failure) => ({
			...failure,
			usedByWorkflows: sortedUnique(sourceWorkflowIdsReferencing(failure.sourceId)),
		}));

		// Tags are global entities, so gate on the user's global scopes: project-level
		// workflow:import alone must not grant instance-wide tag writes.
		if (plan.creations.length > 0 && !hasGlobalScope(context.user, 'tag:create')) {
			plan.failures.push(
				permissionFailure(
					'tag:create',
					plan.creations.map(({ id }) => id),
					sourceWorkflowIdsReferencing,
				),
			);
		}
		const updatedTagIds = [...plan.renames, ...plan.reconciles].map(({ id }) => id);
		if (updatedTagIds.length > 0 && !hasGlobalScope(context.user, 'tag:update')) {
			plan.failures.push(
				permissionFailure('tag:update', updatedTagIds, sourceWorkflowIdsReferencing),
			);
		}

		return plan;
	}

	/**
	 * Idempotent create-if-absent / rename-if-differs / reconcile-if-not-yet,
	 * so several scopes of a project package can carry the same plan for one
	 * global tag: the first apply writes, later ones no-op.
	 */
	async apply(context: ImportContext, plan: TagImportPlan): Promise<void> {
		if (plan.creations.length === 0 && plan.renames.length === 0 && plan.reconciles.length === 0) {
			return;
		}

		// Defense in depth: the plan phase already reports a missing scope as a
		// blocking issue, but apply re-checks before writing anything.
		if (plan.creations.length > 0 && !hasGlobalScope(context.user, 'tag:create')) {
			throw new ForbiddenError('User is missing a scope required to create a tag');
		}
		if (
			(plan.renames.length > 0 || plan.reconciles.length > 0) &&
			!hasGlobalScope(context.user, 'tag:update')
		) {
			throw new ForbiddenError('User is missing a scope required to rename or reconcile a tag');
		}

		const existingById = new Map(
			(
				await this.tagService.getByIds([
					...plan.creations.map(({ id }) => id),
					...plan.renames.map(({ id }) => id),
					...plan.reconciles.flatMap(({ id, oldId }) => [id, oldId]),
				])
			).map((tag) => [tag.id, tag]),
		);

		for (const creation of plan.creations) {
			if (existingById.has(creation.id)) continue;
			await this.tagService.save(this.tagService.toEntity(creation), 'create');
		}
		for (const rename of plan.renames) {
			const current = existingById.get(rename.id);
			if (!current || current.name === rename.to) continue;
			await this.tagService.save(
				this.tagService.toEntity({ id: rename.id, name: rename.to }),
				'update',
			);
		}
		for (const reconcile of plan.reconciles) {
			if (existingById.has(reconcile.id)) continue;
			// Only a concurrent actor deleting the tag between plan and apply can
			// leave the old id missing here — package-content contradictions that
			// consume it are gated package-wide at plan time. Same residual race
			// class as renames.
			if (!existingById.has(reconcile.oldId)) continue;
			await this.tagService.reconcileTagId(reconcile.oldId, reconcile.id);
		}
	}
}

function toTagRef(tag: { id: string; name: string }): TagRef {
	return { id: tag.id, name: tag.name };
}

/**
 * Two planned writes landing on one name (two creations, or a creation plus a
 * rename) would hit the tag name's unique index at apply, after the gate —
 * so they gate as name collisions instead.
 */
function duplicateWrittenNameFailures(plan: TagImportPlan): TagDecisionFailure[] {
	const nameCounts = new Map<string, number>();
	const writtenNames = [
		...plan.creations.map(({ name }) => name),
		...plan.renames.map(({ to }) => to),
	];
	for (const name of writtenNames) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);

	const duplicated = (name: string) => (nameCounts.get(name) ?? 0) > 1;
	return [
		...plan.creations
			.filter(({ name }) => duplicated(name))
			.map(({ id, name }): TagDecisionFailure => ({ kind: 'name-collision', sourceId: id, name })),
		...plan.renames
			.filter(({ to }) => duplicated(to))
			.map(
				({ id, to }): TagDecisionFailure => ({ kind: 'name-collision', sourceId: id, name: to }),
			),
	];
}

function permissionFailure(
	missingScope: 'tag:create' | 'tag:update',
	tagIds: string[],
	sourceWorkflowIdsReferencing: (tagId: string) => string[],
): TagResolutionFailure {
	return {
		kind: 'permission-denied',
		missingScope,
		usedByWorkflows: sortedUnique(tagIds.flatMap(sourceWorkflowIdsReferencing)),
	};
}
