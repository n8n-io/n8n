import {
	type IExecuteFunctions,
	type Workflow,
	type IRunExecutionData,
	type INodeExecutionData,
	type ITaskDataConnections,
	type INode,
	type WorkflowParameters,
	type INodeParameters,
	type WorkflowExecuteMode,
	type IExecuteData,
	type IDataObject,
	type IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { nanoid } from 'nanoid';

import { TaskError } from '@/runners/errors';

import {
	RPC_ALLOW_LIST,
	type TaskResultData,
	type N8nMessage,
	type RequesterMessage,
} from '../runner-types';

export type RequestAccept = (jobId: string) => void;
export type RequestReject = (reason: string) => void;

export type TaskAccept = (data: TaskResultData) => void;
export type TaskReject = (error: unknown) => void;

export interface TaskData {
	executeFunctions: IExecuteFunctions;
	inputData: ITaskDataConnections;
	node: INode;

	workflow: Workflow;
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
	additionalData: IWorkflowExecuteAdditionalData;
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

export interface TaskRequest {
	requestId: string;
	taskType: string;
	settings: unknown;
	data: TaskData;
}

export interface Task {
	taskId: string;
	settings: unknown;
	data: TaskData;
}

interface ExecuteFunctionObject {
	[name: string]: ((...args: unknown[]) => unknown) | ExecuteFunctionObject;
}

const workflowToParameters = (workflow: Workflow): Omit<WorkflowParameters, 'nodeTypes'> => {
	return {
		id: workflow.id,
		name: workflow.name,
		active: workflow.active,
		connections: workflow.connectionsBySourceNode,
		nodes: Object.values(workflow.nodes),
		pinData: workflow.pinData,
		settings: workflow.settings,
		staticData: workflow.staticData,
	};
};

export class TaskManager {
	requestAcceptRejects: Map<string, { accept: RequestAccept; reject: RequestReject }> = new Map();

	taskAcceptRejects: Map<string, { accept: TaskAccept; reject: TaskReject }> = new Map();

	pendingRequests: Map<string, TaskRequest> = new Map();

	tasks: Map<string, Task> = new Map();

	async startTask<T>(
		additionalData: IWorkflowExecuteAdditionalData,
		taskType: string,
		settings: unknown,
		executeFunctions: IExecuteFunctions,
		inputData: ITaskDataConnections,
		node: INode,
		workflow: Workflow,
		runExecutionData: IRunExecutionData,
		runIndex: number,
		itemIndex: number,
		activeNodeName: string,
		connectionInputData: INodeExecutionData[],
		siblingParameters: INodeParameters,
		mode: WorkflowExecuteMode,
		executeData?: IExecuteData,
		defaultReturnRunIndex = -1,
		selfData: IDataObject = {},
		contextNodeName: string = activeNodeName,
	): Promise<T> {
		const data: TaskData = {
			workflow,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			node,
			executeFunctions,
			itemIndex,
			siblingParameters,
			mode,
			executeData,
			defaultReturnRunIndex,
			selfData,
			contextNodeName,
			activeNodeName,
			additionalData,
		};

		const request: TaskRequest = {
			requestId: nanoid(),
			taskType,
			settings,
			data,
		};

		this.pendingRequests.set(request.requestId, request);

		const taskIdPromise = new Promise<string>((resolve, reject) => {
			this.requestAcceptRejects.set(request.requestId, {
				accept: resolve,
				reject,
			});
		});

		this.sendMessage({
			type: 'requester:taskrequest',
			requestId: request.requestId,
			taskType,
		});

		const taskId = await taskIdPromise;

		const task: Task = {
			taskId,
			data,
			settings,
		};
		this.tasks.set(task.taskId, task);

		try {
			const dataPromise = new Promise<TaskResultData>((resolve, reject) => {
				this.taskAcceptRejects.set(task.taskId, {
					accept: resolve,
					reject,
				});
			});

			this.sendMessage({
				type: 'requester:tasksettings',
				taskId,
				settings,
			});

			const resultData = await dataPromise;
			// Set custom execution data (`$execution.customData`) if sent
			if (resultData.customData) {
				Object.entries(resultData.customData).forEach(([k, v]) => {
					if (!runExecutionData.resultData.metadata) {
						runExecutionData.resultData.metadata = {};
					}
					runExecutionData.resultData.metadata[k] = v;
				});
			}
			return resultData.result as T;
		} catch (e) {
			if (typeof e === 'string') {
				throw new TaskError(e, {
					level: 'error',
				});
			}
			throw e;
		} finally {
			this.tasks.delete(taskId);
		}
	}

	sendMessage(_message: RequesterMessage.ToN8n.All) {}

	onMessage(message: N8nMessage.ToRequester.All) {
		switch (message.type) {
			case 'broker:taskready':
				this.taskReady(message.requestId, message.taskId);
				break;
			case 'broker:taskdone':
				this.taskDone(message.taskId, message.data);
				break;
			case 'broker:taskerror':
				this.taskError(message.taskId, message.error);
				break;
			case 'broker:taskdatarequest':
				this.sendTaskData(message.taskId, message.requestId, message.requestType);
				break;
			case 'broker:rpc':
				void this.handleRpc(message.taskId, message.callId, message.name, message.params);
				break;
		}
	}

	taskReady(requestId: string, taskId: string) {
		const acceptReject = this.requestAcceptRejects.get(requestId);
		if (!acceptReject) {
			this.rejectTask(
				taskId,
				'Request ID not found. In multi-main setup, it is possible for one of the mains to have reported ready state already.',
			);
			return;
		}

		acceptReject.accept(taskId);
		this.requestAcceptRejects.delete(requestId);
	}

	rejectTask(jobId: string, reason: string) {
		this.sendMessage({
			type: 'requester:taskcancel',
			taskId: jobId,
			reason,
		});
	}

	taskDone(taskId: string, data: TaskResultData) {
		const acceptReject = this.taskAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.accept(data);
			this.taskAcceptRejects.delete(taskId);
		}
	}

	taskError(taskId: string, error: unknown) {
		const acceptReject = this.taskAcceptRejects.get(taskId);
		if (acceptReject) {
			acceptReject.reject(error);
			this.taskAcceptRejects.delete(taskId);
		}
	}

	sendTaskData(
		taskId: string,
		requestId: string,
		requestType: N8nMessage.ToRequester.TaskDataRequest['requestType'],
	) {
		const job = this.tasks.get(taskId);
		if (!job) {
			// TODO: logging
			return;
		}
		if (requestType === 'all') {
			const jd = job.data;
			const ad = jd.additionalData;
			const data: AllCodeTaskData = {
				workflow: workflowToParameters(jd.workflow),
				connectionInputData: jd.connectionInputData,
				inputData: jd.inputData,
				itemIndex: jd.itemIndex,
				activeNodeName: jd.activeNodeName,
				contextNodeName: jd.contextNodeName,
				defaultReturnRunIndex: jd.defaultReturnRunIndex,
				mode: jd.mode,
				node: jd.node,
				runExecutionData: jd.runExecutionData,
				runIndex: jd.runIndex,
				selfData: jd.selfData,
				siblingParameters: jd.siblingParameters,
				executeData: jd.executeData,
				additionalData: {
					formWaitingBaseUrl: ad.formWaitingBaseUrl,
					instanceBaseUrl: ad.instanceBaseUrl,
					restApiUrl: ad.restApiUrl,
					variables: ad.variables,
					webhookBaseUrl: ad.webhookBaseUrl,
					webhookTestBaseUrl: ad.webhookTestBaseUrl,
					webhookWaitingBaseUrl: ad.webhookWaitingBaseUrl,
					currentNodeParameters: ad.currentNodeParameters,
					executionId: ad.executionId,
					executionTimeoutTimestamp: ad.executionTimeoutTimestamp,
					restartExecutionId: ad.restartExecutionId,
					userId: ad.userId,
				},
			};
			this.sendMessage({
				type: 'requester:taskdataresponse',
				taskId,
				requestId,
				data,
			});
		}
	}

	async handleRpc(
		taskId: string,
		callId: string,
		name: N8nMessage.ToRequester.RPC['name'],
		params: unknown[],
	) {
		const job = this.tasks.get(taskId);
		if (!job) {
			// TODO: logging
			return;
		}

		try {
			if (!RPC_ALLOW_LIST.includes(name)) {
				this.sendMessage({
					type: 'requester:rpcresponse',
					taskId,
					callId,
					status: 'error',
					data: 'Method not allowed',
				});
				return;
			}
			const splitPath = name.split('.');

			const funcs = job.data.executeFunctions;

			let func: ((...args: unknown[]) => Promise<unknown>) | undefined = undefined;
			let funcObj: ExecuteFunctionObject[string] | undefined =
				funcs as unknown as ExecuteFunctionObject;
			for (const part of splitPath) {
				funcObj = (funcObj as ExecuteFunctionObject)[part] ?? undefined;
				if (!funcObj) {
					break;
				}
			}
			func = funcObj as unknown as (...args: unknown[]) => Promise<unknown>;
			if (!func) {
				this.sendMessage({
					type: 'requester:rpcresponse',
					taskId,
					callId,
					status: 'error',
					data: 'Could not find method',
				});
				return;
			}
			const data = (await func.call(funcs, ...params)) as unknown;

			this.sendMessage({
				type: 'requester:rpcresponse',
				taskId,
				callId,
				status: 'success',
				data,
			});
		} catch (e) {
			this.sendMessage({
				type: 'requester:rpcresponse',
				taskId,
				callId,
				status: 'error',
				data: e,
			});
		}
	}
}
