import { Service } from 'typedi';
import type { N8nMessage, AgentMessage, WorkerMessage } from './agent-types';
import { nanoid } from 'nanoid';
import { ApplicationError, type INodeExecutionData } from 'n8n-workflow';
import { Logger } from '@/logger';

export class JobRejectError {
	constructor(public reason: string) {}
}

export interface Agent {
	id: string;
	name?: string;
	jobTypes: string[];
	lastSeen: Date;
}

export interface Job {
	id: string;
	agentId: Agent['id'];
	workerId: string;
	jobType: string;
}

export interface JobOffer {
	offerId: string;
	agentId: Agent['id'];
	jobType: string;
	validFor: number;
	validUntil: bigint;
}

export interface JobRequest {
	requestId: string;
	workerId: string;
	jobType: string;

	acceptInProgress?: boolean;
}

export type MessageCallback = (message: N8nMessage.ToAgent.All) => Promise<void> | void;
export type WorkerMessageCallback = (message: N8nMessage.ToWorker.All) => Promise<void> | void;

type AgentAcceptCallback = () => void;
type WorkerAcceptCallback = (settings: WorkerMessage.ToN8n.JobSettings['settings']) => void;
type JobRejectCallback = (reason: JobRejectError) => void;

@Service()
export class AgentManager {
	private knownAgents: Record<Agent['id'], { agent: Agent; messageCallback: MessageCallback }> = {};

	private workers: Record<string, WorkerMessageCallback> = {};

	private jobs: Record<Job['id'], Job> = {};

	private agentAcceptRejects: Record<
		Job['id'],
		{ accept: AgentAcceptCallback; reject: JobRejectCallback }
	> = {};

	private workerAcceptRejects: Record<
		Job['id'],
		{ accept: WorkerAcceptCallback; reject: JobRejectCallback }
	> = {};

	private pendingJobOffers: JobOffer[] = [];

	private pendingJobRequests: JobRequest[] = [];

	constructor(private readonly logger: Logger) {}

	expireJobs() {
		const now = process.hrtime.bigint();
		const invalidOffers: number[] = [];
		for (let i = 0; i < this.pendingJobOffers.length; i++) {
			if (this.pendingJobOffers[i].validUntil < now) {
				invalidOffers.push(i);
			}
		}

		// We reverse the list so the later indexes are valid after deleting earlier ones
		invalidOffers.reverse().forEach((i) => this.pendingJobOffers.splice(i, 1));
	}

	registerAgent(agent: Agent, messageCallback: MessageCallback) {
		this.knownAgents[agent.id] = { agent, messageCallback };
	}

	unregisterAgent(agentId: string) {
		if (agentId in this.knownAgents) {
			delete this.knownAgents[agentId];
		}
	}

	registerWorker(workerId: string, messageCallback: WorkerMessageCallback) {
		this.workers[workerId] = messageCallback;
	}

	unregisterWorker(workerId: string) {
		if (workerId in this.workers) {
			delete this.workers[workerId];
		}
	}

	private async messageAgent(agentId: Agent['id'], message: N8nMessage.ToAgent.All) {
		await this.knownAgents[agentId]?.messageCallback(message);
	}

	private async messageWorker(workerId: string, message: N8nMessage.ToWorker.All) {
		await this.workers[workerId]?.(message);
	}

	async onAgentMessage(agentId: Agent['id'], message: AgentMessage.ToN8n.All) {
		const agent = this.knownAgents[agentId];
		if (!agent) {
			return;
		}
		switch (message.type) {
			case 'agent:jobaccepted':
				this.handleAgentAccept(message.jobId);
				break;
			case 'agent:jobrejected':
				this.handleAgentReject(message.jobId, message.reason);
				break;
			case 'agent:joboffer':
				this.jobOffered({
					agentId,
					jobType: message.jobType,
					offerId: message.offerId,
					validFor: message.validFor,
					validUntil: process.hrtime.bigint() + BigInt(message.validFor * 1_000_000),
				});
				break;
			case 'agent:jobdone':
				await this.jobDoneHandler(message.jobId, message.data);
				break;
			case 'agent:joberror':
				await this.jobErrorHandler(message.jobId, message.error);
				break;
			case 'agent:jobdatarequest':
				await this.handleDataRequest(
					message.jobId,
					message.requestId,
					message.requestType,
					message.param,
				);
				break;

			case 'agent:rpc':
				await this.handleRpcRequest(message.jobId, message.callId, message.name, message.params);
				break;
			// Already handled
			case 'agent:info':
				break;
		}
	}

	async handleRpcRequest(
		jobId: Job['id'],
		callId: string,
		name: AgentMessage.ToN8n.RPC['name'],
		params: unknown[],
	) {
		const job = this.jobs[jobId];
		if (!job) {
			return;
		}
		await this.messageWorker(job.workerId, {
			type: 'n8n:rpc',
			jobId,
			callId,
			name,
			params,
		});
	}

	handleAgentAccept(jobId: Job['id']) {
		if (this.agentAcceptRejects[jobId]) {
			this.agentAcceptRejects[jobId].accept();
			delete this.agentAcceptRejects[jobId];
		}
	}

	handleAgentReject(jobId: Job['id'], reason: string) {
		if (this.agentAcceptRejects[jobId]) {
			this.agentAcceptRejects[jobId].reject(new JobRejectError(reason));
			delete this.agentAcceptRejects[jobId];
		}
	}

	async handleDataRequest(
		jobId: Job['id'],
		requestId: AgentMessage.ToN8n.JobDataRequest['requestId'],
		requestType: AgentMessage.ToN8n.JobDataRequest['requestType'],
		param?: string,
	) {
		const job = this.jobs[jobId];
		if (!job) {
			return;
		}
		await this.messageWorker(job.workerId, {
			type: 'n8n:jobdatarequest',
			jobId,
			requestId,
			requestType,
			param,
		});
	}

	async handleResponse(
		jobId: Job['id'],
		requestId: AgentMessage.ToN8n.JobDataRequest['requestId'],
		data: unknown,
	) {
		const job = this.jobs[jobId];
		if (!job) {
			return;
		}
		await this.messageAgent(job.workerId, {
			type: 'n8n:jobdataresponse',
			jobId,
			requestId,
			data,
		});
	}

	async onWorkerMessage(workerId: string, message: WorkerMessage.ToN8n.All) {
		switch (message.type) {
			case 'worker:jobsettings':
				this.handleWorkerAccept(message.jobId, message.settings);
				break;
			case 'worker:jobcancel':
				await this.cancelJob(message.jobId, message.reason);
				break;
			case 'worker:jobrequest':
				this.jobRequested({
					jobType: message.jobType,
					requestId: message.requestId,
					workerId,
				});
				break;
			case 'worker:jobdataresponse':
				await this.handleWorkerDataResponse(message.jobId, message.requestId, message.data);
				break;
			case 'worker:rpcresponse':
				await this.handleWorkerRpcResponse(
					message.jobId,
					message.callId,
					message.status,
					message.data,
				);
				break;
		}
	}
	async handleWorkerRpcResponse(
		jobId: string,
		callId: string,
		status: WorkerMessage.ToN8n.RPCResponse['status'],
		data: unknown,
	) {
		const agent = await this.getAgentOrFailJob(jobId);
		await this.messageAgent(agent.id, {
			type: 'n8n:rpcresponse',
			jobId,
			callId,
			status,
			data,
		});
	}

	async handleWorkerDataResponse(jobId: Job['id'], requestId: string, data: unknown) {
		const agent = await this.getAgentOrFailJob(jobId);

		await this.messageAgent(agent.id, {
			type: 'n8n:jobdataresponse',
			jobId,
			requestId,
			data,
		});
	}

	handleWorkerAccept(jobId: Job['id'], settings: WorkerMessage.ToN8n.JobSettings['settings']) {
		if (this.workerAcceptRejects[jobId]) {
			this.workerAcceptRejects[jobId].accept(settings);
			delete this.workerAcceptRejects[jobId];
		}
	}

	handleWorkerReject(jobId: Job['id'], reason: string) {
		if (this.workerAcceptRejects[jobId]) {
			this.workerAcceptRejects[jobId].reject(new JobRejectError(reason));
			delete this.workerAcceptRejects[jobId];
		}
	}

	private async cancelJob(jobId: Job['id'], reason: string) {
		const job = this.jobs[jobId];
		if (!job) {
			return;
		}
		delete this.jobs[jobId];

		await this.messageAgent(job.agentId, {
			type: 'n8n:jobcancel',
			jobId,
			reason,
		});
	}

	private async failJob(jobId: Job['id'], reason: string) {
		const job = this.jobs[jobId];
		if (!job) {
			return;
		}
		delete this.jobs[jobId];
		// TODO: special message type?
		await this.messageWorker(job.workerId, {
			type: 'n8n:joberror',
			jobId,
			error: reason,
		});
	}

	private async getAgentOrFailJob(jobId: Job['id']): Promise<Agent> {
		const job = this.jobs[jobId];
		if (!job) {
			throw new ApplicationError(`Cannot find agent, failed to find job (${jobId})`, {
				level: 'error',
			});
		}
		const agent = this.knownAgents[job.agentId];
		if (!agent) {
			const reason = `Cannot find agent, failed to find agent (${job.agentId})`;
			await this.failJob(jobId, reason);
			throw new ApplicationError(reason, {
				level: 'error',
			});
		}
		return agent.agent;
	}

	async sendJobSettings(jobId: Job['id'], settings: unknown) {
		const agent = await this.getAgentOrFailJob(jobId);
		await this.messageAgent(agent.id, {
			type: 'n8n:jobsettings',
			jobId,
			settings,
		});
	}

	async jobDoneHandler(jobId: Job['id'], data: INodeExecutionData[]) {
		const job = this.jobs[jobId];
		if (!job) {
			return;
		}
		await this.workers[job.workerId]?.({
			type: 'n8n:jobdone',
			jobId: job.id,
			data,
		});
		delete this.jobs[job.id];
	}

	async jobErrorHandler(jobId: Job['id'], error: unknown) {
		const job = this.jobs[jobId];
		if (!job) {
			return;
		}
		await this.workers[job.workerId]?.({
			type: 'n8n:joberror',
			jobId: job.id,
			error,
		});
		delete this.jobs[job.id];
	}

	async acceptOffer(offer: JobOffer, request: JobRequest): Promise<void> {
		const jobId = nanoid(8);

		try {
			const acceptPromise = new Promise((resolve, reject) => {
				this.agentAcceptRejects[jobId] = { accept: resolve as () => void, reject };

				// TODO: customisable timeout
				setTimeout(() => {
					reject('Agent timed out');
				}, 2000);
			});

			await this.messageAgent(offer.agentId, {
				type: 'n8n:jobofferaccept',
				offerId: offer.offerId,
				jobId,
			});

			await acceptPromise;
		} catch (e) {
			request.acceptInProgress = false;
			if (e instanceof JobRejectError) {
				this.logger.info(`Job (${jobId}) rejected by Agent with reason "${e.reason}"`);
				return;
			}
			throw e;
		}

		const job: Job = {
			id: jobId,
			jobType: offer.jobType,
			agentId: offer.agentId,
			workerId: request.workerId,
		};

		this.jobs[jobId] = job;
		const requestIndex = this.pendingJobRequests.findIndex(
			(r) => r.requestId === request.requestId,
		);
		if (requestIndex === -1) {
			this.logger.error(
				`Failed to find job request (${request.requestId}) after a job was accepted. This shouldn't happen, and might be a race condition.`,
			);
			return;
		}
		this.pendingJobRequests.splice(requestIndex, 1);

		try {
			const acceptPromise = new Promise<WorkerMessage.ToN8n.JobSettings['settings']>(
				(resolve, reject) => {
					this.workerAcceptRejects[jobId] = {
						accept: resolve as (settings: WorkerMessage.ToN8n.JobSettings['settings']) => void,
						reject,
					};

					// TODO: customisable timeout
					setTimeout(() => {
						reject('Worker timed out');
					}, 2000);
				},
			);

			await this.messageWorker(request.workerId, {
				type: 'n8n:jobready',
				requestId: request.requestId,
				jobId,
			});

			const settings = await acceptPromise;
			await this.sendJobSettings(job.id, settings);
		} catch (e) {
			if (e instanceof JobRejectError) {
				await this.cancelJob(job.id, e.reason);
				this.logger.info(`Job (${jobId}) rejected by Worker with reason "${e.reason}"`);
				return;
			}
			await this.cancelJob(job.id, 'Unknown reason');
			throw e;
		}
	}

	// Find matching job offers and requests, then let the agent
	// know that an offer has been accepted
	//
	// *DO NOT MAKE THIS FUNCTION ASYNC*
	// This function relies on never yielding.
	// If you need to make this function async, you'll need to
	// implement some kind of locking for the requests and job
	// lists
	settleJobs() {
		this.expireJobs();

		for (const request of this.pendingJobRequests) {
			if (request.acceptInProgress) {
				continue;
			}
			const offerIndex = this.pendingJobOffers.findIndex((o) => o.jobType === request.jobType);
			if (offerIndex === -1) {
				continue;
			}
			const offer = this.pendingJobOffers[offerIndex];

			request.acceptInProgress = true;
			this.pendingJobOffers.splice(offerIndex, 1);

			void this.acceptOffer(offer, request);
		}
	}

	jobRequested(request: JobRequest) {
		this.pendingJobRequests.push(request);
		this.settleJobs();
	}

	jobOffered(offer: JobOffer) {
		this.pendingJobOffers.push(offer);
		this.settleJobs();
	}
}
