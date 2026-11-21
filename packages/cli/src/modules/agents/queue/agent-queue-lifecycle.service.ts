import { AGENT_QUEUE_DISPATCH_CAPABILITY, AGENT_TURNS_CAPABILITY } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceRegistryProxyService } from '@n8n/backend-services';
import { AgentsConfig } from '@n8n/config';
import { HIGHEST_SHUTDOWN_PRIORITY, OnShutdown } from '@n8n/decorators';
import { Container, type Constructable, Service } from '@n8n/di';

import { AgentAppTurnService } from '../agent-app-turn.service';
import { AgentClusterService } from '../agent-cluster.service';
import { AgentChatResumeService } from '../agent-chat-resume.service';
import { AgentMessageQueueConsumer } from '../agent-message-queue-consumer.service';
import { AgentTaskService } from '../agent-task.service';
import { AgentWakeService } from '../background/agent-wake.service';
import { AgentWorkflowToolResumeService } from '../agent-workflow-tool-resume.service';
import { WebhookChannelService } from '../integrations/platforms/webhook/webhook-channel.service';
import { ChannelInboundProcessor } from '../integrations/channel-inbound/channel-inbound.processor';
import { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { AgentQueueMetrics } from './agent-queue-metrics';
import { AgentWorkerCapacity } from './agent-worker-capacity.service';
import { AgentTurnPlacement } from './agent-turn-placement.service';
import { AgentTurnQueue } from './agent-turn-queue.service';
import { QueuedTurnRunner } from './queued-turn-runner';
import { QueuedTurnWorker } from './queued-turn-worker';

/**
 * The services that register the request kinds that they run, see
 * `AgentTurnHandlers`. Each one registers its kinds when it is built. A
 * worker gets request jobs from other processes, so it must build all of
 * them before it pulls a job.
 */
const TURN_HANDLER_OWNERS: readonly Constructable[] = [
	AgentChatResumeService,
	WebhookChannelService,
	ChannelInboundProcessor,
	AgentAppTurnService,
	AgentWorkflowToolResumeService,
	AgentTaskService,
	AgentWakeService,
];

/**
 * Starts and stops agent queue mode on this process.
 *
 * A main opens the agent queue so that it can send drain jobs, and advertises
 * that it dispatches. A webhook process opens the queue only to send request
 * jobs: it pulls no job and runs no main-only work, see `startOnIngress`. A worker opens the queue, pulls drain jobs, and
 * advertises the `agent-turns` capability only once it can take work. On
 * shutdown the worker withdraws the capability first, so mains stop sending
 * it turns while its running turns drain.
 */
@Service()
export class AgentQueueLifecycle {
	/** How often the leader removes turn requests that a crashed process left behind. */
	static readonly STALE_REQUEST_SWEEP_MS = 10 * 60 * 1_000;

	private advertised?: string;

	private staleRequestSweep?: NodeJS.Timeout;

	constructor(
		private readonly placement: AgentTurnPlacement,
		private readonly cluster: AgentClusterService,
		private readonly turnQueue: AgentTurnQueue,
		private readonly consumer: AgentMessageQueueConsumer,
		private readonly queuedTurns: QueuedTurnRunner,
		private readonly queuedTurnWorker: QueuedTurnWorker,
		private readonly registry: InstanceRegistryProxyService,
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
		private readonly capacity: AgentWorkerCapacity,
		private readonly backgroundJobs: AgentBackgroundJobService,
		private readonly metrics: AgentQueueMetrics,
	) {
		this.logger = this.logger.scoped('agents');
		this.metrics.registerGauges({
			backgroundRuns: () => this.backgroundJobs.localRunCount,
			queueCounts: async () => await this.turnQueue.counts(),
		});
	}

	async startOnMain(): Promise<void> {
		this.registerTurnHandlers();
		if (!this.placement.dispatchEnabled) return;
		await this.turnQueue.init();
		this.startStaleRequestSweep();
		await this.advertise(AGENT_QUEUE_DISPATCH_CAPABILITY);
		this.logger.info('Agent queue mode is on. This main sends agent turns to agent workers.');
	}

	/**
	 * Open the agent queue on a webhook process in agent queue mode, so that it
	 * can send public turns to agent workers. The process pulls no job, so it
	 * does not register as a worker. The stale request sweep, the message queue
	 * scan and the channel reconcile stay on mains. The stream channel opens its
	 * Redis connections on first use. A failure here leaves the queue closed, and
	 * this process then rejects every public turn as busy.
	 */
	async startOnIngress(): Promise<void> {
		if (!this.placement.ingressOnly) return;
		await this.turnQueue.init();
		await this.advertise(AGENT_QUEUE_DISPATCH_CAPABILITY);
		this.logger.info(
			'Agent queue mode is on. This webhook process sends public agent turns to agent workers.',
		);
	}

	async startOnWorker(): Promise<void> {
		this.registerTurnHandlers();
		if (!this.placement.runsTurnsOnWorker) return;
		await this.turnQueue.init();
		this.consumer.startOnWorker();
		await this.queuedTurnWorker.startWorker();
		const concurrency = this.agentsConfig.workerConcurrency;
		// Background sub-agents outlive the job of the turn that started them. Count
		// them too, and stop pulling jobs while they fill this worker.
		// `hold()` logs its own failures and never rejects.
		this.capacity.onHoldChange((hold) => {
			void this.turnQueue.hold(hold);
		});
		this.backgroundJobs.onLocalRunsChange((count) => this.capacity.setBackgroundRuns(count));
		this.capacity.setBackgroundRuns(this.backgroundJobs.localRunCount);
		this.turnQueue.process(concurrency, {
			drain: async ({ threadId }) =>
				await this.counted(async () => await this.consumer.drainForJob(threadId)),
			request: async ({ requestId }) =>
				await this.counted(async () => await this.queuedTurnWorker.runJob(requestId)),
		});
		await this.advertise(AGENT_TURNS_CAPABILITY);
		this.logger.info('This worker runs agent turns', { concurrency });
	}

	/** Leave the registry first, so that no new turns come here during the drain. */
	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	async stop(): Promise<void> {
		clearInterval(this.staleRequestSweep);
		this.staleRequestSweep = undefined;
		if (!this.advertised) return;
		const capability = this.advertised;
		this.advertised = undefined;
		try {
			await this.registry.withdrawCapability(capability);
		} catch (error) {
			this.logger.warn('Failed to withdraw an agent queue capability', { capability, error });
		}
	}

	/** Build the services in `TURN_HANDLER_OWNERS`, so that this process can run their request kinds. */
	private registerTurnHandlers(): void {
		for (const owner of TURN_HANDLER_OWNERS) Container.get(owner);
	}

	/** One sweep per cluster is enough, so only the leader deletes. */
	private startStaleRequestSweep(): void {
		const sweep = () => {
			if (this.cluster.isLeader) void this.queuedTurns.removeStaleRequests();
		};
		sweep();
		this.staleRequestSweep = setInterval(sweep, AgentQueueLifecycle.STALE_REQUEST_SWEEP_MS);
		this.staleRequestSweep.unref();
	}

	private async counted(run: () => Promise<void>): Promise<void> {
		this.capacity.jobStarted();
		try {
			await run();
		} finally {
			this.capacity.jobFinished();
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
