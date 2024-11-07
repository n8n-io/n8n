import { TaskRunnersConfig } from '@n8n/config';
import type { TaskResultData, RequesterMessage, BrokerMessage, TaskData } from '@n8n/task-runner';
import { DataRequestResponseReconstruct, RPC_ALLOW_LIST } from '@n8n/task-runner';
import type {
	EnvProviderState,
	IExecuteFunctions,
	Workflow,
	IRunExecutionData,
	INodeExecutionData,
	ITaskDataConnections,
	INode,
	INodeParameters,
	WorkflowExecuteMode,
	IExecuteData,
	IDataObject,
	IWorkflowExecuteAdditionalData,
	Result,
} from 'n8n-workflow';
import { createResultOk, createResultError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import * as a from 'node:assert/strict';
import Container, { Service } from 'typedi';

import { NodeTypes } from '@/node-types';

import { DataRequestResponseBuilder } from './data-request-response-builder';
import { DataRequestResponseStripper } from './data-request-response-stripper';

export type RequestAccept = (jobId: string) => void;
export type RequestReject = (reason: string) => void;

export type TaskAccept = (data: TaskResultData) => void;
export type TaskReject = (error: unknown) => void;

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

@Service()
export abstract class TaskManager {
	requestAcceptRejects: Map<string, { accept: RequestAccept; reject: RequestReject }> = new Map();

	taskAcceptRejects: Map<string, { accept: TaskAccept; reject: TaskReject }> = new Map();

	pendingRequests: Map<string, TaskRequest> = new Map();

	tasks: Map<string, Task> = new Map();

	private readonly runnerConfig = Container.get(TaskRunnersConfig);

	private readonly dataResponseBuilder = new DataRequestResponseBuilder();

	constructor(private readonly nodeTypes: NodeTypes) {}

	async startTask<TData, TError>(
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
		envProviderState: EnvProviderState,
		executeData?: IExecuteData,
		defaultReturnRunIndex = -1,
		selfData: IDataObject = {},
		contextNodeName: string = activeNodeName,
	): Promise<Result<TData, TError>> {
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
			envProviderState,
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

			return createResultOk(resultData.result as TData);
		} catch (e: unknown) {
			return createResultError(e as TError);
		} finally {
			this.tasks.delete(taskId);
		}
	}

	sendMessage(_message: RequesterMessage.ToBroker.All) {}

	onMessage(message: BrokerMessage.ToRequester.All) {
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
				this.sendTaskData(message.taskId, message.requestId, message.requestParams);
				break;
			case 'broker:nodetypesrequest':
				this.sendNodeTypes(message.taskId, message.requestId, message.requestParams);
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
		requestParams: BrokerMessage.ToRequester.TaskDataRequest['requestParams'],
	) {
		const job = this.tasks.get(taskId);
		if (!job) {
			// TODO: logging
			return;
		}

		const dataRequestResponse = this.dataResponseBuilder.buildFromTaskData(job.data);

		if (this.runnerConfig.assertDeduplicationOutput) {
			const reconstruct = new DataRequestResponseReconstruct();
			a.deepStrictEqual(
				reconstruct.reconstructConnectionInputData(dataRequestResponse.inputData),
				job.data.connectionInputData,
			);
			a.deepStrictEqual(
				reconstruct.reconstructExecuteData(dataRequestResponse),
				job.data.executeData,
			);
		}

		const strippedData = new DataRequestResponseStripper(
			dataRequestResponse,
			requestParams,
		).strip();

		this.sendMessage({
			type: 'requester:taskdataresponse',
			taskId,
			requestId,
			data: strippedData,
		});
	}

	sendNodeTypes(
		taskId: string,
		requestId: string,
		neededNodeTypes: BrokerMessage.ToRequester.NodeTypesRequest['requestParams'],
	) {
		const nodeTypes = this.nodeTypes.getNodeTypeDescriptions(neededNodeTypes);

		this.sendMessage({
			type: 'requester:nodetypesresponse',
			taskId,
			requestId,
			nodeTypes,
		});
	}

	async handleRpc(
		taskId: string,
		callId: string,
		name: BrokerMessage.ToRequester.RPC['name'],
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
