import { ExecutionsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type {
	INode,
	IPinData,
	IWorkflowBase,
	WorkflowExecuteMode,
	WorkflowExecutionSource,
} from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import { getWorkflowActiveStatusFromWorkflowData } from '../execution.utils';

import { PreExecuteBlockedError } from '@/errors/pre-execute-blocked.error';
import { ExternalHooks } from '@/external-hooks';
import { NodeTypes } from '@/node-types';
import { WorkflowHookContextService } from '@/workflow-hook-context.service';

/**
 * Runs `workflow.preExecute` before an execution row is created and writes
 * hook mutations back onto `workflowData`. A throw means the run never
 * started — no row, no Insights/license count.
 *
 * No-ops when `N8N_PRE_EXECUTE_ERROR_CREATES_EXECUTION` is true; the lifecycle
 * hook then runs after persist (legacy).
 */
@Service()
export class WorkflowPreExecute {
	constructor(
		private readonly externalHooks: ExternalHooks,
		private readonly workflowContext: WorkflowHookContextService,
		private readonly nodeTypes: NodeTypes,
		private readonly executionsConfig: ExecutionsConfig,
	) {}

	async run(
		workflowData: IWorkflowBase,
		mode: WorkflowExecuteMode,
		source?: WorkflowExecutionSource,
		pinData?: IPinData,
	): Promise<Workflow | undefined> {
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
			pinData,
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

		this.writeHookMutations(workflowData, workflow);
		return workflow;
	}

	private writeHookMutations(workflowData: IWorkflowBase, workflow: Workflow) {
		workflowData.staticData = workflow.staticData;
		workflowData.settings = workflow.settings;
		workflowData.connections = workflow.connectionsBySourceNode;
		if (workflow.name !== undefined) {
			workflowData.name = workflow.name;
		}
		if (workflow.pinData !== undefined) {
			workflowData.pinData = workflow.pinData;
		}
		workflowData.nodes = this.nodesFromWorkflow(workflow, workflowData.nodes ?? []);
	}

	private nodesFromWorkflow(workflow: Workflow, originalNodes: INode[]): INode[] {
		const seen = new Set<string>();
		const nodes: INode[] = [];

		for (const node of originalNodes) {
			const current = workflow.nodes[node.name];
			if (current === undefined) continue;
			nodes.push(current);
			seen.add(node.name);
		}

		for (const [name, node] of Object.entries(workflow.nodes)) {
			if (seen.has(name)) continue;
			nodes.push(node);
		}

		return nodes;
	}
}
