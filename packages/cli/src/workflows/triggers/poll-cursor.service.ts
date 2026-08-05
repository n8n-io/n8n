import { PollerConfig } from '@n8n/config';
import type { CreateExecutionPayload, PollerCursor, PollLeaseFence } from '@n8n/db';
import { PollerStateRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import type { PollCursor } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';

/** Narrows a stored cursor, which the persistence layer types more loosely. */
const toPollCursor = (cursor: PollerCursor): PollCursor => cursor as PollCursor;

@Service()
export class PollCursorService {
	constructor(
		private readonly pollerStateRepository: PollerStateRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly pollerConfig: PollerConfig,
	) {}

	get enabled(): boolean {
		return this.pollerConfig.durableCursorsEnabled;
	}

	/**
	 * A node with a stored row is migrated for good; an unmigrated node checks the
	 * flag, so disabling it blocks new migrations without affecting nodes that
	 * already migrated. Seeds the row from the node's static data on first
	 * migration, so it resumes where it left off.
	 */
	async resolveCursor(
		workflowId: string,
		nodeId: string,
		nodeStaticData: PollCursor,
	): Promise<{ migrated: true; cursor: PollCursor } | { migrated: false }> {
		if (!this.enabled) {
			const existing = await this.pollerStateRepository.findCursor(workflowId, nodeId);
			if (existing === null) return { migrated: false };
			return { migrated: true, cursor: toPollCursor(existing) };
		}

		const stored = await this.transactionRunner.run(
			{},
			async (ctx) =>
				await this.pollerStateRepository.getOrCreateCursor(workflowId, nodeId, nodeStaticData, ctx),
		);
		return { migrated: true, cursor: toPollCursor(stored) };
	}

	/**
	 * Commits the cursor advance and the execution row together, so a poll never
	 * advances past items no execution carried. Atomic when the flag is on; written
	 * as two sequential steps when it's off, reopening the race as the cost of
	 * keeping the flag as a kill switch.
	 */
	async commitWithExecution(args: {
		workflowId: string;
		nodeId: string;
		cursor: PollCursor;
		payload: CreateExecutionPayload;
		fence?: PollLeaseFence;
	}): Promise<{ executionId: string } | null> {
		const { workflowId, nodeId, cursor, payload, fence } = args;

		if (this.enabled) {
			return await this.transactionRunner.run({}, async (ctx) => {
				const advanced = await this.pollerStateRepository.advanceCursor(
					workflowId,
					nodeId,
					cursor,
					ctx,
					fence,
				);
				if (!advanced) return null;
				const executionId = await this.executionPersistence.create(payload, ctx);
				return { executionId };
			});
		}

		const advanced = await this.pollerStateRepository.advanceCursor(
			workflowId,
			nodeId,
			cursor,
			{},
			fence,
		);
		if (!advanced) return null;
		const executionId = await this.executionPersistence.create(payload, {});
		return { executionId };
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
		return await this.pollerStateRepository.advanceCursor(workflowId, nodeId, cursor, {}, fence);
	}
}
