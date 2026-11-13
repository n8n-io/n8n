import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { HIGHEST_SHUTDOWN_PRIORITY, OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type Bull from 'bull';

/** Bull queue for agent turns. It is separate from the workflow jobs queue. */
export const AGENT_TURN_QUEUE_NAME = 'agent-turns';

const DRAIN_JOB = 'drain';

/**
 * A drain job carries only the thread id. The worker claims the next message
 * from the database, so a lost, late or duplicate job cannot run a turn twice.
 */
export interface AgentDrainJobData {
	threadId: string;
}

/**
 * Owns the Bull queue that sends agent turns from mains to workers.
 *
 * Jobs use the thread id as the job id, so a thread has at most one waiting
 * or active drain job. A message that arrives while a drain job is active is
 * picked up by that drain loop, or by the next leader scan.
 */
@Service()
export class AgentTurnQueue {
	private queue?: Bull.Queue<AgentDrainJobData>;

	private paused = false;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('agents');
	}

	get isReady(): boolean {
		return this.queue !== undefined;
	}

	async init(): Promise<void> {
		if (this.queue) return;

		const { default: BullQueue } = await import('bull');
		const { RedisClientService } = await import('@n8n/backend-services');
		const service = Container.get(RedisClientService);
		const prefix = service.toValidPrefix(this.globalConfig.queue.bull.prefix);
		// A stalled turn is marked interrupted by the owner check, never retried.
		const settings = { ...this.globalConfig.queue.bull.settings, maxStalledCount: 0 };

		const queue = new BullQueue<AgentDrainJobData>(AGENT_TURN_QUEUE_NAME, {
			prefix,
			settings,
			createClient: (type) => service.createClient({ type: `${type}(bull)` }),
		});
		queue.on('error', (error) => {
			this.logger.warn('Agent turn queue error', { error });
		});
		this.queue = queue;
	}

	/** Ask a worker to run the queued messages of a thread. */
	async enqueueDrain(threadId: string): Promise<void> {
		if (!this.queue) return;
		await this.queue.add(
			DRAIN_JOB,
			{ threadId },
			{
				jobId: `drain:${threadId}`,
				attempts: 1,
				removeOnComplete: true,
				removeOnFail: true,
			},
		);
	}

	/** Start pulling drain jobs on this worker. */
	process(concurrency: number, handler: (data: AgentDrainJobData) => Promise<void>): void {
		if (!this.queue) return;
		void this.queue.process(DRAIN_JOB, concurrency, async (job: Bull.Job<AgentDrainJobData>) => {
			if (this.paused) return;
			await handler(job.data);
		});
	}

	/** Waiting and active drain jobs, for metrics. */
	async counts(): Promise<{ waiting: number; active: number } | null> {
		if (!this.queue) return null;
		const { waiting, active } = await this.queue.getJobCounts();
		return { waiting, active };
	}

	/**
	 * Stop pulling new jobs here at once. Active jobs keep running; the shutdown
	 * drain waits for their turns, then marks the rest interrupted.
	 */
	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	async pause(): Promise<void> {
		if (!this.queue || this.paused) return;
		this.paused = true;
		try {
			await this.queue.pause(true, true);
		} catch (error) {
			this.logger.warn('Failed to pause the agent turn queue', { error });
		}
	}
}
