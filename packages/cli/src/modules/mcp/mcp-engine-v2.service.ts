import { ExecutionRedactionServiceProxy } from '@n8n/backend-services';
import type { IExecutionResponse, User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { IWorkflowBase, IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { EngineV2ExecutionReader } from '@/executions/engine-v2-execution-reader.service';
import {
	type EngineV2WaitOutcome,
	waitForEngineV2Execution,
} from '@/executions/engine-v2-execution-wait';
import { type ExecutionIdV2, isExecutionIdV2 } from '@/executions/execution-id';
import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';
import { WorkflowEngineDefaults } from '@/workflows/workflow-engine-defaults';

import type { EngineContext } from './tools/workflow-builder/engine-eligibility';

/**
 * What the MCP tools need to know about engine v2: whether the instance offers
 * it, whether a run of a workflow lands on it, and how to wait for and read a
 * run that did. Every method is inert when the engine-v2 module is off.
 */
@Service()
export class McpEngineV2Service {
	constructor(
		private readonly engineDefaults: WorkflowEngineDefaults,
		private readonly dataPlane: EngineDataPlaneProxyService,
		private readonly reader: EngineV2ExecutionReader,
		private readonly redaction: ExecutionRedactionServiceProxy,
	) {}

	/** `undefined` when the instance has no engine v2, so no tool mentions it. */
	context(): EngineContext | undefined {
		if (!this.engineDefaults.isEngineV2Available()) return undefined;
		return { v2Available: true, defaultEngineType: this.engineDefaults.defaultEngineType() };
	}

	/** Whether `WorkflowRunner.run` would hand this manual run to the data plane. */
	routesManualRunToV2(workflowData: IWorkflowBase): boolean {
		if (!this.engineDefaults.isEngineV2Available()) return false;
		// Resolved here, not in the constructor: the dispatcher carries the whole v2
		// start path, which only a server with the module on ever needs.
		return Container.get(EngineV2Dispatcher).handlesWorkflow(workflowData, 'manual');
	}

	/**
	 * The run data for a manual run on the data plane. v2 reads the trigger and
	 * its payload from `triggerToStartFrom` and `pinData`; the v1 shape with
	 * `startNodes` and a seeded execution stack reads to it as a run that starts
	 * at a pinned node, which it refuses.
	 */
	toManualRunData(
		base: Pick<
			IWorkflowExecutionDataProcess,
			'workflowData' | 'userId' | 'isMcpExecution' | 'mcpType' | 'mcpSessionId' | 'mcpMessageId'
		>,
		triggerName: string,
		pinData: IWorkflowExecutionDataProcess['pinData'],
	): IWorkflowExecutionDataProcess {
		return {
			...base,
			executionMode: 'manual',
			triggerToStartFrom: { name: triggerName },
			pinData,
		};
	}

	/** Waits until the data plane reports the run settled, or cancels it at the timeout. */
	async waitForSettled(executionId: string, timeoutMs: number): Promise<EngineV2WaitOutcome> {
		if (!isExecutionIdV2(executionId)) return { kind: 'missing' };
		return await waitForEngineV2Execution({
			dataPlane: this.dataPlane,
			executionId,
			timeoutMs,
		});
	}

	/**
	 * A v2 execution of `workflowId`, redacted for `viewer` the way the executions
	 * API redacts it, or `undefined` when the data plane has none under that id for
	 * that workflow. The caller must check the viewer's access to the workflow.
	 */
	async readExecution(
		executionId: ExecutionIdV2,
		workflowId: string,
		viewer: User,
	): Promise<IExecutionResponse | undefined> {
		const execution = await this.reader.findOne(executionId, [workflowId]);
		if (!execution) return undefined;
		await this.redaction.processExecution(execution, { user: viewer });
		return execution;
	}
}
