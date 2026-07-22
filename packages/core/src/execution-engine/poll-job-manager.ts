import type { CronExpression, INode } from 'n8n-workflow';

/**
 * Seam for provisioning poll triggers as durable scheduler jobs instead of
 * in-memory crons. The concrete implementation lives in `cli` and is bound at
 * startup; with no binding (core-only contexts, tests) `ActiveWorkflowTriggers`
 * falls through to the legacy `ScheduledTaskManager`. `isActive()` gates the seam,
 * so a bound-but-inactive implementation also uses the legacy path.
 *
 * Only activation lives here. Durable rows are DB state tied to the workflow's
 * published version, not to any one instance's in-memory triggers, so teardown is
 * driven from the cli lifecycle (deactivate/delete/republish), not this seam.
 */
export abstract class PollJobManager {
	/** Whether durable poll jobs should be used instead of in-memory crons. */
	abstract isActive(): boolean;

	/** Provision a durable poll job for the node's mapped cron expressions. */
	abstract register(
		workflowId: string,
		node: INode,
		cronExpressions: CronExpression[],
		timezone: string,
	): Promise<void>;
}
