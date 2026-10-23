import type { EvalLogger } from './logger';
import type { N8nClient } from '../clients/n8n-client';
import type { SeedRecordedRun } from '../types';

export interface RecordedRunsOptions {
	client: N8nClient;
	threadId: string;
	recordedRuns: SeedRecordedRun[];
	/** Authored seed id → the restored workflow, as `seedWorkflowsBySeedId` holds it. */
	seedWorkflows: Map<string, { id: string; name: string }>;
	logger: EvalLogger;
	laneTag?: string;
}

/**
 * Restore recorded failed runs BEFORE the graded turn, in declared order, so the
 * instance holds the exact execution history the case was authored against.
 *
 * Unlike `executePriorRuns`, nothing runs and nothing is retried: a restore either
 * writes the recorded run or throws. The caller treats a throw as a seeding fault.
 */
export async function restoreRecordedRuns(options: RecordedRunsOptions): Promise<string[]> {
	const { client, threadId, recordedRuns, seedWorkflows, logger, laneTag } = options;
	const executionIds: string[] = [];

	for (const run of recordedRuns) {
		const restored = seedWorkflows.get(run.workflow);
		if (!restored) {
			throw new Error(
				`Recorded run names seed workflow id "${run.workflow}", which the seed did not create. Created: ${[...seedWorkflows.keys()].join(', ') || '(none)'}`,
			);
		}
		const label = `${restored.name} (${run.workflow})`;
		let executionId: string;
		try {
			({ executionId } = await client.restoreExecution(threadId, restored.id, run.envelope));
		} catch (error: unknown) {
			throw new Error(
				`Recorded run "${label}" (source execution ${run.envelope.source.executionId}): ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		executionIds.push(executionId);
		logger.info(
			`  Recorded run "${label}": restored as execution ${executionId} (${run.envelope.execution.status})${laneTag ?? ''}`,
		);
	}

	return executionIds;
}
