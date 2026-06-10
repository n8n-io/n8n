import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { decideWorkflowConflictAction } from './workflow-conflict-policy';
import { WorkflowImportMatchService } from './workflow-import-match.service';
import type {
	PersistedWorkflowPlanItem,
	PreparedWorkflow,
	WorkflowConflict,
	WorkflowImportContext,
	WorkflowImportOutcome,
	WorkflowImportPlan,
	WorkflowPlanItem,
	WorkflowPlannedAction,
} from './workflow-import.types';
import { WorkflowPublisher } from './workflow-publisher';
import type { PackageImportBindings, WorkflowConflictPolicy } from '../../n8n-packages.types';

export interface WorkflowImportResult {
	outcomes: WorkflowImportOutcome[];
	bindings: PackageImportBindings;
}

/**
 * Imports a batch of prepared workflows in two phases:
 * {@link plan} matches each workflow against the destination project and decides what action create/update/skip
 * {@link apply} writes that plan into n8n and publishes the workflows
 */
@Service()
export class WorkflowImporter {
	constructor(
		private readonly workflowImportMatchService: WorkflowImportMatchService,
		private readonly workflowCreationService: WorkflowCreationService,
		private readonly workflowService: WorkflowService,
		private readonly workflowPublisher: WorkflowPublisher,
	) {}

	async plan(
		prepared: PreparedWorkflow[],
		policy: WorkflowConflictPolicy,
		projectId: string,
	): Promise<WorkflowImportPlan> {
		const existingBySourceWorkflowId =
			await this.workflowImportMatchService.findBySourceWorkflowIds(
				projectId,
				prepared.map(({ sourceWorkflowId }) => sourceWorkflowId),
			);

		const items: WorkflowPlanItem[] = [];
		const conflicts: WorkflowConflict[] = [];

		for (const workflow of prepared) {
			const existing = existingBySourceWorkflowId.get(workflow.sourceWorkflowId) ?? null;
			const { action, blocked } = decideWorkflowConflictAction(policy, existing);

			items.push(toPlanItem(workflow, existing, action));

			if (blocked && existing) {
				conflicts.push({
					sourceWorkflowId: workflow.sourceWorkflowId,
					existingWorkflowId: existing.id,
					name: existing.name,
				});
			}
		}

		return { items, conflicts };
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
		if (item.action === 'skip') {
			return {
				status: 'skipped',
				workflow: item.existing,
				sourceWorkflowId: item.sourceWorkflowId,
			};
		}

		const savedWorkflow = await this.persistWorkflow(context, item);
		const workflow = await this.workflowPublisher.apply(
			context.user,
			item,
			savedWorkflow,
			context.publishingPolicy,
		);

		return {
			status: item.action === 'create' ? 'created' : 'updated',
			workflow,
			sourceWorkflowId: item.sourceWorkflowId,
		};
	}

	private async persistWorkflow(
		context: WorkflowImportContext,
		item: PersistedWorkflowPlanItem,
	): Promise<WorkflowEntity> {
		if (item.action === 'create') {
			return await this.workflowCreationService.createWorkflow(context.user, item.entity, {
				projectId: context.projectId,
				parentFolderId: context.folderId ?? undefined,
				publicApi: true,
				source: 'import',
				sourceWorkflowId: item.sourceWorkflowId,
			});
		}

		const workflow = await this.workflowService.update(
			context.user,
			item.entity,
			item.existing.id,
			{ publicApi: true, source: 'import' },
		);
		// update() doesn't re-hydrate parentFolder; carry over the existing folder for the result.
		workflow.parentFolder = item.existing.parentFolder;
		return workflow;
	}
}

function toPlanItem(
	prepared: PreparedWorkflow,
	existing: WorkflowEntity | null,
	action: WorkflowPlannedAction,
): WorkflowPlanItem {
	if (existing === null) {
		return { action: 'create', ...prepared };
	}

	switch (action) {
		case 'update':
			return { action, ...prepared, existing };
		case 'skip':
			return { action, ...prepared, existing };
		case 'create':
			// Only `fail` reaches here with a match; it records a conflict the gate rejects first.
			return { action, ...prepared };
	}
}
