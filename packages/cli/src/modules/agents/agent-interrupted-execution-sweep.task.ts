import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskTarget, SystemTaskSchedule } from '@n8n/decorators';

import { AgentInterruptedExecutionSweeper } from './agent-interrupted-execution-sweeper';

/**
 * Marks agent executions that lost their process as interrupted and settles
 * the background job rows and pending results that depended on them.
 */
@SystemTask()
export class AgentInterruptedExecutionSweepTask implements SystemTask {
	readonly name = 'agent-interrupted-execution-sweep';

	readonly schedule: SystemTaskSchedule = intervalFromSeconds(
		AgentInterruptedExecutionSweeper.LIVENESS_GRACE_SECONDS,
	);

	readonly target = {
		scope: 'cluster',
		scheduler: { maxAttempts: 3 },
		leaderTimer: { runOnTakeover: true },
	} satisfies SystemTaskTarget;

	constructor(private readonly sweeper: AgentInterruptedExecutionSweeper) {}

	async run(signal: AbortSignal): Promise<void> {
		await this.sweeper.sweep(signal);
	}
}
