import type { INode, TriggerTime } from 'n8n-workflow';

/**
 * Provisions a poll trigger as durable scheduler jobs instead of an in-memory
 * cron. Optional: when unbound, or when {@link isActive} returns false, callers
 * use the legacy in-memory path. Covers activation only; teardown is a separate
 * concern, since durable rows outlive any one instance's in-memory triggers.
 */
export abstract class PollJobManager {
	/** Whether to provision durable jobs instead of registering in-memory crons. */
	abstract isActive(): boolean;

	/**
	 * Provision durable jobs for the node's poll times. Takes the structured
	 * `pollTimes` rather than cron strings so a definition-stable job identity can
	 * be derived. Returns whether a job was newly inserted (rather than reconciled),
	 * so the caller runs the inline first poll only for a fresh provision.
	 */
	abstract register(
		workflowId: string,
		node: INode,
		pollTimes: TriggerTime[],
		timezone: string,
	): Promise<{ inserted: boolean }>;
}
