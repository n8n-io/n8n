import { WorkflowEntity } from '@n8n/db';
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
	PersistedWorkflowPlanItem,
	PreparedWorkflow,
	WorkflowConflict,
	WorkflowFolderConflict,
	WorkflowImportContext,
	WorkflowImportOutcome,
	WorkflowImportPlan,
	WorkflowPlanItem,
	WorkflowPlannedAction,
} from './workflow-import.types';
import { WorkflowPublisher } from './workflow-publisher';
import type {
	ImportContext,
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
		context: ImportContext,
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
		const folderConflicts: WorkflowFolderConflict[] = [];
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

			if (context.folderId && existing) {
				const existingParentFolderId = existing.parentFolder?.id ?? null;
				if (existingParentFolderId !== context.folderId) {
					folderConflicts.push({
						sourceWorkflowId: workflow.sourceWorkflowId,
						existingWorkflowId: existing.id,
						existingParentFolderId,
						targetFolderId: context.folderId,
						name: existing.name,
					});
				}
			}
		}

		const idConflicts = await this.collectIdConflicts(sourceCreateIds);

		return { items, conflicts, idConflicts, folderConflicts };
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
		context: WorkflowImportContext,
		plan: WorkflowImportPlan,
		bindings: PackageImportBindings,
	): Promise<WorkflowImportResult> {
		const workflowBindings = new Map(bindings.workflows);
		const outcomes: WorkflowImportOutcome[] = [];

		for (const item of plan.items) {
			const outcome = await this.applyItem(context, item, bindings);
			outcomes.push(outcome);
			// Works for every status: created/updated/skipped all resolve to a real target id.
			workflowBindings.set(outcome.sourceWorkflowId, outcome.workflow.id);
		}

		return { outcomes, bindings: { ...bindings, workflows: workflowBindings } };
	}

	private async applyItem(
		context: WorkflowImportContext,
		item: WorkflowPlanItem,
		bindings: PackageImportBindings,
	): Promise<WorkflowImportOutcome> {
		if (item.action === 'skip') {
			return {
				status: 'skipped',
				workflow: item.existing,
				sourceWorkflowId: item.sourceWorkflowId,
				publishing: { state: 'unchanged' },
			};
		}

		const savedWorkflow = await this.persistWorkflow(context, item, bindings);
		const { workflow, publishing } = await this.workflowPublisher.apply(
			context.user,
			item,
			savedWorkflow,
			context.publishingPolicy,
			context.publishBlockedSourceWorkflowIds,
		);

		// Publish reloads the workflow without parentFolder; restore it for the import summary.
		workflow.parentFolder =
			workflow.parentFolder ??
			savedWorkflow.parentFolder ??
			(item.action === 'update' ? item.existing.parentFolder : null) ??
			null;

		return {
			status: item.action === 'create' ? 'created' : 'updated',
			workflow,
			sourceWorkflowId: item.sourceWorkflowId,
			publishing,
		};
	}

	private async persistWorkflow(
		context: WorkflowImportContext,
		item: PersistedWorkflowPlanItem,
		bindings: PackageImportBindings,
	): Promise<WorkflowEntity> {
		if (item.action === 'create') {
			const entity = prepareEntityForPersist(item.entity, bindings, item.decidedId);
			return await this.workflowCreationService.createWorkflow(context.user, entity, {
				projectId: context.projectId,
				parentFolderId: context.folderId ?? undefined,
				publicApi: true,
				source: 'import',
				sourceWorkflowId: item.sourceWorkflowId,
			});
		}

		const entity = prepareEntityForPersist(item.entity, bindings);
		return await this.workflowService.update(context.user, entity, item.existing.id, {
			publicApi: true,
			source: 'import',
		});
	}
}

/** Clones package content for persistence without mutating the import plan. */
function prepareEntityForPersist(
	source: WorkflowEntity,
	bindings: PackageImportBindings,
	decidedId?: string,
): WorkflowEntity {
	const entity = Object.assign(new WorkflowEntity(), source, {
		nodes: structuredClone(source.nodes),
		...(decidedId !== undefined ? { id: decidedId } : {}),
	});
	applyCredentialBindingsInPlace(entity, bindings.credentials);
	return entity;
}

/** Mutates node credential ids on `entity` using the resolved import binding map. */
function applyCredentialBindingsInPlace(
	entity: WorkflowEntity,
	credentialBindings: PackageImportBindings['credentials'],
): void {
	for (const node of entity.nodes) {
		for (const details of Object.values(node.credentials ?? {})) {
			if (!details.id) continue;

			const targetId = credentialBindings.get(details.id);
			if (targetId) {
				details.id = targetId;
			}
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
