import { ExecutionsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { IWorkflowBase, WorkflowExecuteMode, WorkflowExecutionSource } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import { getWorkflowActiveStatusFromWorkflowData } from '../execution.utils';

import { PreExecuteBlockedError } from '@/errors/pre-execute-blocked.error';
import { ExternalHooks } from '@/external-hooks';
import { NodeTypes } from '@/node-types';
import { WorkflowHookContextService } from '@/workflow-hook-context.service';

/**
 * Runs `workflow.preExecute` before an execution row is created.
 * A throw here means the run never started — no row, no Insights/license count.
 *
 * No-ops when `N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION` is true; the lifecycle
 * hook then runs after persist (legacy).
 */
@Service()
export class WorkflowPreExecuteGate {
	constructor(
		private readonly externalHooks: ExternalHooks,
		private readonly workflowContext: WorkflowHookContextService,
		private readonly nodeTypes: NodeTypes,
		private readonly executionsConfig: ExecutionsConfig,
	) {}

	async assertCanStart(
		workflowData: IWorkflowBase,
		mode: WorkflowExecuteMode,
		source?: WorkflowExecutionSource,
	): Promise<void> {
		if (this.executionsConfig.preExecuteErrorCreatesExecution) {
			return;
		}

		if (!this.externalHooks.hasHook('workflow.preExecute')) {
			return;
		}

		const workflow = new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes ?? [],
			connections: workflowData.connections ?? {},
			active: getWorkflowActiveStatusFromWorkflowData(workflowData),
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings ?? {},
		});

		try {
			await this.externalHooks.run('workflow.preExecute', [
				workflow,
				mode,
				this.workflowContext,
				source,
			]);
		} catch (error) {
			throw new PreExecuteBlockedError(ensureError(error));
		}
	}
}
