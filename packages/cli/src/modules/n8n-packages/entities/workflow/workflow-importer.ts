import { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import {
	WorkflowCreationService,
	type WorkflowCreateBatchContext,
} from '@/workflows/workflow-creation.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { workflowReferences } from './references/workflow-references';
import {
	decideWorkflowArchiveTransition,
	type WorkflowArchiveTransition,
} from './workflow-archive-transition';
import { decideWorkflowConflictAction } from './workflow-conflict-policy';
import { decideWorkflowId } from './workflow-id-policy';
import {
	WorkflowImportMatchService,
	type WorkflowIdConflict,
} from './workflow-import-match.service';
import type {
	PersistedWorkflowOutcome,
	PersistedWorkflowPlanItem,
	PreparedWorkflow,
	WorkflowArchiveForbidden,
	WorkflowConflict,
	WorkflowFolderConflict,
	WorkflowImportContext,
	WorkflowImportPlan,
	WorkflowPlanItem,
	WorkflowPlannedAction,
} from './workflow-import.types';
import type {
	ImportBindingMap,
	ImportContext,
	ImportWorkflowProperties,
	PackageImportBindings,
	WorkflowIdPolicy,
} from '../../n8n-packages.types';
import { visitWorkflowCredentials } from '../credential/workflow-credential-references';

export interface WorkflowImportResult {
	outcomes: PersistedWorkflowOutcome[];
	bindings: PackageImportBindings;
}

/**
 * Imports a batch of prepared workflows in two phases:
 * {@link plan} matches each workflow against the destination project and decides what action create/update/skip
 * {@link apply} writes that plan into n8n. Publishing is a separate package-wide sweep.
 */
@Service()
export class WorkflowImporter {
	constructor(
		private readonly workflowImportMatchService: WorkflowImportMatchService,
		private readonly workflowCreationService: WorkflowCreationService,
		private readonly workflowService: WorkflowService,
		private readonly workflowFinderService: WorkflowFinderService,
	) {}

	async plan(
		context: ImportContext,
		prepared: PreparedWorkflow[],
		options: ImportWorkflowProperties,
	): Promise<WorkflowImportPlan> {
		const { matches: existingBySourceWorkflowId, lineageConflicts } =
			await this.workflowImportMatchService.findBySourceWorkflowIds(
				context.projectId,
				prepared.map(({ sourceWorkflowId }) => sourceWorkflowId),
			);

		const items: WorkflowPlanItem[] = [];
		const conflicts: WorkflowConflict[] = [];
		const folderConflicts: WorkflowFolderConflict[] = [];
		// `source`-policy ids that would be freshly created — candidates for a
		// global id collision check below. Blocked creates are excluded: they
		// already report a workflow-conflict for the same workflow.
		const sourceCreateIds: string[] = [];
		const archiveTransitionItems: ArchiveTransitionPlanItem[] = [];
		const ambiguousSourceIds = new Set(
			lineageConflicts.map(({ sourceWorkflowId }) => sourceWorkflowId),
		);

		for (const workflow of prepared) {
			const existing = existingBySourceWorkflowId.get(workflow.sourceWorkflowId) ?? null;
			if (existing && ambiguousSourceIds.has(workflow.sourceWorkflowId)) {
				items.push({ action: 'skip', ...workflow, existing });
				continue;
			}
			const { action, blocked } = decideWorkflowConflictAction(
				options.workflowConflictPolicy,
				existing,
			);

			const item = toPlanItem(workflow, existing, action, options.workflowIdPolicy);
			items.push(item);

			if (item.action === 'create' && options.workflowIdPolicy === 'source' && !blocked) {
				sourceCreateIds.push(item.decidedId);
			}

			if (hasArchiveTransition(item)) {
				archiveTransitionItems.push(item);
			}

			if (blocked && existing) {
				conflicts.push({
					sourceWorkflowId: workflow.sourceWorkflowId,
					existingWorkflowId: existing.id,
					name: existing.name,
				});
			}

			// Only an update writes the workflow in place, so only an update can clash on location.
			const targetFolderId = workflow.parentFolderId ?? context.folderId;
			if (targetFolderId && item.action === 'update') {
				const existingParentFolderId = item.existing.parentFolder?.id ?? null;
				if (existingParentFolderId !== targetFolderId) {
					folderConflicts.push({
						sourceWorkflowId: workflow.sourceWorkflowId,
						existingWorkflowId: item.existing.id,
						existingParentFolderId,
						targetFolderId,
						name: item.existing.name,
					});
				}
			}
		}

		const [idConflicts, archiveForbidden] = await Promise.all([
			this.collectIdConflicts(sourceCreateIds),
			this.collectArchiveForbidden(context, archiveTransitionItems),
		]);

		return {
			items,
			conflicts,
			lineageConflicts,
			idConflicts,
			folderConflicts,
			archiveForbidden,
		};
	}

	/**
	 * Archive changes need `workflow:delete`, which `update` does not check. Report the misses at
	 * plan time so nothing is written first.
	 */
	private async collectArchiveForbidden(
		context: ImportContext,
		items: ArchiveTransitionPlanItem[],
	): Promise<WorkflowArchiveForbidden[]> {
		if (items.length === 0) return [];

		const allowed = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
			items.map(({ existing }) => existing.id),
			context.user,
			['workflow:delete'],
		);

		return items.flatMap(({ sourceWorkflowId, existing, archiveTransition }) => {
			if (allowed.has(existing.id)) return [];
			return [
				{
					sourceWorkflowId,
					existingWorkflowId: existing.id,
					name: existing.name,
					projectId: context.projectId,
					transition: archiveTransition,
				},
			];
		});
	}

	/**
	 * For `source`-policy creates, a workflow id is only safe to reuse if it
	 * exists nowhere else in the instance (ids are a global primary key). Any hit
	 * — even in another project — blocks the import.
	 */
	private async collectIdConflicts(candidateIds: string[]): Promise<WorkflowIdConflict[]> {
		const existing =
			await this.workflowImportMatchService.findOwningProjectsByWorkflowId(candidateIds);

		return candidateIds.flatMap((id) => {
			const location = existing.get(id);
			if (!location) return [];
			return [
				{
					sourceWorkflowId: id,
					existingWorkflowId: id,
					existingProjectId: location.projectId,
					isArchived: location.isArchived,
					name: location.name,
				},
			];
		});
	}

	/**
	 * Writes the planned workflows. Publishing is deliberately not done here: activation rejects a
	 * parent whose sub-workflow is not yet published, so it has to wait until every workflow in the
	 * package exists — see `WorkflowPublisher.applyToPackage`.
	 */
	async apply(
		context: WorkflowImportContext,
		plan: WorkflowImportPlan,
		bindings: PackageImportBindings,
	): Promise<WorkflowImportResult> {
		const workflowBindings = new Map([
			...bindings.workflows,
			...collectPlannedWorkflowBindings(plan.items),
		]);
		const resolvedBindings: PackageImportBindings = { ...bindings, workflows: workflowBindings };
		const createItems = plan.items.filter((item) => item.action === 'create');
		const batchContext =
			createItems.length === 0
				? undefined
				: await this.workflowCreationService.prepareBatchContext(
						context.user,
						context.projectId,
						createItems.flatMap((item) => {
							const folderId = item.parentFolderId ?? context.folderId;
							return folderId ? [folderId] : [];
						}),
						createItems.map(({ entity }) => entity),
						resolvedBindings.credentials,
					);

		const outcomes: PersistedWorkflowOutcome[] = [];
		for (const item of plan.items) {
			outcomes.push(await this.applyItem(context, item, resolvedBindings, batchContext));
		}

		return { outcomes, bindings: resolvedBindings };
	}

	private async applyItem(
		context: WorkflowImportContext,
		item: WorkflowPlanItem,
		bindings: PackageImportBindings,
		batchContext: WorkflowCreateBatchContext | undefined,
	): Promise<PersistedWorkflowOutcome> {
		if (item.action === 'skip') {
			return {
				status: 'skipped',
				workflow: item.existing,
				sourceWorkflowId: item.sourceWorkflowId,
			};
		}

		return {
			status: item.action === 'create' ? 'created' : 'updated',
			workflow: await this.persistWorkflow(context, item, bindings, batchContext),
			sourceWorkflowId: item.sourceWorkflowId,
			item,
		};
	}

	private async persistWorkflow(
		context: WorkflowImportContext,
		item: PersistedWorkflowPlanItem,
		bindings: PackageImportBindings,
		batchContext: WorkflowCreateBatchContext | undefined,
	): Promise<WorkflowEntity> {
		const tagIds =
			item.tagIds && [...new Set(item.tagIds)].filter((id) => !context.droppedTagIds.has(id));

		if (item.action === 'create') {
			const entity = prepareEntityForPersist(item.entity, bindings, item.decidedId);
			return await this.workflowCreationService.createWorkflow(context.user, entity, {
				projectId: context.projectId,
				parentFolderId: item.parentFolderId ?? context.folderId ?? undefined,
				publicApi: true,
				source: 'import',
				sourceWorkflowId: item.sourceWorkflowId,
				...(batchContext ? { batchContext } : {}),
				...(tagIds !== undefined ? { tagIds } : {}),
			});
		}

		const entity = prepareEntityForPersist(item.entity, bindings);

		const updated = await this.workflowService.update(context.user, entity, item.existing.id, {
			publicApi: true,
			source: 'import',
			allowArchivedUpdate: item.existing.isArchived,
			...(tagIds !== undefined ? { tagIds } : {}),
		});

		if (item.archiveTransition !== null) {
			return await this.transitionArchive(context, item, item.archiveTransition);
		}

		return updated;
	}

	private async transitionArchive(
		context: WorkflowImportContext,
		item: UpdatePlanItem,
		transition: WorkflowArchiveTransition,
	): Promise<WorkflowEntity> {
		const workflow =
			transition === 'archive'
				? await this.workflowService.archive(context.user, item.existing.id, {
						skipArchived: true,
					})
				: await this.workflowService.unarchive(context.user, item.existing.id);

		// The plan already checked `workflow:delete`; this only trips if access changed since.
		if (!workflow) {
			throw new ForbiddenError(
				`You do not have permission to ${transition} workflow ${item.existing.id}.`,
			);
		}

		return workflow;
	}
}

type UpdatePlanItem = Extract<WorkflowPlanItem, { action: 'update' }>;
type ArchiveTransitionPlanItem = UpdatePlanItem & {
	archiveTransition: WorkflowArchiveTransition;
};

function hasArchiveTransition(item: WorkflowPlanItem): item is ArchiveTransitionPlanItem {
	return item.action === 'update' && item.archiveTransition !== null;
}

function planItemTargetId(item: WorkflowPlanItem): string {
	return item.action === 'create' ? item.decidedId : item.existing.id;
}

export function collectPlannedWorkflowBindings(items: WorkflowPlanItem[]): ImportBindingMap {
	return new Map(items.map((item) => [item.sourceWorkflowId, planItemTargetId(item)]));
}

/** Clones package content for persistence without mutating the import plan. */
function prepareEntityForPersist(
	source: WorkflowEntity,
	bindings: PackageImportBindings,
	decidedId?: string,
): WorkflowEntity {
	const entity = Object.assign(new WorkflowEntity(), source, {
		nodes: structuredClone(source.nodes),
		...(source.settings ? { settings: structuredClone(source.settings) } : {}),
		...(decidedId !== undefined ? { id: decidedId } : {}),
	});
	applyCredentialBindingsInPlace(entity, bindings.credentials);
	for (const reference of workflowReferences) reference.apply(entity, bindings);
	return entity;
}

/** Mutates node credential ids on `entity` using the resolved import binding map. */
function applyCredentialBindingsInPlace(
	entity: WorkflowEntity,
	credentialBindings: ImportBindingMap,
): void {
	visitWorkflowCredentials(entity.nodes, (_credentialType, details) => {
		if (!details.id) return false;

		const targetId = credentialBindings.get(details.id);
		if (!targetId || targetId === details.id) return false;

		details.id = targetId;
		return true;
	});
}

function toPlanItem(
	prepared: PreparedWorkflow,
	existing: WorkflowEntity | null,
	action: WorkflowPlannedAction,
	idPolicy: WorkflowIdPolicy,
): WorkflowPlanItem {
	if (existing === null) {
		return {
			action: 'create',
			decidedId: decideWorkflowId(idPolicy, prepared.sourceWorkflowId),
			...prepared,
		};
	}

	switch (action) {
		case 'update': {
			return {
				action,
				...prepared,
				existing,
				archiveTransition: decideWorkflowArchiveTransition(
					prepared.entity.isArchived,
					existing.isArchived,
				),
			};
		}
		case 'skip':
			return { action, ...prepared, existing };
		case 'create':
			// Only `fail` reaches here with a match; it records a conflict the gate rejects first.
			return {
				action,
				decidedId: decideWorkflowId(idPolicy, prepared.sourceWorkflowId),
				...prepared,
			};
	}
}
