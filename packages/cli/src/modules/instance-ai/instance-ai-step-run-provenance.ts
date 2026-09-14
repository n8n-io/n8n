import type { IRunExecutionData, ISeededRunData } from 'n8n-workflow';

import type { ExecutionPersistence } from '@/executions/execution-persistence';

/**
 * Records, on the execution itself, which nodes did not run.
 *
 * A step run seeds run data for the nodes above the target, so the engine can
 * start part-way through the workflow. Those nodes then sit in the saved
 * `runData` and read exactly like nodes that ran: the executions list, the
 * canvas and `executions(action="debug")` all show a one-node run as a
 * whole-workflow run. The only other signal is a zeroed `startTime`, which is
 * an accident of how the stubs are built, not a contract.
 *
 * This writes the difference down. It is a post-run update, the same shape
 * `pruneUnreachedVerificationPinData` uses, because the engine rebuilds
 * `startData` for every run and the lifecycle hook rewrites it again before
 * the save.
 */

export function buildSeededRunData(args: {
	mocked: string[];
	replayed: string[];
	replayedFromExecutionId?: string;
}): ISeededRunData | undefined {
	const { mocked, replayed, replayedFromExecutionId } = args;

	// A chain run seeds nothing, so there is nothing to disclose and no reason
	// to spend a write on it.
	if (mocked.length === 0 && replayed.length === 0) return undefined;

	return {
		...(mocked.length > 0 ? { mocked } : {}),
		...(replayed.length > 0 ? { replayed } : {}),
		...(replayed.length > 0 && replayedFromExecutionId ? { replayedFromExecutionId } : {}),
	};
}

export async function recordSeededRunData(args: {
	executionPersistence: ExecutionPersistence;
	executionId: string;
	seededRunData: ISeededRunData | undefined;
}): Promise<void> {
	const { executionPersistence, executionId, seededRunData } = args;
	if (!seededRunData) return;

	const execution = await executionPersistence.findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});
	const executionData = execution?.data;
	if (!executionData) return;

	const nextExecutionData: IRunExecutionData = {
		...executionData,
		startData: {
			...executionData.startData,
			seededRunData,
		},
	};

	await executionPersistence.updateExistingExecution(executionId, {
		data: nextExecutionData,
	});
}
