import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { AgentClient } from './cloud-agent-client.service';
import { CloudAgentToolRouter } from './cloud-agent-tool-router.service';

/**
 * High-level orchestration for the cloud agent.
 *
 * startRun() forwards the user message to the cloud service to get a runId,
 * then kicks off the tool-router subscription so family=n8n tool calls get
 * dispatched locally with the user's RBAC. cancelRun() tears that down.
 */
@Service()
export class AgentService {
	constructor(
		private readonly logger: Logger,
		private readonly client: AgentClient,
		private readonly toolRouter: CloudAgentToolRouter,
	) {}

	async init(): Promise<void> {
		this.logger.scoped('cloud-agent').debug('AgentService init');
	}

	async shutdown(): Promise<void> {
		this.logger.scoped('cloud-agent').debug('AgentService shutdown');
		this.toolRouter.stopAll();
	}

	async startRun(
		payload: { threadId: string; message: string },
		user: User,
	): Promise<{ runId: string }> {
		const result = await this.client.startRun(payload, user);
		this.toolRouter.start(result.runId, payload.threadId, user);
		return result;
	}

	async openEventStream(threadId: string, user: User, lastEventId?: number): Promise<Response> {
		return await this.client.openEventStream(threadId, user, lastEventId);
	}

	async postToolResult(
		runId: string,
		payload: { toolCallId: string; output: unknown; isError: boolean },
		user: User,
	): Promise<void> {
		await this.client.postToolResult(runId, payload, user);
	}

	async cancelRun(runId: string, user: User): Promise<{ cancelled: boolean }> {
		this.toolRouter.stop(runId);
		return await this.client.cancelRun(runId, user);
	}
}
