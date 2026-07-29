import { Service } from '@n8n/di';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import type { WorkflowPlanItem } from './workflow-import.types';
import { OverwriteDeletionPolicy } from '../../n8n-packages.types';
import type {
	ImportContext,
	RemovedWorkflowSummary,
	WorkflowRemovalFailure,
} from '../../n8n-packages.types';

export interface PrunableWorkflow {
	id: string;
	name: string;
	parentFolderId: string | null;
}

export interface WorkflowPrunePlan {
	removals: PrunableWorkflow[];
	failures: WorkflowRemovalFailure[];
}

const EMPTY_PLAN: WorkflowPrunePlan = { removals: [], failures: [] };

/**
 * Reconciles a project scope against the package under `folderConflictPolicy=overwrite`: any
 * workflow the package does not contain is removed, per `overwriteDeletionPolicy`. Confined to the
 * containers the package
 * describes — the project root and the folders it defines — so a target-only folder shelters
 * its contents.
 */
@Service()
export class WorkflowPruner {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowService: WorkflowService,
	) {}

	async plan(
		context: ImportContext,
		input: {
			workflowItems: WorkflowPlanItem[];
			packageFolderIds: string[];
			/** Sub-workflow ids the package's workflows depend on but does not carry itself. */
			subWorkflowRequirementIds?: string[];
		},
	): Promise<WorkflowPrunePlan> {
		const placements = await this.workflowFinderService.findOwnedWorkflowPlacementsInProject(
			context.projectId,
		);
		if (placements.length === 0) return EMPTY_PLAN;

		const retained = retainedWorkflowIds(input.workflowItems, input.subWorkflowRequirementIds);
		const packageFolderIds = new Set(input.packageFolderIds);

		const candidates = placements.filter(
			({ id, parentFolderId }) =>
				!retained.has(id) &&
				// `null` is the project root, which a project package always describes.
				(parentFolderId === null || packageFolderIds.has(parentFolderId)),
		);
		if (candidates.length === 0) return EMPTY_PLAN;

		const archivable = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
			candidates.map(({ id }) => id),
			context.user,
			['workflow:delete'],
		);

		const removals: PrunableWorkflow[] = [];
		const failures: WorkflowRemovalFailure[] = [];
		for (const candidate of candidates) {
			if (archivable.has(candidate.id)) {
				removals.push(candidate);
			} else {
				failures.push({
					workflowId: candidate.id,
					name: candidate.name,
					projectId: context.projectId,
				});
			}
		}

		return { removals, failures };
	}

	async apply(
		context: ImportContext,
		plan: WorkflowPrunePlan,
		policy: OverwriteDeletionPolicy,
	): Promise<RemovedWorkflowSummary[]> {
		const summaries: RemovedWorkflowSummary[] = [];

		for (const workflow of plan.removals) {
			// Archive first either way: it is the step that unpublishes, and `delete` refuses a
			// published workflow outright. `skipArchived` keeps a re-run from erroring.
			await this.workflowService.archive(context.user, workflow.id, { skipArchived: true });

			summaries.push({
				workflowId: workflow.id,
				name: workflow.name,
				projectId: context.projectId,
				parentFolderId: workflow.parentFolderId,
				deletion:
					policy === OverwriteDeletionPolicy.HardDelete && (await this.tryDelete(context, workflow))
						? 'deleted'
						: 'archived',
			});
		}

		return summaries;
	}

	/**
	 * Deletes an archived workflow, reporting whether the row actually went. Unpublishing defers
	 * trigger teardown, so a workflow that was published moments ago cannot be deleted yet; leaving
	 * it archived beats failing an import whose content is already written.
	 */
	private async tryDelete(context: ImportContext, workflow: PrunableWorkflow): Promise<boolean> {
		try {
			await this.workflowService.delete(context.user, workflow.id);
			return true;
		} catch (error) {
			if (error instanceof ConflictError) return false;
			throw error;
		}
	}
}

/**
 * Target ids the package accounts for. `create` carries the id it will be written under, while
 * `update`/`skip` carry the pre-existing workflow they matched — so a workflow matched by
 * `sourceWorkflowId` is retained even when the package and the target disagree on its id.
 *
 * Sub-workflow dependencies the package references but does not carry are retained too:
 * archiving one would leave a packaged parent unable to publish.
 */
function retainedWorkflowIds(
	items: WorkflowPlanItem[],
	subWorkflowRequirementIds: string[] = [],
): Set<string> {
	return new Set([
		...items.map((item) => (item.action === 'create' ? item.decidedId : item.existing.id)),
		...subWorkflowRequirementIds,
	]);
}
