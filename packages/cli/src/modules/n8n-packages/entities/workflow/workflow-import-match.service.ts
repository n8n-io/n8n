import { WorkflowRepository, type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

export interface WorkflowIdConflict {
	sourceWorkflowId: string;
	existingWorkflowId: string;
	/** Owning project of the existing workflow; null when no owner share exists. */
	existingProjectId: string | null;
	isArchived: boolean;
	name: string;
}

export interface WorkflowLineageConflict {
	sourceWorkflowId: string;
	projectId: string;
	existingWorkflows: Array<{
		id: string;
		name: string;
		isArchived: boolean;
	}>;
}

interface WorkflowImportMatches {
	matches: Map<string, WorkflowEntity>;
	lineageConflicts: WorkflowLineageConflict[];
}

@Service()
export class WorkflowImportMatchService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async findOwningProjectsByWorkflowId(
		workflowIds: string[],
	): Promise<Map<string, { projectId: string | null; name: string; isArchived: boolean }>> {
		if (workflowIds.length === 0) return new Map();

		const workflows = await this.workflowRepository.findPreExistingWorkflows(workflowIds);

		return new Map(
			workflows.map((workflow) => [
				workflow.id,
				{
					projectId: workflow.shared?.[0]?.projectId ?? null,
					name: workflow.name,
					isArchived: workflow.isArchived,
				},
			]),
		);
	}

	async findBySourceWorkflowIds(
		projectId: string,
		sourceWorkflowIds: string[],
	): Promise<WorkflowImportMatches> {
		if (sourceWorkflowIds.length === 0) {
			return { matches: new Map(), lineageConflicts: [] };
		}

		const packageWorkflowIds = new Set(sourceWorkflowIds);
		const finderOptions = {
			includeActiveVersion: true,
			includeParentFolder: true,
			includeArchived: true,
		} as const;
		const matchBySourceWorkflowId = new Map<string, WorkflowEntity>();
		const lineageConflicts: WorkflowLineageConflict[] = [];

		const workflows = await this.workflowFinderService.findOwnedWorkflowsBySourceWorkflowIds(
			projectId,
			sourceWorkflowIds,
			finderOptions,
		);

		const workflowsBySourceId = new Map<string, WorkflowEntity[]>();
		for (const workflow of workflows) {
			if (!workflow.sourceWorkflowId) continue;

			const key = workflow.sourceWorkflowId;
			if (!packageWorkflowIds.has(key)) continue;
			const candidates = workflowsBySourceId.get(key) ?? [];
			candidates.push(workflow);
			workflowsBySourceId.set(key, candidates);
		}

		for (const [sourceWorkflowId, candidates] of workflowsBySourceId) {
			const activeCandidates = candidates.filter((workflow) => !workflow.isArchived);
			if (candidates.length === 1 || activeCandidates.length === 1) {
				matchBySourceWorkflowId.set(sourceWorkflowId, activeCandidates[0] ?? candidates[0]);
				continue;
			}

			const sortedCandidates = candidates.toSorted((left, right) =>
				left.id.localeCompare(right.id),
			);
			matchBySourceWorkflowId.set(sourceWorkflowId, sortedCandidates[0]);
			lineageConflicts.push({
				sourceWorkflowId,
				projectId,
				existingWorkflows: sortedCandidates.map(({ id, name, isArchived }) => ({
					id,
					name,
					isArchived,
				})),
			});
		}

		for (const workflow of workflows) {
			if (workflow.sourceWorkflowId !== null) continue;

			const key = workflow.id;
			if (!packageWorkflowIds.has(key) || matchBySourceWorkflowId.has(key)) continue;

			matchBySourceWorkflowId.set(key, workflow);
		}

		return { matches: matchBySourceWorkflowId, lineageConflicts };
	}
}
