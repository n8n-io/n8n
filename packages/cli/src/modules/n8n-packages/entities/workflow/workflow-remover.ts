import { Service } from '@n8n/di';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { removesUnpackagedWorkflows } from '../folder/folder-conflict-policy';
import type { WorkflowPlanItem } from './workflow-import.types';
import type {
	RemovableWorkflow,
	WorkflowRemovalPlan,
	WorkflowRemovalRequest,
} from './workflow-removal.types';
import { OverwriteDeletionPolicy } from '../../n8n-packages.types';
import type { ImportContext, RemovedWorkflowSummary } from '../../n8n-packages.types';

/**
 * Reconciles a project scope against the package under `folderConflictPolicy=overwrite`: a workflow
 * the package does not account for is removed, per `overwriteDeletionPolicy`. Package imports are
 * confined to represented folders; Git directory imports can make the whole project authoritative.
 */
@Service()
export class WorkflowRemover {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowService: WorkflowService,
	) {}

	async plan(
		context: ImportContext,
		request: WorkflowRemovalRequest,
	): Promise<WorkflowRemovalPlan> {
		const nothingToRemove = {
			removals: [],
			failures: [],
			deletionPolicy: request.deletionPolicy,
			occupiedFolderIds: [],
		};

		// Owned here rather than by the caller: the policy that turns reconciliation on is this
		// service's concern, and a project being created holds nothing to reconcile against.
		if (
			!removesUnpackagedWorkflows(request.folderConflictPolicy) ||
			request.projectPendingCreation
		) {
			return nothingToRemove;
		}

		// Archived rows load too: reconciliation treats them as already removed, so they are never
		// candidates — but a folder holding one is still occupied and must survive folder removal.
		const placements = await this.workflowFinderService.findOwnedWorkflowPlacementsInProject(
			context.projectId,
			{ includeArchived: true },
		);
		if (placements.length === 0) return nothingToRemove;

		const candidates = candidatesFor(placements, request);
		if (candidates.length === 0) {
			return { ...nothingToRemove, occupiedFolderIds: occupiedBy(placements) };
		}

		const removable = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
			candidates.map(({ id }) => id),
			context.user,
			['workflow:delete'],
		);

		const removals = candidates.filter(({ id }) => removable.has(id));
		const removedIds = new Set(removals.map(({ id }) => id));

		return {
			removals,
			failures: candidates
				.filter(({ id }) => !removable.has(id))
				.map(({ id, name }) => ({ workflowId: id, name, projectId: context.projectId })),
			deletionPolicy: request.deletionPolicy,
			occupiedFolderIds: occupiedBy(placements.filter(({ id }) => !removedIds.has(id))),
		};
	}

	async apply(
		context: ImportContext,
		plan: WorkflowRemovalPlan,
	): Promise<RemovedWorkflowSummary[]> {
		const summaries: RemovedWorkflowSummary[] = [];

		for (const workflow of plan.removals) {
			// Archiving is the step that unpublishes, and `delete` refuses a published workflow outright,
			// so it runs first under either policy. `skipArchived` keeps a re-run from erroring.
			await this.workflowService.archive(context.user, workflow.id, { skipArchived: true });

			const deleted =
				plan.deletionPolicy === OverwriteDeletionPolicy.HardDelete &&
				(await this.deleteArchived(context, workflow));

			summaries.push({
				workflowId: workflow.id,
				name: workflow.name,
				projectId: context.projectId,
				parentFolderId: workflow.parentFolderId,
				deletion: deleted ? 'deleted' : 'archived',
			});
		}

		return summaries;
	}

	/**
	 * Deletes a just-archived workflow, reporting whether the row actually went.
	 *
	 * Of the two `ConflictError`s `delete` raises, only the deferred-teardown one is reachable here:
	 * archiving cleared `activeVersionId`, so the workflow can no longer read as published. That race
	 * leaves the row in place, and reporting it as archived beats failing an import whose content is
	 * already written.
	 */
	private async deleteArchived(
		context: ImportContext,
		workflow: RemovableWorkflow,
	): Promise<boolean> {
		try {
			await this.workflowService.delete(context.user, workflow.id);
			return true;
		} catch (error) {
			if (error instanceof ConflictError) return false;
			throw error;
		}
	}
}

/** Folders holding at least one of the given workflows. */
function occupiedBy(placements: RemovableWorkflow[]): string[] {
	return [
		...new Set(
			placements
				.map(({ parentFolderId }) => parentFolderId)
				.filter((id): id is string => id !== null),
		),
	];
}

function candidatesFor(
	placements: Array<RemovableWorkflow & { isArchived: boolean }>,
	request: WorkflowRemovalRequest,
): RemovableWorkflow[] {
	const retained = retainedWorkflowIds(request);
	const packageFolderIds = new Set(request.packageFolderIds);
	const isGitPull = request.importSource === 'git-pull';

	return placements
		.filter(
			({ id, parentFolderId, isArchived }) =>
				// Already archived means already removed.
				!isArchived &&
				!retained.has(id) &&
				(isGitPull || parentFolderId === null || packageFolderIds.has(parentFolderId)),
		)
		.map(({ id, name, parentFolderId }) => ({ id, name, parentFolderId }));
}

/**
 * Target ids the package accounts for. `create` carries the id it will be written under, while
 * `update`/`skip` carry the pre-existing workflow they matched — so a workflow matched by
 * `sourceWorkflowId` is retained even when the package and the target disagree on its id.
 *
 * Sub-workflow dependencies the package references but does not carry are retained too: removing
 * one would leave a packaged parent unable to publish.
 */
function retainedWorkflowIds({
	workflowItems,
	subWorkflowRequirementIds = [],
}: WorkflowRemovalRequest): Set<string> {
	return new Set([...workflowItems.map(targetIdOf), ...subWorkflowRequirementIds]);
}

function targetIdOf(item: WorkflowPlanItem): string {
	return item.action === 'create' ? item.decidedId : item.existing.id;
}
