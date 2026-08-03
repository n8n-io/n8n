import type { GraphEdge } from '../graph';
import type { StepMessage, WorkQueue } from '../queue';
import type { ExecutionRecord } from './execution-store';
import type { SettledStep, StepStore } from './step-store';

/**
 * Plans the consequences of a node settling: follows every edge leaving it —
 * live or dead — queues the successors that have data, and records the ones
 * that don't as `skipped`.
 *
 * Deadness is explicit rather than inferred: a successor is decided only once
 * every predecessor has settled, so an absent step row always means "not yet",
 * never "never", and readiness stays decidable from the step rows alone.
 */
export class StepPlanner {
	constructor(
		private readonly stepStore: StepStore,
		private readonly stepQueue: WorkQueue<StepMessage>,
	) {}

	/**
	 * Settles everything downstream of `settledNodeId` that is decidable now,
	 * returning how many steps were queued. A skipped step never runs, so no
	 * event will follow it — its successors are decided here too, transitively.
	 */
	async settleSuccessors(execution: ExecutionRecord, settledNodeId: string): Promise<number> {
		let queued = 0;

		// Worklist of nodes settled without running. Only rows this planner
		// created are followed — a row lost to the unique key belongs to whichever
		// planner created it, announcement and propagation included.
		let settled = [settledNodeId];
		while (settled.length > 0) {
			const round = await this.settleRound(execution, settled);
			queued += round.queued;
			settled = round.skippedNodeIds;
		}

		return queued;
	}

	private async settleRound(
		execution: ExecutionRecord,
		settledNodeIds: string[],
	): Promise<{ queued: number; skippedNodeIds: string[] }> {
		const decidable = await this.decidableSuccessors(execution, settledNodeIds);
		if (decidable.length === 0) return { queued: 0, skippedNodeIds: [] };

		// One insert for the round, published only after the rows exist, so a
		// consumer can always load the step.
		const created = await this.stepStore.createSteps(
			decidable.map(({ nodeId, live }) => ({
				executionId: execution.id,
				nodeId,
				status: live ? ('queued' as const) : ('skipped' as const),
			})),
		);

		const liveNodeIds = new Set(decidable.filter(({ live }) => live).map(({ nodeId }) => nodeId));
		const queuedSteps = created.filter(({ nodeId }) => liveNodeIds.has(nodeId));
		for (const { id: stepId } of queuedSteps) {
			await this.stepQueue.publish({ type: 'step:ready', executionId: execution.id, stepId });
		}

		return {
			queued: queuedSteps.length,
			skippedNodeIds: created
				.filter(({ nodeId }) => !liveNodeIds.has(nodeId))
				.map(({ nodeId }) => nodeId),
		};
	}

	/**
	 * Successors of the given nodes whose every predecessor has settled, each
	 * marked live — at least one incoming edge carries data — or not. An `if` or
	 * `switch` selects by what it leaves dead: an unfilled output slot kills the
	 * edges leaving it, and a successor with nothing live left is skipped.
	 */
	private async decidableSuccessors(
		execution: ExecutionRecord,
		settledNodeIds: string[],
	): Promise<Array<{ nodeId: string; live: boolean }>> {
		const settledSet = new Set(settledNodeIds);
		// TODO(CAT-2875): a back-edge closes a loop, so it must not hold its
		// target's readiness hostage to a node that runs after it.
		const edges = execution.graph.edges.filter((edge) => !edge.isBackEdge);

		const candidates = [
			...new Set(edges.filter((edge) => settledSet.has(edge.from)).map((edge) => edge.to)),
		].map((nodeId) => ({ nodeId, incoming: edges.filter((edge) => edge.to === nodeId) }));

		// One query covering every predecessor in play; readiness and liveness are
		// then set membership, so a fan-out costs a single round trip.
		const settled = await this.stepStore.loadSettledSteps(execution.id, [
			...new Set(candidates.flatMap(({ incoming }) => incoming.map(({ from }) => from))),
		]);
		const byNodeId = new Map(settled.map((step) => [step.nodeId, step]));

		return candidates
			.filter(({ incoming }) => incoming.every(({ from }) => byNodeId.has(from)))
			.map(({ nodeId, incoming }) => ({
				nodeId,
				live: incoming.some((edge) => carriesData(byNodeId.get(edge.from), edge)),
			}));
	}
}

/** Whether data flows along `edge`: its source completed, filling the slot the edge leaves. */
function carriesData(source: SettledStep | undefined, edge: GraphEdge): boolean {
	return source?.status === 'completed' && source.filledOutputSlots.includes(edge.outputIndex);
}
