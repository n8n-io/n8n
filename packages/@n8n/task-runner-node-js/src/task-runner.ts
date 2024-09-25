import { URL } from 'node:url';
import { nanoid } from 'nanoid';
import { type MessageEvent, WebSocket } from 'ws';

import {
	RPC_ALLOW_LIST,
	type RunnerMessage,
	type N8nMessage,
	type TaskResultData,
} from './runner-types';

export interface Task<T = unknown> {
	taskId: string;
	settings?: T;
	active: boolean;
	cancelled: boolean;
}

export interface TaskOffer {
	offerId: string;
	validUntil: bigint;
}

interface DataRequest {
	requestId: string;
	resolve: (data: unknown) => void;
	reject: (error: unknown) => void;
}

interface RPCCall {
	callId: string;
	resolve: (data: unknown) => void;
	reject: (error: unknown) => void;
}

export interface RPCCallObject {
	[name: string]: ((...args: unknown[]) => Promise<unknown>) | RPCCallObject;
}

const VALID_TIME_MS = 1000;
const VALID_EXTRA_MS = 100;

export class TaskRunner {
	id: string;

	ws: WebSocket;

	canSendOffers = false;

	runningTasks: Record<Task['taskId'], Task> = {};

	offerInterval: NodeJS.Timeout | undefined;

	openOffers: Record<TaskOffer['offerId'], TaskOffer> = {};

	dataRequests: Record<DataRequest['requestId'], DataRequest> = {};

	rpcCalls: Record<RPCCall['callId'], RPCCall> = {};

	constructor(
		public taskType: string,
		wsUrl: string,
		grantToken: string,
		private maxConcurrency: number,
		public name?: string,
	) {
		this.id = nanoid();

		const url = new URL(wsUrl);
		url.searchParams.append('id', this.id);
		this.ws = new WebSocket(url.toString(), {
			headers: {
				authorization: `Bearer ${grantToken}`,
			},
		});
		console.log('1');
		this.ws.addEventListener('message', this._wsMessage);
		this.ws.addEventListener('close', this.stopTaskOffers);
	}

	private _wsMessage = (message: MessageEvent) => {
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse
		const data = JSON.parse(message.data as string) as N8nMessage.ToRunner.All;
		void this.onMessage(data);
	};

	private stopTaskOffers = () => {
		this.canSendOffers = false;
		if (this.offerInterval) {
			clearInterval(this.offerInterval);
			this.offerInterval = undefined;
		}
	};

	private startTaskOffers() {
		this.canSendOffers = true;
		if (this.offerInterval) {
			clearInterval(this.offerInterval);
		}
		this.offerInterval = setInterval(() => this.sendOffers(), 250);
	}

	deleteStaleOffers() {
		for (const key of Object.keys(this.openOffers)) {
			if (this.openOffers[key].validUntil < process.hrtime.bigint()) {
				delete this.openOffers[key];
			}
		}
	}

	sendOffers() {
		this.deleteStaleOffers();

		const offersToSend =
			this.maxConcurrency -
			(Object.values(this.openOffers).length + Object.values(this.runningTasks).length);

		if (offersToSend > 0) {
			for (let i = 0; i < offersToSend; i++) {
				const offer: TaskOffer = {
					offerId: nanoid(),
					validUntil:
						process.hrtime.bigint() + BigInt((VALID_TIME_MS + VALID_EXTRA_MS) * 1_000_000), // Adding a little extra time to account for latency
				};
				this.openOffers[offer.offerId] = offer;
				this.send({
					type: 'runner:taskoffer',
					taskType: this.taskType,
					offerId: offer.offerId,
					validFor: VALID_TIME_MS,
				});
			}
		}
	}

	send(message: RunnerMessage.ToN8n.All) {
		this.ws.send(JSON.stringify(message));
	}

	onMessage(message: N8nMessage.ToRunner.All) {
		console.log({ message });
		switch (message.type) {
			case 'broker:inforequest':
				this.send({
					type: 'runner:info',
					name: this.name ?? 'Node.js Task Runner SDK',
					types: [this.taskType],
				});
				break;
			case 'broker:runnerregistered':
				this.startTaskOffers();
				break;
			case 'broker:taskofferaccept':
				this.offerAccepted(message.offerId, message.taskId);
				break;
			case 'broker:taskcancel':
				this.taskCancelled(message.taskId);
				break;
			case 'broker:tasksettings':
				void this.receivedSettings(message.taskId, message.settings);
				break;
			case 'broker:taskdataresponse':
				this.processDataResponse(message.requestId, message.data);
				break;
			case 'broker:rpcresponse':
				this.handleRpcResponse(message.callId, message.status, message.data);
		}
	}

	processDataResponse(requestId: string, data: unknown) {
		const request = this.dataRequests[requestId];
		if (!request) {
			return;
		}
		delete this.dataRequests[requestId];
		request.resolve(data);
	}

	hasOpenTasks() {
		return Object.values(this.runningTasks).length < this.maxConcurrency;
	}

	offerAccepted(offerId: string, taskId: string) {
		if (!this.hasOpenTasks()) {
			this.send({
				type: 'runner:taskrejected',
				taskId,
				reason: 'No open task slots',
			});
			return;
		}
		const offer = this.openOffers[offerId];
		if (!offer) {
			if (!this.hasOpenTasks()) {
				this.send({
					type: 'runner:taskrejected',
					taskId,
					reason: 'Offer expired and no open task slots',
				});
				return;
			}
		} else {
			delete this.openOffers[offerId];
		}

		this.runningTasks[taskId] = {
			taskId,
			active: false,
			cancelled: false,
		};

		this.send({
			type: 'runner:taskaccepted',
			taskId,
		});
	}

	taskCancelled(taskId: string) {
		const task = this.runningTasks[taskId];
		if (!task) {
			return;
		}
		task.cancelled = true;
		if (task.active) {
			// TODO
		} else {
			delete this.runningTasks[taskId];
		}
		this.sendOffers();
	}

	taskErrored(taskId: string, error: unknown) {
		this.send({
			type: 'runner:taskerror',
			taskId,
			error,
		});
		delete this.runningTasks[taskId];
	}

	taskDone(taskId: string, data: RunnerMessage.ToN8n.TaskDone['data']) {
		this.send({
			type: 'runner:taskdone',
			taskId,
			data,
		});
		delete this.runningTasks[taskId];
	}

	async receivedSettings(taskId: string, settings: unknown) {
		const task = this.runningTasks[taskId];
		if (!task) {
			return;
		}
		if (task.cancelled) {
			delete this.runningTasks[taskId];
			return;
		}
		task.settings = settings;
		task.active = true;
		try {
			const data = await this.executeTask(task);
			this.taskDone(taskId, data);
		} catch (e) {
			if ('message' in (e as Error)) {
				this.taskErrored(taskId, (e as Error).message);
			} else {
				this.taskErrored(taskId, e);
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	async executeTask(_task: Task): Promise<TaskResultData> {
		throw new Error('Unimplemented');
	}

	async requestData<T = unknown>(
		taskId: Task['taskId'],
		type: RunnerMessage.ToN8n.TaskDataRequest['requestType'],
		param?: string,
	): Promise<T> {
		const requestId = nanoid();

		const p = new Promise((resolve, reject) => {
			this.dataRequests[requestId] = {
				requestId,
				resolve,
				reject,
			};
		});

		this.send({
			type: 'runner:taskdatarequest',
			taskId,
			requestId,
			requestType: type,
			param,
		});

		return p as T;
	}

	async makeRpcCall(taskId: string, name: RunnerMessage.ToN8n.RPC['name'], params: unknown[]) {
		const callId = nanoid();

		const dataPromise = new Promise((resolve, reject) => {
			this.rpcCalls[callId] = {
				callId,
				resolve,
				reject,
			};
		});

		this.send({
			type: 'runner:rpc',
			callId,
			taskId,
			name,
			params,
		});

		try {
			return await dataPromise;
		} finally {
			delete this.rpcCalls[callId];
		}
	}

	handleRpcResponse(
		callId: string,
		status: N8nMessage.ToRunner.RPCResponse['status'],
		data: unknown,
	) {
		const call = this.rpcCalls[callId];
		if (!call) {
			return;
		}
		if (status === 'success') {
			call.resolve(data);
		} else {
			call.reject(typeof data === 'string' ? new Error(data) : data);
		}
	}

	buildRpcCallObject(taskId: string) {
		const rpcObject: RPCCallObject = {};
		for (const r of RPC_ALLOW_LIST) {
			const splitPath = r.split('.');
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			let obj = rpcObject;

			splitPath.forEach((s, index) => {
				if (index !== splitPath.length - 1) {
					obj[s] = {};
					obj = obj[s];
					return;
				}
				obj[s] = async (...args: unknown[]) => this.makeRpcCall(taskId, r, args);
			});
		}
		return rpcObject;
	}
}
