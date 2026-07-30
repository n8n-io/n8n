import { Logger } from '@n8n/backend-common';
import { PollerConfig } from '@n8n/config';
import type { CreateExecutionPayload, OperationContext, PollerCursor } from '@n8n/db';
import { PollerStateRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IDataObject, PollCursor } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

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

	async readCursor(
		workflowId: string,
		nodeId: string,
		nodeStaticData: PollCursor,
	): Promise<PollCursor | null> {
		const stored = await this.transactionRunner.run(
			{},
			async (ctx) =>
				await this.pollerStateRepository.ensureCursor(
					workflowId,
					nodeId,
					nodeStaticData as PollerCursor,
					ctx,
				),
		);

		const cursor = stored as PollCursor;

		this.syncNodeStaticData(nodeStaticData, cursor, {});

		return Object.keys(cursor).length === 0 ? null : cursor;
	}

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

	async commitCursorOnly(workflowId: string, nodeId: string, cursor: PollCursor): Promise<void> {
		await this.transactionRunner.run({}, async (ctx) => {
			await this.stageCursor(workflowId, nodeId, cursor, ctx);
		});
	}

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
		return typeof value === 'object' && value !== null && !Array.isArray(value)
			? { ...value }
			: {};
	}

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

	private async stageCursor(
		workflowId: string,
		nodeId: string,
		cursor: PollCursor,
		ctx: OperationContext,
	): Promise<PollCursor> {
		const previousCursor = await this.pollerStateRepository.ensureCursor(
			workflowId,
			nodeId,
			cursor as PollerCursor,
			ctx,
		);
		await this.pollerStateRepository.advanceCursor(workflowId, nodeId, cursor as PollerCursor, ctx);
		return previousCursor as PollCursor;
	}
}
