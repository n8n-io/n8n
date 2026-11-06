import { isRecord } from '@n8n/utils/is-record';

import type { EvalLogger } from './logger';
import type { N8nClient } from '../clients/n8n-client';
import type { SeedRecordedRun } from '../types';

export interface RecordedRunsOptions {
	client: N8nClient;
	threadId: string;
	recordedRuns: SeedRecordedRun[];
	/** Authored seed id → the restored workflow, as `seedWorkflowsBySeedId` holds it. */
	seedWorkflows: Map<string, { id: string; name: string }>;
	/** Authored seed id → the node names that seed workflow declares. */
	seedNodeNames?: Map<string, Set<string>>;
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
	const { client, threadId, recordedRuns, seedWorkflows, seedNodeNames, logger, laneTag } = options;
	const executionIds: string[] = [];

	for (const run of recordedRuns) {
		const restored = seedWorkflows.get(run.workflow);
		if (!restored) {
			throw new Error(
				`Recorded run names seed workflow id "${run.workflow}", which the seed did not create. Created: ${[...seedWorkflows.keys()].join(', ') || '(none)'}`,
			);
		}
		const label = `${restored.name} (${run.workflow})`;
		// A recorded run is only meaningful against the workflow it ran on. Warn, not
		// fail: the agent still gets the run, and the author sees what to re-export.
		const declared = seedNodeNames?.get(run.workflow);
		const missing = declared ? recordedNodeNames(run).filter((name) => !declared.has(name)) : [];
		if (missing.length > 0) {
			logger.warn(
				`  Recorded run "${label}" has node(s) the seed workflow does not: ${missing.join(', ')}. Export the run again after changing the seed workflow.${laneTag ?? ''}`,
			);
		}
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

/** Authored seed workflow id → its node names, for `seedNodeNames`. */
export function seedNodeNamesById(
	workflows: Array<{ id: string; nodes: unknown[] }>,
): Map<string, Set<string>> {
	return new Map(workflows.map((workflow) => [workflow.id, new Set(nodeNames(workflow.nodes))]));
}

/** Node names in the workflow snapshot the run was recorded with. */
function recordedNodeNames(run: SeedRecordedRun): string[] {
	const snapshot = run.envelope.execution.workflowData;
	return isRecord(snapshot) && Array.isArray(snapshot.nodes) ? nodeNames(snapshot.nodes) : [];
}

function nodeNames(nodes: unknown[]): string[] {
	return nodes.flatMap((node) =>
		isRecord(node) && typeof node.name === 'string' ? [node.name] : [],
	);
}
