import { ApplicationError, ensureError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { URL } from 'node:url';
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

export abstract class TaskRunner {
	id: string = nanoid();

	ws: WebSocket;

	canSendOffers = false;

	runningTasks: Map<Task['taskId'], Task> = new Map();

	offerInterval: NodeJS.Timeout | undefined;

	openOffers: Map<TaskOffer['offerId'], TaskOffer> = new Map();

	dataRequests: Map<DataRequest['requestId'], DataRequest> = new Map();

	rpcCalls: Map<RPCCall['callId'], RPCCall> = new Map();

	constructor(
		public taskType: string,
		wsUrl: string,
		grantToken: string,
		private maxConcurrency: number,
		public name?: string,
	) {
		const url = new URL(wsUrl);
		url.searchParams.append('id', this.id);
		this.ws = new WebSocket(url.toString(), {
			headers: {
				authorization: `Bearer ${grantToken}`,
			},
		});
		this.ws.addEventListener('message', this.receiveMessage);
		this.ws.addEventListener('close', this.stopTaskOffers);
	}

	private receiveMessage = (message: MessageEvent) => {
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
		this.openOffers.forEach((offer, key) => {
			if (offer.validUntil < process.hrtime.bigint()) {
				this.openOffers.delete(key);
			}
		});
	}

	sendOffers() {
		this.deleteStaleOffers();

		const offersToSend =
			this.maxConcurrency -
			(Object.values(this.openOffers).length + Object.values(this.runningTasks).length);

		for (let i = 0; i < offersToSend; i++) {
			const offer: TaskOffer = {
				offerId: nanoid(),
				validUntil: process.hrtime.bigint() + BigInt((VALID_TIME_MS + VALID_EXTRA_MS) * 1_000_000), // Adding a little extra time to account for latency
			};
			this.openOffers.set(offer.offerId, offer);
			this.send({
				type: 'runner:taskoffer',
				taskType: this.taskType,
				offerId: offer.offerId,
				validFor: VALID_TIME_MS,
			});
		}
	}

	send(message: RunnerMessage.ToN8n.All) {
		this.ws.send(JSON.stringify(message));
	}

	onMessage(message: N8nMessage.ToRunner.All) {
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
		const request = this.dataRequests.get(requestId);
		if (!request) {
			return;
		}
		// Deleting of the request is handled in `requestData`, using a
		// `finally` wrapped around the return
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
		const offer = this.openOffers.get(offerId);
		if (!offer) {
			this.send({
				type: 'runner:taskrejected',
				taskId,
				reason: 'Offer expired and no open task slots',
			});
			return;
		} else {
			this.openOffers.delete(offerId);
		}

		this.runningTasks.set(taskId, {
			taskId,
			active: false,
			cancelled: false,
		});

		this.send({
			type: 'runner:taskaccepted',
			taskId,
		});
	}

	taskCancelled(taskId: string) {
		const task = this.runningTasks.get(taskId);
		if (!task) {
			return;
		}
		task.cancelled = true;
		if (task.active) {
			// TODO
		} else {
			this.runningTasks.delete(taskId);
		}
		this.sendOffers();
	}

	taskErrored(taskId: string, error: unknown) {
		this.send({
			type: 'runner:taskerror',
			taskId,
			error,
		});
		this.runningTasks.delete(taskId);
		this.sendOffers();
	}

	taskDone(taskId: string, data: RunnerMessage.ToN8n.TaskDone['data']) {
		this.send({
			type: 'runner:taskdone',
			taskId,
			data,
		});
		this.runningTasks.delete(taskId);
		this.sendOffers();
	}

	async receivedSettings(taskId: string, settings: unknown) {
		const task = this.runningTasks.get(taskId);
		if (!task) {
			return;
		}
		if (task.cancelled) {
			this.runningTasks.delete(taskId);
			return;
		}
		task.settings = settings;
		task.active = true;
		try {
			const data = await this.executeTask(task);
			this.taskDone(taskId, data);
		} catch (e) {
			if (ensureError(e)) {
				this.taskErrored(taskId, (e as Error).message);
			} else {
				this.taskErrored(taskId, e);
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	async executeTask(_task: Task): Promise<TaskResultData> {
		throw new ApplicationError('Unimplemented');
	}

	async requestData<T = unknown>(
		taskId: Task['taskId'],
		type: RunnerMessage.ToN8n.TaskDataRequest['requestType'],
		param?: string,
	): Promise<T> {
		const requestId = nanoid();

		const p = new Promise<T>((resolve, reject) => {
			this.dataRequests.set(requestId, {
				requestId,
				resolve: resolve as (data: unknown) => void,
				reject,
			});
		});

		this.send({
			type: 'runner:taskdatarequest',
			taskId,
			requestId,
			requestType: type,
			param,
		});

		try {
			return await p;
		} finally {
			this.dataRequests.delete(requestId);
		}
	}

	async makeRpcCall(taskId: string, name: RunnerMessage.ToN8n.RPC['name'], params: unknown[]) {
		const callId = nanoid();

		const dataPromise = new Promise((resolve, reject) => {
			this.rpcCalls.set(callId, {
				callId,
				resolve,
				reject,
			});
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
			this.rpcCalls.delete(callId);
		}
	}

	handleRpcResponse(
		callId: string,
		status: N8nMessage.ToRunner.RPCResponse['status'],
		data: unknown,
	) {
		const call = this.rpcCalls.get(callId);
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
			let obj = rpcObject;

			splitPath.forEach((s, index) => {
				if (index !== splitPath.length - 1) {
					obj[s] = {};
					obj = obj[s];
					return;
				}
				obj[s] = async (...args: unknown[]) => await this.makeRpcCall(taskId, r, args);
			});
		}
		return rpcObject;
	}
}
