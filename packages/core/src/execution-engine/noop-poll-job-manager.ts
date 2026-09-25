import type { INode, TriggerTime } from 'n8n-workflow';

import { PollJobManager } from './poll-job-manager';

/**
 * Null-object {@link PollJobManager}, bound when the durable path is
 * disabled. Distinguishing an instance of this class is how callers detect
 * "not active" without re-deriving that decision themselves; see
 * {@link PollJobManager}.
 */
export class NoOpPollJobManager extends PollJobManager {
	async register(
		_workflowId: string,
		_node: INode,
		_pollTimes: TriggerTime[],
		_timezone: string,
	): Promise<{ inserted: boolean }> {
		return await Promise.resolve({ inserted: false });
	}

	async remove(_workflowId: string, _nodeId: string): Promise<void> {
		await Promise.resolve();
	}
}
