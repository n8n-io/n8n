import { SchedulerConfig } from '@n8n/config';
import type { CreateExecutionPayload, OperationContext } from '@n8n/db';
import { PollerStateRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IDataObject, INode, IWorkflowExecutionDataProcess, Workflow } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

/**
 * Owns a poll node's cursor while the durable-cursor setting is on: where it is read
 * from, and how it is committed alongside the execution a poll produced.
 */
@Service()
export class PollCursorService {
	constructor(
		private readonly pollerStateRepository: PollerStateRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly transactionRunner: TransactionRunner,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly schedulerConfig: SchedulerConfig,
		private readonly errorReporter: ErrorReporter,
	) {}

	/**
	 * Only scheduler-dispatched polls read a cursor, so the setting is worth nothing on
	 * its own: the in-process poller builds its context by a different route and would
	 * otherwise take the durable branch with no row to advance.
	 */
	get enabled(): boolean {
		const { enabled, enabledForPollTriggers, durablePollCursors } = this.schedulerConfig;
		return enabled && enabledForPollTriggers && durablePollCursors;
	}

	/**
	 * The node's cursor, or `undefined` if it has never polled.
	 *
	 * A node with no row is migrated on the spot from whatever its static data holds, so
	 * there is no backfill job: a poller carries its own state forward the first time it
	 * runs under this setting.
	 *
	 * A row is created even with nothing to seed from, so a cursor advance always has a
	 * row to update. `undefined` still comes back in that case, because several poll
	 * nodes treat a missing cursor as "first run" and behave differently from one that has
	 * run and found nothing.
	 */
	async readCursor(workflow: Workflow, node: INode): Promise<IDataObject | undefined> {
		const stored = await this.pollerStateRepository.findCursor(workflow.id, node.id);
		if (stored !== null) return stored as IDataObject;

		const seed = this.readStaticDataCursor(workflow, node);
		const created = (await this.pollerStateRepository.ensureCursor(
			workflow.id,
			node.id,
			seed ?? {},
			{},
		)) as IDataObject;

		// A non-empty row here means another process seeded it first; its cursor wins over
		// this one's "never polled" reading.
		if (seed === undefined && Object.keys(created).length === 0) return undefined;
		return created;
	}

	/**
	 * Commit the execution a poll produced together with the cursor it staged, then mirror
	 * the cursor back to static data.
	 *
	 * The two writes share one transaction, so a crash can no longer leave the cursor
	 * advanced past data that was never handed to an execution, nor an execution holding
	 * data the cursor will hand out again.
	 */
	async commitPoll(
		workflow: Workflow,
		node: INode,
		runData: IWorkflowExecutionDataProcess,
		stagedCursor: IDataObject | undefined,
	): Promise<string> {
		const payload = this.buildExecutionPayload(runData);

		const executionId = await this.transactionRunner.run({}, async (ctx: OperationContext) => {
			const id = await this.executionPersistence.create(payload, ctx);
			if (stagedCursor !== undefined) {
				await this.pollerStateRepository.advanceCursor(workflow.id, node.id, stagedCursor, ctx);
			}
			return id;
		});

		if (stagedCursor !== undefined) await this.mirrorToStaticData(workflow, node, stagedCursor);

		return executionId;
	}

	/**
	 * Commit a cursor that moved without producing any items.
	 *
	 * A poll that found nothing but consumed part of its window still made progress;
	 * skipping the commit would make the next poll re-read that window again.
	 */
	async commitEmptyPoll(workflow: Workflow, node: INode, stagedCursor: IDataObject): Promise<void> {
		await this.pollerStateRepository.advanceCursor(workflow.id, node.id, stagedCursor, {});
		await this.mirrorToStaticData(workflow, node, stagedCursor);
	}

	/**
	 * The cursor a node kept in static data before it had a row.
	 *
	 * An empty object reads as "nothing to migrate" rather than as an empty cursor, since
	 * the node's static data is created on access whether or not it was ever written to.
	 */
	private readStaticDataCursor(workflow: Workflow, node: INode): IDataObject | undefined {
		const staticData = workflow.getStaticData('node', node);
		return Object.keys(staticData).length === 0 ? undefined : { ...staticData };
	}

	/**
	 * Keep static data current so turning the setting back off resumes from this cursor
	 * rather than from wherever the node had reached before it was turned on.
	 *
	 * Failures are reported and swallowed. The cursor is already committed by the time
	 * this runs, and the execution it committed with has not been started yet, so letting
	 * this throw would strand that execution to keep a copy that only matters if the
	 * setting is later turned off.
	 */
	private async mirrorToStaticData(
		workflow: Workflow,
		node: INode,
		cursor: IDataObject,
	): Promise<void> {
		try {
			await this.workflowStaticDataService.mergeNodeStaticData(workflow.id, node.name, cursor);
		} catch (error) {
			this.errorReporter.error(error, {
				extra: { workflowId: workflow.id, nodeId: node.id },
			});
		}
	}

	private buildExecutionPayload(runData: IWorkflowExecutionDataProcess): CreateExecutionPayload {
		const { workflowData } = runData;

		return {
			data: runData.executionData!,
			mode: runData.executionMode,
			finished: false,
			workflowData,
			// Inserted at `new` and started only once the transaction has committed, so an
			// execution never exists for a cursor advance that was rolled back.
			status: 'new',
			workflowId: workflowData.id,
			retryOf: runData.retryOf ?? undefined,
			tracingContext: runData.tracingContext ?? null,
			deduplicationKey: runData.deduplicationKey,
		};
	}
}
