/**
 * Stub for execution-related services
 * This consolidates ActiveExecutions, ExecutionService, WorkflowRunner, etc.
 * Will be replaced with actual implementation or API calls to execution service
 */

import { Service } from '@n8n/di';
import type {
	IWorkflowExecutionDataProcess,
	ExecutionStatus,
	IRun,
	IExecuteResponsePromiseData,
	IWorkflowExecuteAdditionalData,
	IDeferredPromise,
	INode,
	INodeExecutionData,
	Workflow,
} from 'n8n-workflow';

export interface IExecutionResponse {
	executionId: string;
	status: ExecutionStatus;
}

/**
 * Manages active (running) executions
 */
@Service()
export class ActiveExecutions {
	async add(_data: IWorkflowExecutionDataProcess, _executionId?: string): Promise<string> {
		throw new Error('ActiveExecutions not yet implemented in trigger-service');
	}

	async remove(_executionId: string, _fullRunData?: IRun): Promise<void> {
		throw new Error('ActiveExecutions not yet implemented in trigger-service');
	}

	get(_executionId: string): IWorkflowExecutionDataProcess | undefined {
		throw new Error('ActiveExecutions not yet implemented in trigger-service');
	}

	getAll(): IWorkflowExecutionDataProcess[] {
		return [];
	}

	async stopExecution(_executionId: string): Promise<IExecuteResponsePromiseData | undefined> {
		throw new Error('ActiveExecutions not yet implemented in trigger-service');
	}

	async shutdown(): Promise<void> {
		// no-op
	}

	getPostExecutePromise(_executionId: string): Promise<IRun | undefined> | undefined {
		return undefined;
	}
}

/**
 * Handles workflow execution operations
 */
@Service()
export class ExecutionService {
	async createErrorExecution(
		_error: Error,
		_node: unknown,
		_workflowData: unknown,
		_workflow: Workflow,
		_mode: string,
	): Promise<void> {
		throw new Error('ExecutionService not yet implemented in trigger-service');
	}

	async findOne(_executionId: string): Promise<unknown> {
		throw new Error('ExecutionService not yet implemented in trigger-service');
	}
}

/**
 * Executes workflows
 */
@Service()
export class WorkflowRunner {
	async run(
		_data: IWorkflowExecutionDataProcess,
		_loadStaticData?: boolean,
		_realtime?: boolean,
		_restartExecutionId?: string,
		_responsePromise?: unknown,
	): Promise<string> {
		throw new Error('WorkflowRunner not yet implemented in trigger-service');
	}

	async runSubprocess(_data: IWorkflowExecutionDataProcess): Promise<string> {
		throw new Error('WorkflowRunner not yet implemented in trigger-service');
	}
}

/**
 * Provides additional data for workflow execution
 */
export async function getBase(_options?: {
	userId?: string;
	workflowId?: string;
	projectId?: string;
}): Promise<IWorkflowExecuteAdditionalData> {
	throw new Error('WorkflowExecuteAdditionalData.getBase not yet implemented in trigger-service');
}

/**
 * Executes error workflows
 */
export async function executeErrorWorkflow(
	_workflowData: unknown,
	_errorData: unknown,
	_mode: string,
): Promise<void> {
	throw new Error('executeErrorWorkflow not yet implemented in trigger-service');
}

/**
 * Workflow execution service
 */
@Service()
export class WorkflowExecutionService {
	async getExecution(_executionId: string): Promise<unknown> {
		throw new Error('WorkflowExecutionService not yet implemented in trigger-service');
	}

	async runWorkflow(
		_workflowData: unknown,
		_node: INode,
		_data: INodeExecutionData[][],
		_additionalData: IWorkflowExecuteAdditionalData,
		_mode: string,
		_responsePromise: IDeferredPromise<IExecuteResponsePromiseData> | undefined,
	): Promise<string> {
		throw new Error('WorkflowExecutionService.runWorkflow not yet implemented in trigger-service');
	}
}

/**
 * Wait tracker for waiting executions
 */
@Service()
export class WaitTracker {
	async startExecution(_executionId: string): Promise<void> {
		throw new Error('WaitTracker not yet implemented in trigger-service');
	}

	async stopExecution(_executionId: string): Promise<void> {
		throw new Error('WaitTracker not yet implemented in trigger-service');
	}

	has(_executionId: string): boolean {
		return false;
	}
}

/**
 * Execution utilities
 */
export function isWorkflowIdValid(_workflowId: string | undefined): boolean {
	return !!_workflowId;
}

export function getWorkflowMetadata(_workflow: unknown): Record<string, unknown> {
	return {};
}

export function getWorkflowActiveStatusFromWorkflowData(_workflowData: unknown): boolean {
	return false;
}
