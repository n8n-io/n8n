import type { INode, TriggerTime } from 'n8n-workflow';

/**
 * Port for provisioning a poll trigger's poll times as scheduler jobs. When
 * unbound or when {@link isActive} returns false, callers fall back to the
 * in-memory cron path. Covers activation only; teardown is separate, since the
 * job rows outlive any one instance's in-memory triggers.
 */
export abstract class PollJobManager {
	/** Whether to provision jobs instead of registering in-memory crons. */
	abstract isActive(): boolean;

	/**
	 * Provision jobs for the node's poll times. The structured `pollTimes` let a
	 * definition-stable job identity be derived, so unchanged times reconcile in
	 * place. Returns whether a job was newly inserted, so the caller runs the
	 * inline first poll only for a fresh provision.
	 */
	abstract register(
		workflowId: string,
		node: INode,
		pollTimes: TriggerTime[],
		timezone: string,
	): Promise<{ inserted: boolean }>;
}
