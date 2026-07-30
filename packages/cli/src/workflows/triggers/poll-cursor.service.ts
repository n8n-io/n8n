import { SchedulerConfig, WorkflowsConfig } from '@n8n/config';
import type { CreateExecutionPayload, OperationContext } from '@n8n/db';
import { PollerStateRepository, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type {
	IDataObject,
	INode,
	IWorkflowExecutionDataProcess,
	StagedPollCursor,
	Workflow,
} from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { isPollSchedulingActive } from '@/scheduling/poll-trigger-node/poll-job-provider';
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
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly errorReporter: ErrorReporter,
	) {}

	/**
	 * Only scheduler-dispatched polls read a cursor, so the setting is worth nothing on
	 * its own: the in-process poller builds its context by a different route and would
	 * otherwise take the durable branch with no row to advance. Polls are
	 * scheduler-dispatched only once {@link PollJobProvider}'s own criteria is met, so
	 * this reuses that same check rather than re-deriving it.
	 */
	get enabled(): boolean {
		return (
			isPollSchedulingActive(this.schedulerConfig, this.workflowsConfig) &&
			this.schedulerConfig.durablePollCursors
		);
	}

	/**
	 * The node's cursor, or `undefined` if it has never polled.
	 *
	 * A node with no row is migrated on the spot from whatever its static data holds, so
	 * there is no backfill job: a poller carries its own state forward the first time it
	 * runs under this setting.
	 *
	 * A row is created even with nothing to seed from, so a cursor advance always has a
	 * row to update. `undefined` still comes back in that case, and keeps coming back on
	 * every later read until something actually advances the cursor (a seed from static
	 * data counts, since it lands as a real value on creation) — several poll nodes treat
	 * a missing cursor as "first run" and behave differently from one that has run and
	 * found nothing, and that distinction has to survive more than one read of the row.
	 */
	async readCursor(workflow: Workflow, node: INode): Promise<StagedPollCursor | undefined> {
		const stored = await this.pollerStateRepository.findCursor(workflow.id, node.id);
		if (stored !== null) return this.asStagedCursor(stored as StagedPollCursor);

		const seed = this.readStaticDataCursor(workflow, node);
		const created = await this.pollerStateRepository.ensureCursor(
			workflow.id,
			node.id,
			seed ?? {},
			{},
		);
		return this.asStagedCursor(created as StagedPollCursor);
	}

	/**
	 * `undefined` when the row has never been advanced and holds nothing worth calling a
	 * cursor: version 0 (never advanced) and an empty object (nothing seeded either).
	 * Anything else — including another process's seed or advance landing first — is a
	 * real cursor, even if it happens to be `{}` once something has actually advanced it.
	 */
	private asStagedCursor(versioned: StagedPollCursor): StagedPollCursor | undefined {
		const neverAdvanced = versioned.version === 0 && Object.keys(versioned.cursor).length === 0;
		return neverAdvanced ? undefined : versioned;
	}

	/**
	 * Commit the execution a poll produced together with the cursor it staged, then mirror
	 * the cursor back to static data.
	 *
	 * The two writes share one transaction, so a crash can no longer leave the cursor
	 * advanced past data that was never handed to an execution, nor an execution holding
	 * data the cursor will hand out again. The advance is conditioned on `staged.version`,
	 * so a poll of the same node that committed first rolls this one back instead of
	 * silently overwriting it.
	 */
	async commitPoll(
		workflow: Workflow,
		node: INode,
		runData: IWorkflowExecutionDataProcess,
		staged: StagedPollCursor | undefined,
	): Promise<string> {
		const payload = this.buildExecutionPayload(runData);

		const executionId = await this.transactionRunner.run({}, async (ctx: OperationContext) => {
			// The cursor advance runs first: it is a cheap DB write and the one expected to
			// fail (a stale version, or the row gone). `create` can write its data bundle to
			// a blob store outside `db` mode, which a rollback cannot undo — running it last
			// means that write only happens once the cheap, likelier failure has already
			// cleared.
			if (staged !== undefined) {
				await this.pollerStateRepository.advanceCursor(
					workflow.id,
					node.id,
					staged.cursor,
					staged.version,
					ctx,
				);
			}
			return await this.executionPersistence.create(payload, ctx);
		});

		if (staged !== undefined) await this.mirrorToStaticData(workflow, node, staged.cursor);

		return executionId;
	}

	/**
	 * Commit a cursor that moved without producing any items.
	 *
	 * A poll that found nothing but consumed part of its window still made progress;
	 * skipping the commit would make the next poll re-read that window again.
	 */
	async commitEmptyPoll(workflow: Workflow, node: INode, staged: StagedPollCursor): Promise<void> {
		await this.pollerStateRepository.advanceCursor(
			workflow.id,
			node.id,
			staged.cursor,
			staged.version,
			{},
		);
		await this.mirrorToStaticData(workflow, node, staged.cursor);
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
	 * Merges onto the node's own in-memory static data rather than replacing its entry
	 * outright, so a node that also calls `getWorkflowStaticData('node')` in the same poll
	 * keeps whatever it wrote there instead of losing it to the cursor.
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
			const nodeStaticData = workflow.getStaticData('node', node);
			await this.workflowStaticDataService.mergeNodeStaticData(workflow.id, node.name, {
				...nodeStaticData,
				...cursor,
			});
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
