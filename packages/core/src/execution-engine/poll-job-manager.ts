import type { INode, TriggerTime } from 'n8n-workflow';

/**
 * Port for provisioning a poll trigger's poll times as scheduler jobs. Which
 * implementation is bound (the durable one or {@link NoOpPollJobManager}) is
 * decided once, by whatever wires up DI at boot, from its own config
 * criteria; this class carries no activation logic of its own. Unbound or
 * no-op callers fall back to the in-memory cron path. Covers activation only;
 * teardown is separate, since the job rows outlive any one instance's
 * in-memory triggers.
 */
export abstract class PollJobManager {
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

	/**
	 * Deprovision the node's poll jobs. Used to roll back a {@link register} whose
	 * seeding inline poll then failed, so a failed activation cannot leave a
	 * durable job firing.
	 */
	abstract remove(workflowId: string, nodeId: string): Promise<void>;
}
