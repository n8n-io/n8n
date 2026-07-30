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
		seed: PollCursor,
	): Promise<PollCursor | null> {
		const stored = await this.transactionRunner.run(
			{},
			async (ctx) =>
				await this.pollerStateRepository.ensureCursor(
					workflowId,
					nodeId,
					seed as PollerCursor,
					ctx,
				),
		);

		const cursor = stored as PollCursor;
		return Object.keys(cursor).length === 0 ? null : cursor;
	}

	async commitWithExecution(args: {
		workflowId: string;
		nodeId: string;
		cursor: PollCursor;
		payload: CreateExecutionPayload;
	}): Promise<string> {
		const { workflowId, nodeId, cursor, payload } = args;

		return await this.transactionRunner.run({}, async (ctx) => {
			await this.stageCursor(workflowId, nodeId, cursor, ctx);
			return await this.executionPersistence.create(payload, ctx);
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
	): Promise<void> {
		try {
			const staticData = await this.workflowStaticDataService.getStaticDataById(workflowId);
			const updated: IDataObject = { ...staticData, [`node:${nodeName}`]: cursor };
			await this.workflowStaticDataService.saveStaticDataById(workflowId, updated);
		} catch (error) {
			this.errorReporter.error(error, { extra: { workflowId, nodeName } });
			this.logger.error(
				`Failed to mirror the poll cursor of node "${nodeName}" to workflow static data`,
				{ workflowId, nodeName },
			);
		}
	}

	private async stageCursor(
		workflowId: string,
		nodeId: string,
		cursor: PollCursor,
		ctx: OperationContext,
	): Promise<void> {
		await this.pollerStateRepository.ensureCursor(workflowId, nodeId, cursor as PollerCursor, ctx);
		await this.pollerStateRepository.advanceCursor(workflowId, nodeId, cursor as PollerCursor, ctx);
	}
}
