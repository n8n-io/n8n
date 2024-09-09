/* eslint-disable @typescript-eslint/no-unsafe-member-access */ // @TODO: Remove later
/* eslint-disable @typescript-eslint/no-unsafe-assignment */ // @TODO: Remove later
import {
	type IExecuteFunctions,
	type Workflow,
	type IRunExecutionData,
	type INodeExecutionData,
	type ITaskDataConnections,
	type INode,
	ApplicationError,
	type WorkflowParameters,
	type INodeParameters,
	type WorkflowExecuteMode,
	type IExecuteData,
	type IDataObject,
} from 'n8n-workflow';

import { RPC_ALLOW_LIST, type N8nMessage, type RequesterMessage } from '../runner-types';
import { nanoid } from 'nanoid';

export type RequestAccept = (jobId: string) => void;
export type RequestReject = (reason: string) => void;

export type TaskAccept = (data: unknown) => void;
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
}

export interface AllData {
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

export class JobError extends ApplicationError {}

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
	requestAcceptRejects: Record<string, { accept: RequestAccept; reject: RequestReject }> = {};

	taskAcceptRejects: Record<string, { accept: TaskAccept; reject: TaskReject }> = {};

	pendingRequests: Record<string, TaskRequest> = {};

	tasks: Record<string, Task> = {};

	async startTask<T>(
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
		};

		const request: TaskRequest = {
			requestId: nanoid(),
			taskType,
			settings,
			data,
		};

		this.pendingRequests[request.requestId] = request;

		const taskIdPromise = new Promise<string>((resolve, reject) => {
			this.requestAcceptRejects[request.requestId] = {
				accept: resolve,
				reject,
			};
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
		this.tasks[task.taskId] = task;

		try {
			const dataPromise = new Promise<unknown>((resolve, reject) => {
				this.taskAcceptRejects[task.taskId] = {
					accept: resolve,
					reject,
				};
			});

			this.sendMessage({
				type: 'requester:tasksettings',
				taskId,
				settings,
			});

			return (await dataPromise) as T;
		} catch (e) {
			if (typeof e === 'string') {
				throw new JobError(e, {
					level: 'error',
				});
			}
			throw e;
		} finally {
			delete this.tasks[taskId];
		}
	}

	sendMessage(_message: RequesterMessage.ToN8n.All) {}

	onMessage(message: N8nMessage.ToRequester.All) {
		console.log({ message });
		switch (message.type) {
			case 'broker:taskready':
				this.jobReady(message.requestId, message.taskId);
				break;
			case 'broker:taskdone':
				this.jobDone(message.taskId, message.data);
				break;
			case 'broker:taskerror':
				this.jobError(message.taskId, message.error);
				break;
			case 'broker:taskdatarequest':
				this.sendJobData(message.taskId, message.requestId, message.requestType);
				break;
			case 'broker:rpc':
				void this.handleRpc(message.taskId, message.callId, message.name, message.params);
				break;
		}
	}

	jobReady(requestId: string, jobId: string) {
		if (!(requestId in this.requestAcceptRejects)) {
			this.rejectJob(
				jobId,
				'Request ID not found. In multi-main setup, it is possible for one of the mains to have reported ready state already.',
			);
			return;
		}

		this.requestAcceptRejects[requestId].accept(jobId);
		delete this.requestAcceptRejects[requestId];
	}

	rejectJob(jobId: string, reason: string) {
		this.sendMessage({
			type: 'requester:taskcancel',
			taskId: jobId,
			reason,
		});
	}

	jobDone(jobId: string, data: unknown) {
		if (jobId in this.taskAcceptRejects) {
			this.taskAcceptRejects[jobId].accept(data);
			delete this.taskAcceptRejects[jobId];
		}
	}

	jobError(jobId: string, error: unknown) {
		if (jobId in this.taskAcceptRejects) {
			this.taskAcceptRejects[jobId].reject(error);
			delete this.taskAcceptRejects[jobId];
		}
	}

	sendJobData(
		jobId: string,
		requestId: string,
		requestType: N8nMessage.ToRequester.TaskDataRequest['requestType'],
	) {
		const job = this.tasks[jobId];
		if (!job) {
			// TODO: logging
			return;
		}
		if (requestType === 'all') {
			const jd = job.data;
			const data: AllData = {
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
			};
			// TODO remove
			// eslint-disable-next-line
			delete (data as any)['executeFunctions'];
			this.sendMessage({
				type: 'requester:taskdataresponse',
				taskId: jobId,
				requestId,
				data,
			});
		}
	}

	async handleRpc(
		jobId: string,
		callId: string,
		name: N8nMessage.ToRequester.RPC['name'],
		params: unknown[],
	) {
		const job = this.tasks[jobId];
		if (!job) {
			// TODO: logging
			return;
		}

		try {
			if (!RPC_ALLOW_LIST.includes(name)) {
				this.sendMessage({
					type: 'requester:rpcresponse',
					taskId: jobId,
					callId,
					status: 'error',
					data: 'Method not allowed',
				});
				return;
			}
			const splitPath = name.split('.');

			const funcs = job.data.executeFunctions;

			let func: ((...args: unknown[]) => Promise<unknown>) | undefined = undefined;
			let funcObj: any = funcs;
			for (const part of splitPath) {
				funcObj = funcObj[part] ?? undefined;
				if (!funcObj) {
					break;
				}
			}
			func = funcObj;
			if (!func) {
				this.sendMessage({
					type: 'requester:rpcresponse',
					taskId: jobId,
					callId,
					status: 'error',
					data: 'Could not find method',
				});
				return;
			}
			const data = await func.call(funcs, ...params);

			this.sendMessage({
				type: 'requester:rpcresponse',
				taskId: jobId,
				callId,
				status: 'success',
				data,
			});
		} catch (e) {
			this.sendMessage({
				type: 'requester:rpcresponse',
				taskId: jobId,
				callId,
				status: 'error',
				data: e,
			});
		}
	}
}
