import { Service } from 'typedi';
import type {
	Agent,
	N8nMessage,
	AgentMessage,
	Job,
	JobOffer,
	JobRequest,
	WorkerMessage,
} from './agent-types';
import { nanoid } from 'nanoid';
import { ApplicationError } from 'n8n-workflow';
import { Logger } from '@/Logger';

class JobRejectError {
	constructor(public reason: string) {}
}

export type MessageCallback = (message: N8nMessage.ToAgent.All) => Promise<void> | void;

type JobAcceptCallback = () => void;
type JobRejectCallback = (reason: JobRejectError) => void;

@Service()
export class AgentManager {
	private knownAgents: Record<Agent['id'], { agent: Agent; messageCallback: MessageCallback }> = {};

	private jobs: Record<Job['id'], Job> = {};

	private jobAcceptRejects: Record<Job['id'], [JobAcceptCallback, JobRejectCallback]> = {};

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
		const invalidRequests: number[] = [];
		for (let i = 0; i < this.pendingJobRequests.length; i++) {
			if (this.pendingJobRequests[i].validUntil < now) {
				invalidRequests.push(i);
			}
		}

		// We reverse the list so the later indexes are valid after deleting earlier ones
		invalidOffers.reverse().forEach((i) => this.pendingJobOffers.splice(i, 1));
		invalidRequests.reverse().forEach((i) => this.pendingJobRequests.splice(i, 1));
	}

	registerAgent(agent: Agent, messageCallback: MessageCallback) {
		this.knownAgents[agent.id] = { agent, messageCallback };
	}

	unregisterAgent(agentId: string) {
		if (agentId in this.knownAgents) {
			delete this.knownAgents[agentId];
		}
	}

	private async messageAgent(agentId: Agent['id'], message: N8nMessage.ToAgent.All) {
		await this.knownAgents[agentId]?.messageCallback(message);
	}

	private async messageWorker(workerId: string, message: N8nMessage.ToWorker.All) {
		//
	}

	async onAgentMessage(agentId: Agent['id'], message: AgentMessage.ToN8n.All) {
		const agent = this.knownAgents[agentId];
		if (!agent) {
			return;
		}
		switch (message.type) {
			case 'agent:jobaccepted':
				this.jobAcceptRejects[message.jobId]?.[0]?.();
				break;
			case 'agent:jobrejected':
				this.jobAcceptRejects[message.jobId]?.[1]?.(new JobRejectError(message.reason));
				break;
			// Already handled
			case 'agent:info':
				break;
		}
	}

	async onWorkerMessage(workerId: string, message: WorkerMessage.ToN8n.All) {
		switch (message.type) {
			case 'worker:jobsettings':
				await this.sendJobSettings(message.jobId, message.settings);
				break;
		}
	}

	private async failJob(jobId: Job['id'], reason: string) {
		delete this.jobs[jobId];
		// TODO: notify worker
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

	async acceptOffer(offer: JobOffer, request: JobRequest): Promise<void> {
		const jobId = nanoid(8);
		await this.messageAgent(offer.agentId, {
			type: 'n8n:jobofferaccept',
			offerId: offer.offerId,
			jobId,
		});

		try {
			await new Promise((resolve, reject) => {
				this.jobAcceptRejects[jobId] = [resolve as () => void, reject];
			});
		} catch (e) {
			if (e instanceof JobRejectError) {
				this.logger.warn(`Job (${jobId}) rejected with reason "${e.message}"`);
				return;
			}
			throw e;
		}

		const job: Job = {
			id: jobId,
			jobType: offer.jobType,
			agentId: offer.agentId,
			workerId: request.workerId,
			jobDoneHandler: (data) => {
				console.log(data);
			},
			jobErrorHandler: (error) => {
				console.error(error);
			},
		};

		this.jobs[jobId] = job;
		const requestIndex = this.pendingJobRequests.findIndex(
			(r) => r.requestId === request.requestId,
		);
		if (!requestIndex) {
			this.logger.error(
				`Failed to find job request (${request.requestId}) after a job was accepted. This shouldn't happen, and might be a race condition.`,
			);
			return;
		}
		this.pendingJobRequests.splice(requestIndex, 1);

		await this.messageWorker(request.workerId, {
			type: 'n8n:jobready',
			jobId,
		});
	}

	// Find matching job offers and requests, then let the agent
	// know that an offer has been accepted
	settleJobs() {
		for (const request of this.pendingJobRequests) {
			if (request.acceptInProgress) {
				continue;
			}
			const offerIndex = this.pendingJobOffers.findIndex((o) => o.jobType === request.jobType);
			if (!offerIndex) {
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
