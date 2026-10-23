import { WorkflowRepository, type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { matchSourceIds } from '../match-source-ids';

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

		const finderOptions = {
			includeActiveVersion: true,
			includeParentFolder: true,
			includeArchived: true,
		} as const;
		const lineageConflicts: WorkflowLineageConflict[] = [];

		const workflows = await this.workflowFinderService.findOwnedWorkflowsBySourceWorkflowIds(
			projectId,
			sourceWorkflowIds,
			finderOptions,
		);

		const { matches, ambiguous } = matchSourceIds(
			sourceWorkflowIds,
			workflows,
			(workflow) => workflow.sourceWorkflowId,
		);

		for (const [sourceWorkflowId, candidates] of ambiguous) {
			const activeCandidates = candidates.filter((workflow) => !workflow.isArchived);
			if (activeCandidates.length === 1) {
				matches.set(sourceWorkflowId, activeCandidates[0]);
				continue;
			}

			// Keep a representative so the planner skips the conflicting import.
			matches.set(sourceWorkflowId, candidates[0]);
			lineageConflicts.push({
				sourceWorkflowId,
				projectId,
				existingWorkflows: candidates.map(({ id, name, isArchived }) => ({
					id,
					name,
					isArchived,
				})),
			});
		}

		return { matches, lineageConflicts };
	}
}
