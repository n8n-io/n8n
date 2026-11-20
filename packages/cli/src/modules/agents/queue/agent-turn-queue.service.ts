import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { HIGHEST_SHUTDOWN_PRIORITY, OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type Bull from 'bull';

/** Bull queue for agent turns. It is separate from the workflow jobs queue. */
export const AGENT_TURN_QUEUE_NAME = 'agent-turns';

const DRAIN_JOB = 'drain';

const REQUEST_JOB = 'request';

/**
 * A drain job carries only the thread id. The worker claims the next message
 * from the database, so a lost, late or duplicate job cannot run a turn twice.
 */
export interface AgentDrainJobData {
	threadId: string;
}

/**
 * A request job carries only the id of an `agent_turn_request` row. The
 * worker claims the row before it runs the turn, so the turn runs at most once.
 */
export interface AgentRequestJobData {
	requestId: string;
}

type AgentTurnJobData = AgentDrainJobData | AgentRequestJobData;

export interface AgentTurnJobHandlers {
	drain: (data: AgentDrainJobData) => Promise<void>;
	request: (data: AgentRequestJobData) => Promise<void>;
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
	private queue?: Bull.Queue<AgentTurnJobData>;

	private paused = false;

	private held = false;

	private progressAt?: number;

	private waiting?: { at: number; count: Promise<number> };

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('agents');
	}

	get isReady(): boolean {
		return this.queue !== undefined;
	}

	/**
	 * When a job of this queue last started or ended on any process, in epoch
	 * milliseconds. Starts at the time the queue opened here. `undefined` before
	 * the queue opens.
	 */
	get lastProgressAt(): number | undefined {
		return this.progressAt;
	}

	async init(): Promise<void> {
		if (this.queue) return;

		const { default: BullQueue } = await import('bull');
		const { RedisClientService } = await import('@n8n/backend-services');
		const service = Container.get(RedisClientService);
		const prefix = service.toValidPrefix(this.globalConfig.queue.bull.prefix);
		// A stalled turn is marked interrupted by the owner check, never retried.
		const settings = { ...this.globalConfig.queue.bull.settings, maxStalledCount: 0 };

		const queue = new BullQueue<AgentTurnJobData>(AGENT_TURN_QUEUE_NAME, {
			prefix,
			settings,
			createClient: (type) => service.createClient({ type: `${type}(bull)` }),
		});
		queue.on('error', (error) => {
			this.logger.warn('Agent turn queue error', { error });
		});
		// Global events come from every process, so a main sees when workers take
		// or finish jobs. Mains use this to tell busy workers from stuck ones.
		const markProgress = () => {
			this.progressAt = Date.now();
		};
		queue.on('global:active', markProgress);
		queue.on('global:completed', markProgress);
		queue.on('global:failed', markProgress);
		this.progressAt = Date.now();
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

	/** Ask a worker to run the turn stored in an `agent_turn_request` row. */
	async enqueueRequest(requestId: string): Promise<void> {
		if (!this.queue) return;
		await this.queue.add(
			REQUEST_JOB,
			{ requestId },
			{
				jobId: `request:${requestId}`,
				attempts: 1,
				removeOnComplete: true,
				removeOnFail: true,
			},
		);
	}

	/**
	 * Start pulling jobs on this worker. All job kinds share one concurrency
	 * limit, so `concurrency` caps the turns that this worker runs at once.
	 */
	process(concurrency: number, handlers: AgentTurnJobHandlers): void {
		if (!this.queue) return;
		void this.queue.process('*', concurrency, async (job: Bull.Job<AgentTurnJobData>) => {
			if (this.paused) return;
			const { data } = job;
			if (job.name === REQUEST_JOB && 'requestId' in data) await handlers.request(data);
			else if (job.name === DRAIN_JOB && 'threadId' in data) await handlers.drain(data);
		});
	}

	/**
	 * Stop or restart pulling jobs here while other agent work (background
	 * sub-agents) uses this worker's capacity. Running jobs keep running.
	 */
	async hold(hold: boolean): Promise<void> {
		if (!this.queue || this.paused || hold === this.held) return;
		this.held = hold;
		try {
			if (hold) await this.queue.pause(true, true);
			else await this.queue.resume(true);
		} catch (error) {
			this.logger.warn('Failed to change the agent turn queue hold', { hold, error });
		}
	}

	/** How long a read of the waiting job count stays valid. */
	static readonly WAITING_CHECK_TTL_MS = 1_000;

	/**
	 * Jobs that wait for a worker. Reads Redis at most once each
	 * `WAITING_CHECK_TTL_MS`, so a burst of requests costs one read. Returns 0
	 * when the queue is not open or the read fails.
	 */
	async waitingCount(): Promise<number> {
		if (!this.queue) return 0;
		const now = Date.now();
		if (!this.waiting || now - this.waiting.at >= AgentTurnQueue.WAITING_CHECK_TTL_MS) {
			this.waiting = {
				at: now,
				count: this.queue.getWaitingCount().catch((error: unknown) => {
					this.logger.debug('Failed to read the agent turn queue length', { error });
					return 0;
				}),
			};
		}
		return await this.waiting.count;
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
