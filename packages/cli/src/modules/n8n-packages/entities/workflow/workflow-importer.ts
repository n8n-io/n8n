import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { decideWorkflowConflictAction } from './workflow-conflict-policy';
import { decideWorkflowId } from './workflow-id-policy';
import {
	WorkflowImportMatchService,
	type WorkflowIdConflict,
} from './workflow-import-match.service';
import type {
	PreparedWorkflow,
	WorkflowConflict,
	WorkflowImportContext,
	WorkflowImportOutcome,
	WorkflowImportPlan,
	WorkflowPlanItem,
	WorkflowPlannedAction,
} from './workflow-import.types';
import type {
	ImportWorkflowProperties,
	PackageImportBindings,
	WorkflowIdPolicy,
} from '../../n8n-packages.types';

export interface WorkflowImportResult {
	outcomes: WorkflowImportOutcome[];
	bindings: PackageImportBindings;
}

/**
 * Imports a batch of prepared workflows in two phases:
 * {@link plan} matches each workflow against the destination project and decides what action create/update/skip
 * {@link apply} writes that plan into n8n
 */
@Service()
export class WorkflowImporter {
	constructor(
		private readonly workflowImportMatchService: WorkflowImportMatchService,
		private readonly workflowCreationService: WorkflowCreationService,
		private readonly workflowService: WorkflowService,
	) {}

	async plan(
		context: WorkflowImportContext,
		prepared: PreparedWorkflow[],
		options: ImportWorkflowProperties,
	): Promise<WorkflowImportPlan> {
		const existingBySourceWorkflowId =
			await this.workflowImportMatchService.findBySourceWorkflowIds(
				context.projectId,
				prepared.map(({ sourceWorkflowId }) => sourceWorkflowId),
			);

		const items: WorkflowPlanItem[] = [];
		const conflicts: WorkflowConflict[] = [];
		// `source`-policy ids that would be freshly created — candidates for a
		// global id collision check below. Blocked creates are excluded: they
		// already report a workflow-conflict for the same workflow.
		const sourceCreateIds: string[] = [];

		for (const workflow of prepared) {
			const existing = existingBySourceWorkflowId.get(workflow.sourceWorkflowId) ?? null;
			const { action, blocked } = decideWorkflowConflictAction(
				options.workflowConflictPolicy,
				existing,
			);

			const item = toPlanItem(workflow, existing, action, options.workflowIdPolicy);
			items.push(item);

			if (item.action === 'create' && options.workflowIdPolicy === 'source' && !blocked) {
				sourceCreateIds.push(item.decidedId);
			}

			if (blocked && existing) {
				conflicts.push({
					sourceWorkflowId: workflow.sourceWorkflowId,
					existingWorkflowId: existing.id,
					name: existing.name,
				});
			}
		}

		const idConflicts = await this.collectIdConflicts(sourceCreateIds);

		return { items, conflicts, idConflicts };
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

	async apply(
		plan: WorkflowImportPlan,
		context: WorkflowImportContext,
		bindings: PackageImportBindings,
	): Promise<WorkflowImportResult> {
		const workflowBindings = new Map(bindings.workflows);
		const outcomes: WorkflowImportOutcome[] = [];

		for (const item of plan.items) {
			const outcome = await this.applyItem(item, context);
			outcomes.push(outcome);
			// Works for every status: created/updated/skipped all resolve to a real target id.
			workflowBindings.set(outcome.sourceWorkflowId, outcome.workflow.id);
		}

		return { outcomes, bindings: { ...bindings, workflows: workflowBindings } };
	}

	private async applyItem(
		item: WorkflowPlanItem,
		context: WorkflowImportContext,
	): Promise<WorkflowImportOutcome> {
		switch (item.action) {
			case 'create': {
				item.entity.id = item.decidedId;
				const workflow = await this.workflowCreationService.createWorkflow(
					context.user,
					item.entity,
					{
						projectId: context.projectId,
						parentFolderId: context.folderId ?? undefined,
						publicApi: true,
						source: 'import',
						sourceWorkflowId: item.sourceWorkflowId,
					},
				);
				return { status: 'created', workflow, sourceWorkflowId: item.sourceWorkflowId };
			}

			case 'update': {
				const workflow = await this.workflowService.update(
					context.user,
					item.entity,
					item.existing.id,
					{ publicApi: true, publishIfActive: true, source: 'import' },
				);
				// update() doesn't re-hydrate parentFolder; carry over the existing folder for the result.
				workflow.parentFolder = item.existing.parentFolder;
				return { status: 'updated', workflow, sourceWorkflowId: item.sourceWorkflowId };
			}

			case 'skip':
				return {
					status: 'skipped',
					workflow: item.existing,
					sourceWorkflowId: item.sourceWorkflowId,
				};
		}
	}
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
		case 'update':
			return { action, ...prepared, existing };
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
