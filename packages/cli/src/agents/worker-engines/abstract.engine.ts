import {
	type IExecuteFunctions,
	type Workflow,
	type IRunExecutionData,
	type INodeExecutionData,
	type ITaskDataConnections,
	type INode,
	ApplicationError,
	type WorkflowParameters,
	INodeParameters,
	WorkflowExecuteMode,
	IExecuteData,
	IDataObject,
} from 'n8n-workflow';

import { RPC_ALLOW_LIST, type N8nMessage, type WorkerMessage } from '../agent-types';
import { nanoid } from 'nanoid';

export type EngineRequestAccept = (jobId: string) => void;
export type EngineRequestReject = (reason: string) => void;

export type EngineJobAccept = (data: unknown) => void;
export type EngineJobReject = (error: unknown) => void;

export interface EngineJobData {
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

export interface EngineJobRequest {
	requestId: string;
	jobType: string;
	settings: unknown;
	data: EngineJobData;
}

export interface EngineJob {
	jobId: string;
	settings: unknown;
	data: EngineJobData;
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

export class AbstractEngine {
	requestAcceptRejects: Record<
		string,
		{ accept: EngineRequestAccept; reject: EngineRequestReject }
	> = {};

	jobAcceptRejects: Record<string, { accept: EngineJobAccept; reject: EngineJobReject }> = {};

	pendingRequests: Record<string, EngineJobRequest> = {};

	jobs: Record<string, EngineJob> = {};

	async startJob<T>(
		jobType: string,
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
		const data: EngineJobData = {
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

		const request: EngineJobRequest = {
			requestId: nanoid(),
			jobType,
			settings,
			data,
		};

		this.pendingRequests[request.requestId] = request;

		const jobIdPromise = new Promise<string>((resolve, reject) => {
			this.requestAcceptRejects[request.requestId] = {
				accept: resolve,
				reject,
			};
		});

		this.sendMessage({
			type: 'worker:jobrequest',
			requestId: request.requestId,
			jobType,
		});

		const jobId = await jobIdPromise;

		const job: EngineJob = {
			jobId,
			data,
			settings,
		};
		this.jobs[job.jobId] = job;

		try {
			const dataPromise = new Promise<unknown>((resolve, reject) => {
				this.jobAcceptRejects[job.jobId] = {
					accept: resolve,
					reject,
				};
			});

			this.sendMessage({
				type: 'worker:jobsettings',
				jobId,
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
			delete this.jobs[jobId];
		}
	}

	sendMessage(_message: WorkerMessage.ToN8n.All) {}

	onMessage(message: N8nMessage.ToWorker.All) {
		console.log({ message });
		switch (message.type) {
			case 'n8n:jobready':
				this.jobReady(message.requestId, message.jobId);
				break;
			case 'n8n:jobdone':
				this.jobDone(message.jobId, message.data);
				break;
			case 'n8n:joberror':
				this.jobError(message.jobId, message.error);
				break;
			case 'n8n:jobdatarequest':
				this.sendJobData(message.jobId, message.requestId, message.requestType);
				break;
			case 'n8n:rpc':
				void this.handleRpc(message.jobId, message.callId, message.name, message.params);
				break;
		}
	}

	jobReady(requestId: string, jobId: string) {
		if (!(requestId in this.requestAcceptRejects)) {
			this.rejectJob(jobId, 'Request ID not found, request possibly already filled.');
			return;
		}

		this.requestAcceptRejects[requestId].accept(jobId);
		delete this.requestAcceptRejects[requestId];
	}

	rejectJob(jobId: string, reason: string) {
		this.sendMessage({
			type: 'worker:jobcancel',
			jobId,
			reason,
		});
	}

	jobDone(jobId: string, data: unknown) {
		if (jobId in this.jobAcceptRejects) {
			this.jobAcceptRejects[jobId].accept(data);
			delete this.jobAcceptRejects[jobId];
		}
	}

	jobError(jobId: string, error: unknown) {
		if (jobId in this.jobAcceptRejects) {
			this.jobAcceptRejects[jobId].reject(error);
			delete this.jobAcceptRejects[jobId];
		}
	}

	sendJobData(
		jobId: string,
		requestId: string,
		requestType: N8nMessage.ToWorker.JobDataRequest['requestType'],
	) {
		const job = this.jobs[jobId];
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
				type: 'worker:jobdataresponse',
				jobId,
				requestId,
				data,
			});
		}
	}

	async handleRpc(
		jobId: string,
		callId: string,
		name: N8nMessage.ToWorker.RPC['name'],
		params: unknown[],
	) {
		const job = this.jobs[jobId];
		if (!job) {
			// TODO: logging
			return;
		}

		try {
			if (!RPC_ALLOW_LIST.includes(name)) {
				this.sendMessage({
					type: 'worker:rpcresponse',
					jobId,
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
					type: 'worker:rpcresponse',
					jobId,
					callId,
					status: 'error',
					data: 'Could not find method',
				});
				return;
			}
			const data = await func.call(funcs, ...params);

			this.sendMessage({
				type: 'worker:rpcresponse',
				jobId,
				callId,
				status: 'success',
				data,
			});
		} catch (e) {
			this.sendMessage({
				type: 'worker:rpcresponse',
				jobId,
				callId,
				status: 'error',
				data: e,
			});
		}
	}
}
