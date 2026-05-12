import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { IUser } from 'n8n-workflow';

import { AgentClient } from './cloud-agent-client.service';

/**
 * High-level orchestration for the cloud agent. Owns the AgentClient instance
 * and (in future commits) the tool router that dispatches family=n8n tool
 * calls back to n8n's services.
 */
@Service()
export class AgentService {
	constructor(
		private readonly logger: Logger,
		private readonly client: AgentClient,
	) {}

	async init(): Promise<void> {
		this.logger.scoped('cloud-agent').debug('AgentService init');
	}

	async shutdown(): Promise<void> {
		this.logger.scoped('cloud-agent').debug('AgentService shutdown');
	}

	async startRun(
		payload: { threadId: string; message: string },
		user: IUser,
	): Promise<{ runId: string }> {
		return await this.client.startRun(payload, user);
	}

	async openEventStream(threadId: string, user: IUser, lastEventId?: number): Promise<Response> {
		return await this.client.openEventStream(threadId, user, lastEventId);
	}

	async postToolResult(
		runId: string,
		payload: { toolCallId: string; output: unknown; isError: boolean },
		user: IUser,
	): Promise<void> {
		await this.client.postToolResult(runId, payload, user);
	}

	async cancelRun(runId: string, user: IUser): Promise<{ cancelled: boolean }> {
		return await this.client.cancelRun(runId, user);
	}
}
