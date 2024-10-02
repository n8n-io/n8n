import { getAdditionalKeys } from 'n8n-core';
import {
	type INode,
	type INodeType,
	type ITaskDataConnections,
	type IWorkflowExecuteAdditionalData,
	WorkflowDataProxy,
	type WorkflowParameters,
	type IDataObject,
	type IExecuteData,
	type INodeExecutionData,
	type INodeParameters,
	type IRunExecutionData,
	// type IWorkflowDataProxyAdditionalKeys,
	Workflow,
	type WorkflowExecuteMode,
} from 'n8n-workflow';
import * as a from 'node:assert';
import { runInNewContext, type Context } from 'node:vm';

import type { TaskResultData } from './runner-types';
import { type Task, TaskRunner } from './task-runner';

interface JSExecSettings {
	code: string;

	// For workflow data proxy
	mode: WorkflowExecuteMode;
}

export interface PartialAdditionalData {
	executionId?: string;
	restartExecutionId?: string;
	restApiUrl: string;
	instanceBaseUrl: string;
	formWaitingBaseUrl: string;
	webhookBaseUrl: string;
	webhookWaitingBaseUrl: string;
	webhookTestBaseUrl: string;
	currentNodeParameters?: INodeParameters;
	executionTimeoutTimestamp?: number;
	userId?: string;
	variables: IDataObject;
}

export interface AllCodeTaskData {
	workflow: Omit<WorkflowParameters, 'nodeTypes'>;
	inputData: ITaskDataConnections;
	node: INode;

	runExecutionData: IRunExecutionData;
	runIndex: number;
	itemIndex: number;
	activeNodeName: string;
	connectionInputData: INodeExecutionData[];
	siblingParameters: INodeParameters;
	mode: WorkflowExecuteMode;
	executeData?: IExecuteData;
	defaultReturnRunIndex: number;
	selfData: IDataObject;
	contextNodeName: string;
	additionalData: PartialAdditionalData;
}

export class JsTaskRunner extends TaskRunner {
	constructor(
		taskType: string,
		wsUrl: string,
		grantToken: string,
		maxConcurrency: number,
		name?: string,
	) {
		super(taskType, wsUrl, grantToken, maxConcurrency, name ?? 'JS Task Runner');
	}

	async executeTask(task: Task<JSExecSettings>): Promise<TaskResultData> {
		const allData = await this.requestData<AllCodeTaskData>(task.taskId, 'all');

		const settings = task.settings;
		a.ok(settings, 'JS Code not sent to runner');

		const workflowParams = allData.workflow;
		const workflow = new Workflow({
			...workflowParams,
			nodeTypes: {
				getByNameAndVersion() {
					return undefined as unknown as INodeType;
				},
				getByName() {
					return undefined as unknown as INodeType;
				},
				getKnownTypes() {
					return {};
				},
			},
		});

		const dataProxy = new WorkflowDataProxy(
			workflow,
			allData.runExecutionData,
			allData.runIndex,
			allData.itemIndex,
			allData.activeNodeName,
			allData.connectionInputData,
			allData.siblingParameters,
			settings.mode,
			getAdditionalKeys(
				allData.additionalData as IWorkflowExecuteAdditionalData,
				allData.mode,
				allData.runExecutionData,
			),
			allData.executeData,
			allData.defaultReturnRunIndex,
			allData.selfData,
			allData.contextNodeName,
		);

		const customConsole = {
			log: (...args: unknown[]) => {
				const logOutput = args
					.map((arg) => (typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : arg))
					.join(' ');
				console.log('[JS Code]', logOutput);
				void this.makeRpcCall(task.taskId, 'logNodeOutput', [logOutput]);
			},
		};

		const context: Context = {
			require,
			module: {},
			console: customConsole,

			...dataProxy.getDataProxy(),
			...this.buildRpcCallObject(task.taskId),
		};

		const result = (await runInNewContext(
			`module.exports = async function() {${settings.code}\n}()`,
			context,
		)) as TaskResultData['result'];

		return {
			result,
			customData: allData.runExecutionData.resultData.metadata,
		};
	}
}
