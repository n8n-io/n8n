import type { InstanceType } from '@n8n/constants';

/**
 * Where a task's occurrences run, and what drives them there.
 *
 * A cluster-scoped task runs once for the whole cluster, on a main, so it
 * names no instance type. It states how the cluster coordinates that one run:
 * the leader-gated in-memory timer, or the durable scheduler. An
 * instance-scoped task runs its own occurrence in every instance of the kinds
 * it names, with no coordination, so it has to name at least one kind and
 * cannot be durable or run on takeover.
 */
export type SystemTaskPlacement =
	| {
			readonly scope: 'cluster';
			/**
			 * Migration status.
			 * - `false` runs on the leader-gated in-memory timer
			 * - `true` runs on the durable scheduler when the instance flag is on.
			 * @remarks Temporary, removed once every task is durable.
			 */
			readonly durable: boolean;
			/**
			 * Runs one occurrence as soon as this instance becomes the leader,
			 * including at startup for an instance that is already the leader, on
			 * top of the scheduled occurrences. In-memory timers only: ignored for a
			 * durable run.
			 */
			readonly runOnTakeover?: boolean;
	  }
	| {
			readonly scope: 'instance';
			readonly instanceTypes: readonly [InstanceType, ...InstanceType[]];
	  };
