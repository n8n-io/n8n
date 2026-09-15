import { Logger } from '@n8n/backend-common';
import { SchedulerConfig, WorkflowsConfig } from '@n8n/config';
import type { CreateExecutionPayload, PollerCursor, PollLeaseFence } from '@n8n/db';
import { PollerStateRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import type { PollCursor } from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import type {
	PollCursorCommitOperation,
	PollCursorCommitResult,
} from '@/events/maps/poll-trigger-metrics.event-map';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { isDurablePollerChainEnabled } from '@/scheduling/poll-trigger-node/durable-poller-chain';

/** Narrows a stored cursor, which the persistence layer types more loosely. */
const toPollCursor = (cursor: PollerCursor): PollCursor => cursor as PollCursor;

@Service()
export class PollCursorService {
	constructor(
		private readonly logger: Logger,
		private readonly pollerStateRepository: PollerStateRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly schedulerConfig: SchedulerConfig,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly eventService: EventService,
	) {
		if (this.schedulerConfig.durableCursorsEnabled && !this.schedulerChainEnabled) {
			this.logger.warn(
				'N8N_POLLER_DURABLE_CURSORS_ENABLED requires N8N_SCHEDULER_ENABLED, N8N_SCHEDULER_POLL_TRIGGERS_ENABLED and N8N_USE_WORKFLOW_PUBLICATION_SERVICE; durable poll cursors stay disabled.',
			);
		}
	}

	/**
	 * Cursors additionally require the publication service because cursor rows
	 * are only healthy where activation heals node ids — legacy activation must
	 * never create them.
	 */
	private get schedulerChainEnabled(): boolean {
		return isDurablePollerChainEnabled(this.schedulerConfig, this.workflowsConfig);
	}

	/**
	 * Runs a cursor commit and emits its outcome and latency as a metrics event.
	 * `commit` reports whether the cursor advanced, so a write the lease fence
	 * rejected is counted apart from one that failed outright.
	 */
	private async measureCommit<T>(
		operation: PollCursorCommitOperation,
		commit: () => Promise<{ value: T; advanced: boolean }>,
	): Promise<T> {
		const startedAt = performance.now();
		const emitSettled = (result: PollCursorCommitResult) => {
			try {
				this.eventService.emit('poll-cursor-commit-settled', {
					operation,
					result,
					durationMs: performance.now() - startedAt,
				});
			} catch {
				// Deliberately swallowed: a metrics sink must not fail a commit.
			}
		};

		try {
			const { value, advanced } = await commit();
			emitSettled(advanced ? 'success' : 'fence_rejected');
			return value;
		} catch (error) {
			emitSettled('failure');
			throw error;
		}
	}

	get enabled(): boolean {
		return this.schedulerConfig.durableCursorsEnabled && this.schedulerChainEnabled;
	}

	/**
	 * Decides whether this node should use the new cursor storage.
	 *
	 * A node that already has a stored cursor keeps using it, no matter what the setting says.
	 *
	 * Otherwise:
	 * - if the setting is on, a cursor is created from `nodeStaticData` and used from now on.
	 * - if the setting is off, nothing changes.
	 *
	 * @param workflowId - Workflow the poll node belongs to.
	 * @param nodeId - Poll trigger node to resolve the cursor for.
	 * @param nodeStaticData - Node's current cursor value, used to seed the new
	 *   storage the first time this node migrates.
	 * @param prefetchedCursor - Cursor the task handler already read at the start
	 *   of the tick. When present, it is returned as-is and the row is not read
	 *   again. When absent, the read-or-insert path runs as before: nothing was
	 *   prefetched, or the row does not exist yet.
	 * @returns The cursor to use if this node is on the new storage, otherwise
	 *   `{ migrated: false }` to keep using the node's own static data.
	 */
	async resolveCursor(
		workflowId: string,
		nodeId: string,
		nodeStaticData: PollCursor,
		prefetchedCursor?: PollerCursor,
	): Promise<{ migrated: true; cursor: PollCursor } | { migrated: false }> {
		if (!this.enabled) {
			const existing = await this.pollerStateRepository.findCursor(workflowId, nodeId);
			if (existing === null) {
				return { migrated: false };
			}
			return { migrated: true, cursor: toPollCursor(existing) };
		}

		if (prefetchedCursor !== undefined) {
			return { migrated: true, cursor: toPollCursor(prefetchedCursor) };
		}

		const stored = await this.transactionRunner.run(
			{},
			async (ctx) =>
				await this.pollerStateRepository.getOrCreateCursor(workflowId, nodeId, nodeStaticData, ctx),
		);
		return { migrated: true, cursor: toPollCursor(stored) };
	}

	/**
	 * Advances the cursor and inserts the execution row for the poll, together.
	 *
	 * When the setting is on, both happen in one transaction: a poll never
	 * 	advances its cursor past an item whose execution wasn't saved.
	 *
	 * When the setting is off, they happen as two separate steps instead, so a crash
	 * 	between them can leave the cursor moved with no matching execution. This
	 * 	gap only exists to let the setting double as a kill switch.
	 *
	 * @param args.workflowId - Workflow the poll node belongs to.
	 * @param args.nodeId - Poll trigger node whose cursor is advancing.
	 * @param args.cursor - New cursor value to store.
	 * @param args.payload - Execution row to insert for the poll's result.
	 * @param args.fence - Lease to check before writing; see `advanceCursor`.
	 * @returns The new execution's id, or `null` if the cursor didn't advance.
	 * @remarks A `null` result doesn't mean someone else already did this work, only that someone else now owns it.
	 */
	async commitWithExecution(args: {
		workflowId: string;
		nodeId: string;
		cursor: PollCursor;
		payload: CreateExecutionPayload;
		fence?: PollLeaseFence;
	}): Promise<{ executionId: string } | null> {
		const { workflowId, nodeId, cursor, payload, fence } = args;

		return await this.measureCommit('with_execution', async () => {
			if (this.enabled) {
				return await this.transactionRunner.run({}, async (ctx) => {
					const advanced = await this.pollerStateRepository.advanceCursor(
						workflowId,
						nodeId,
						cursor,
						ctx,
						fence,
					);
					if (advanced) {
						const executionId = await this.executionPersistence.create(payload, ctx);
						return { value: { executionId }, advanced };
					}
					return { value: null, advanced };
				});
			}

			const advanced = await this.pollerStateRepository.advanceCursor(
				workflowId,
				nodeId,
				cursor,
				{},
				fence,
			);
			if (advanced) {
				const executionId = await this.executionPersistence.create(payload, {});
				return { value: { executionId }, advanced };
			}
			return { value: null, advanced };
		});
	}

	/**
	 * Commits an advance made by a poll that emitted no items, so a source that only
	 * ever moves the cursor is not re-fetched forever.
	 */
	async commitCursorOnly(args: {
		workflowId: string;
		nodeId: string;
		cursor: PollCursor;
		fence?: PollLeaseFence;
	}): Promise<boolean> {
		const { workflowId, nodeId, cursor, fence } = args;
		return await this.measureCommit('cursor_only', async () => {
			const advanced = await this.pollerStateRepository.advanceCursor(
				workflowId,
				nodeId,
				cursor,
				{},
				fence,
			);
			return { value: advanced, advanced };
		});
	}
}
