import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IDataObject, IWorkflowBase } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { ExecutionMetadataService } from '@/services/execution-metadata.service';
import { resolveWorkflowStart } from '@/utils';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';
import { WorkflowInputSchemaService } from '@/workflows/workflow-input-schema.service';

/** Marks an execution as belonging to a person's catalog run rather than the workflow's own. */
export const CATALOG_RUN_USER_KEY = 'catalogRunUserId';

@Service()
export class CatalogRunService {
	constructor(
		private readonly workflowExecutionService: WorkflowExecutionService,
		private readonly workflowInputSchemaService: WorkflowInputSchemaService,
		private readonly executionMetadataService: ExecutionMetadataService,
	) {}

	/**
	 * Runs a workflow for a person who is present, from the trigger it declares
	 * its input contract on.
	 *
	 * Deliberately a production run, not a manual one. A manual run would let a
	 * workflow-level "don't save manual executions" setting silently erase the
	 * person's history, and would feed them the builder's pinned test data
	 * instead of a real result.
	 */
	async run(
		workflowData: IWorkflowBase,
		user: User,
		inputs: IDataObject = {},
	): Promise<{ executionId: string }> {
		const schema = await this.workflowInputSchemaService.describe(workflowData);

		if (!schema.eligible) {
			throw new UserError('This workflow cannot be run directly', {
				extra: { workflowId: workflowData.id, reason: schema.reason },
			});
		}

		const startNode = resolveWorkflowStart(workflowData.nodes.filter((node) => !node.disabled));

		if (!startNode) {
			// describe() already vetted this; a miss here means the two disagree.
			throw new UserError('This workflow has no node to start from', {
				extra: { workflowId: workflowData.id },
			});
		}

		const declared = new Set(schema.fields.map((field) => field.name));
		const json = Object.fromEntries(Object.entries(inputs).filter(([name]) => declared.has(name)));

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			userId: user.id,
			workflowId: workflowData.id,
			workflowSettings: workflowData.settings,
		});

		const executionId = await this.workflowExecutionService.runWorkflow(
			workflowData,
			startNode,
			[[{ json }]],
			additionalData,
			'trigger',
		);

		// Attribution rides on metadata rather than a column, so "my runs" is a
		// filter over existing execution storage.
		await this.executionMetadataService.save(executionId, {
			[CATALOG_RUN_USER_KEY]: user.id,
		});

		return { executionId };
	}
}
