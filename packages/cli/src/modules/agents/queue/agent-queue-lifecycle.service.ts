import { AGENT_QUEUE_DISPATCH_CAPABILITY, AGENT_TURNS_CAPABILITY } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceRegistryProxyService } from '@n8n/backend-services';
import { AgentsConfig } from '@n8n/config';
import { HIGHEST_SHUTDOWN_PRIORITY, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { AgentChatResumeService } from '../agent-chat-resume.service';
import { AgentMessageQueueConsumer } from '../agent-message-queue-consumer.service';
import { AgentTurnPlacement } from './agent-turn-placement.service';
import { AgentTurnQueue } from './agent-turn-queue.service';

/**
 * Starts and stops agent queue mode on this process.
 *
 * A main opens the agent queue so that it can send drain jobs, and advertises
 * that it dispatches. A worker opens the queue, pulls drain jobs, and
 * advertises the `agent-turns` capability only once it can take work. On
 * shutdown the worker withdraws the capability first, so mains stop sending
 * it turns while its running turns drain.
 */
@Service()
export class AgentQueueLifecycle {
	private advertised?: string;

	constructor(
		private readonly placement: AgentTurnPlacement,
		private readonly turnQueue: AgentTurnQueue,
		private readonly consumer: AgentMessageQueueConsumer,
		private readonly chatResume: AgentChatResumeService,
		private readonly registry: InstanceRegistryProxyService,
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('agents');
	}

	async startOnMain(): Promise<void> {
		if (!this.placement.dispatchEnabled) return;
		await this.turnQueue.init();
		await this.advertise(AGENT_QUEUE_DISPATCH_CAPABILITY);
		this.logger.info('Agent queue mode is on. This main sends agent turns to agent workers.');
	}

	async startOnWorker(): Promise<void> {
		if (!this.placement.runsTurnsOnWorker) return;
		await this.turnQueue.init();
		this.consumer.startOnWorker();
		const concurrency = this.agentsConfig.workerConcurrency;
		this.turnQueue.process(concurrency, {
			drain: async ({ threadId }) => await this.consumer.drainForJob(threadId),
			request: async ({ requestId }) => await this.chatResume.runRequest(requestId),
		});
		await this.advertise(AGENT_TURNS_CAPABILITY);
		this.logger.info('This worker runs agent turns', { concurrency });
	}

	/** Leave the registry first, so that no new turns come here during the drain. */
	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	async stop(): Promise<void> {
		if (!this.advertised) return;
		const capability = this.advertised;
		this.advertised = undefined;
		try {
			await this.registry.withdrawCapability(capability);
		} catch (error) {
			this.logger.warn('Failed to withdraw an agent queue capability', { capability, error });
		}
	}

	private async advertise(capability: string): Promise<void> {
		this.advertised = capability;
		try {
			await this.registry.advertiseCapability(capability);
		} catch (error) {
			// The next registry heartbeat writes it.
			this.logger.warn('Failed to advertise an agent queue capability', { capability, error });
		}
	}
}
