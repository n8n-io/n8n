import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import type { WorkflowPlanItem } from './workflow-import.types';
import type {
	ArchivedWorkflowSummary,
	ImportContext,
	WorkflowArchivalFailure,
} from '../../n8n-packages.types';

export interface PrunableWorkflow {
	id: string;
	name: string;
	parentFolderId: string | null;
}

export interface WorkflowPrunePlan {
	archivals: PrunableWorkflow[];
	failures: WorkflowArchivalFailure[];
}

const EMPTY_PLAN: WorkflowPrunePlan = { archivals: [], failures: [] };

/**
 * Reconciles a project scope against the package under `folderConflictPolicy=overwrite`: any
 * workflow the package does not contain is archived. Confined to the containers the package
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

		const archivals: PrunableWorkflow[] = [];
		const failures: WorkflowArchivalFailure[] = [];
		for (const candidate of candidates) {
			if (archivable.has(candidate.id)) {
				archivals.push(candidate);
			} else {
				failures.push({
					workflowId: candidate.id,
					name: candidate.name,
					projectId: context.projectId,
				});
			}
		}

		return { archivals, failures };
	}

	async apply(context: ImportContext, plan: WorkflowPrunePlan): Promise<ArchivedWorkflowSummary[]> {
		const summaries: ArchivedWorkflowSummary[] = [];

		for (const workflow of plan.archivals) {
			// `skipArchived` keeps a re-import idempotent rather than erroring on a second pass.
			await this.workflowService.archive(context.user, workflow.id, { skipArchived: true });
			summaries.push({
				workflowId: workflow.id,
				name: workflow.name,
				projectId: context.projectId,
				parentFolderId: workflow.parentFolderId,
			});
		}

		return summaries;
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
