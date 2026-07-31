import { Logger } from '@n8n/backend-common';
import { PollerConfig } from '@n8n/config';
import type { CreateExecutionPayload, OperationContext, PollerCursor } from '@n8n/db';
import { PollerStateRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IDataObject, PollCursor } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

/** Narrows a stored cursor, which the persistence layer types more loosely. */
const toPollCursor = (cursor: PollerCursor): PollCursor => cursor as PollCursor;

@Service()
export class PollCursorService {
	constructor(
		private readonly pollerStateRepository: PollerStateRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly pollerConfig: PollerConfig,
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {}

	get enabled(): boolean {
		return this.pollerConfig.durableCursorsEnabled;
	}

	/**
	 * Seeds the cursor from the node's static data the first time, so a node that
	 * polled before durable cursors were enabled resumes where it left off. Returns
	 * `null` when the node has no cursor (stored internally as an empty one).
	 */
	async readCursor(
		workflowId: string,
		nodeId: string,
		nodeStaticData: PollCursor,
	): Promise<PollCursor | null> {
		const stored = await this.transactionRunner.run(
			{},
			async (ctx) =>
				await this.pollerStateRepository.ensureCursor(workflowId, nodeId, nodeStaticData, ctx),
		);

		const cursor = toPollCursor(stored);

		this.syncNodeStaticData(nodeStaticData, cursor, {});

		return Object.keys(cursor).length === 0 ? null : cursor;
	}

	/**
	 * Commits the cursor advance and the execution row in one transaction, so a poll
	 * never advances past items no execution carried. The transaction opens once
	 * `poll()` has returned, so it is never held across the polled source's I/O.
	 * Returns the cursor the advance replaced.
	 */
	async commitWithExecution(args: {
		workflowId: string;
		nodeId: string;
		cursor: PollCursor;
		payload: CreateExecutionPayload;
	}): Promise<{ executionId: string; previousCursor: PollCursor }> {
		const { workflowId, nodeId, cursor, payload } = args;

		return await this.transactionRunner.run({}, async (ctx) => {
			const previousCursor = await this.stageCursor(workflowId, nodeId, cursor, ctx);
			const executionId = await this.executionPersistence.create(payload, ctx);
			return { executionId, previousCursor };
		});
	}

	/**
	 * Commits an advance made by a poll that emitted no items, so a source that only
	 * ever moves the cursor is not re-fetched forever.
	 */
	async commitCursorOnly(args: {
		workflowId: string;
		nodeId: string;
		nodeName: string;
		cursor: PollCursor;
		nodeStaticData: PollCursor;
	}): Promise<void> {
		const { workflowId, nodeId, nodeName, cursor, nodeStaticData } = args;

		const previousCursor = await this.transactionRunner.run(
			{},
			async (ctx) => await this.stageCursor(workflowId, nodeId, cursor, ctx),
		);

		await this.mirrorToStaticData(workflowId, nodeName, cursor, nodeStaticData, previousCursor);
	}

	/**
	 * Mirrors a committed cursor into workflow static data, so turning durable cursors
	 * off resumes from the same place. A failure is logged rather than thrown: the
	 * execution is already committed and must still start.
	 */
	async mirrorToStaticData(
		workflowId: string,
		nodeName: string,
		cursor: PollCursor,
		nodeStaticData: PollCursor,
		previousCursor: PollCursor,
	): Promise<void> {
		this.syncNodeStaticData(nodeStaticData, cursor, previousCursor);

		try {
			const staticData = await this.workflowStaticDataService.getStaticDataById(workflowId);
			const nodeKey = `node:${nodeName}`;
			const bucket = this.toBucket(staticData[nodeKey]);

			// Clears only keys the previous cursor owned, so other static data on the
			// node survives a cursor write.
			for (const key of Object.keys(previousCursor)) {
				if (!(key in cursor)) delete bucket[key];
			}

			const updated: IDataObject = { ...staticData, [nodeKey]: { ...bucket, ...cursor } };
			await this.workflowStaticDataService.saveStaticDataById(workflowId, updated);
		} catch (error) {
			this.errorReporter.error(error, { extra: { workflowId, nodeName } });
			this.logger.error(
				`Failed to mirror the poll cursor of node "${nodeName}" to workflow static data`,
				{ workflowId, nodeName },
			);
		}
	}

	private toBucket(value: IDataObject[string]): PollCursor {
		return typeof value === 'object' && value !== null && !Array.isArray(value) ? { ...value } : {};
	}

	/**
	 * Brings the node's live static data in line with the cursor, so that a whole-blob
	 * save by any other node in the workflow writes the current cursor back, not a
	 * stale one.
	 */
	private syncNodeStaticData(
		nodeStaticData: PollCursor,
		cursor: PollCursor,
		previousCursor: PollCursor,
	): void {
		for (const key of Object.keys(previousCursor)) {
			if (!(key in cursor) && key in nodeStaticData) delete nodeStaticData[key];
		}

		for (const [key, value] of Object.entries(cursor)) {
			if (nodeStaticData[key] !== value) nodeStaticData[key] = value;
		}
	}

	/**
	 * Advances the node's stored cursor and returns the one it replaced, so a caller
	 * knows which keys this cursor drops. Ensures the row first, since a node can
	 * stage a cursor without ever having read one and `advanceCursor` needs a row
	 * to match.
	 */
	private async stageCursor(
		workflowId: string,
		nodeId: string,
		cursor: PollCursor,
		ctx: OperationContext,
	): Promise<PollCursor> {
		const previousCursor = await this.pollerStateRepository.ensureCursor(
			workflowId,
			nodeId,
			cursor,
			ctx,
		);
		await this.pollerStateRepository.advanceCursor(workflowId, nodeId, cursor, ctx);
		return toPollCursor(previousCursor);
	}
}
