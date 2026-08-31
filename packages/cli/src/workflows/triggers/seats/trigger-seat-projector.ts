import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { WorkflowTriggerSeatRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import type { INode } from 'n8n-workflow';
import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	ERROR_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	UnexpectedError,
	Workflow,
} from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { ScheduleTriggerJobRegistrar } from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';

/** Bounds on the per-node `seatCount` parameter, so a typo can't create 10k rows. */
const MAX_SEAT_COUNT = 16;

const TEARDOWN_ACK_POLL_INTERVAL_MS = 500;

// Their trigger() is a no-op fired by the execution engine, never the registry.
const PSEUDO_TRIGGER_NODE_TYPES = new Set<string>([
	MANUAL_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	ERROR_TRIGGER_NODE_TYPE,
]);

/**
 * Projects a published workflow version into trigger seat desired state.
 *
 * Called by the publication applier instead of registering in-memory triggers
 * directly: seats carry which version each trigger should run and how many
 * replicas it gets; the per-runner seat reconciler converges actual
 * registrations toward them. Teardown-first is preserved as a *bounded* wait —
 * the applier waits for holders to ack before advancing the version, but
 * proceeds on timeout, because the version-scoped fence already guarantees a
 * straggler's emissions can't land.
 */
@Service()
export class TriggerSeatProjector {
	constructor(
		private readonly logger: Logger,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly seatRepository: WorkflowTriggerSeatRepository,
		private readonly scheduleTriggerJobRegistrar: ScheduleTriggerJobRegistrar,
		private readonly nodeTypes: NodeTypes,
	) {
		this.logger = this.logger.scoped('workflow-publication');
		if (
			this.workflowsConfig.useTriggerSeats &&
			!this.workflowsConfig.useWorkflowPublicationService
		) {
			throw new UnexpectedError(
				'N8N_USE_TRIGGER_SEATS requires N8N_USE_WORKFLOW_PUBLICATION_SERVICE',
			);
		}
	}

	get enabled(): boolean {
		return this.workflowsConfig.useTriggerSeats;
	}

	/**
	 * The subset of a version's enabled trigger nodes that run on seats: nodes
	 * with a real `trigger()` function, excluding pseudo triggers and schedule
	 * nodes (which the durable scheduler intercepts). Poll and webhook nodes are
	 * excluded by construction.
	 */
	getSeatEligibleNodes(nodes: INode[]): INode[] {
		const workflow = new Workflow({
			id: 'seat-eligibility',
			name: 'seat-eligibility',
			nodes,
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});

		return workflow
			.getTriggerNodes()
			.filter(
				(node) =>
					!PSEUDO_TRIGGER_NODE_TYPES.has(node.type) &&
					!this.scheduleTriggerJobRegistrar.interceptsNode(node),
			);
	}

	/**
	 * Upserts the desired seats of the given nodes at the published version.
	 * Idempotent; existing leases are untouched, so a version bump reaches
	 * holders as a desired-version change they swap to in place.
	 */
	async projectSeats(workflowId: string, versionId: string, nodes: INode[]): Promise<void> {
		for (const node of nodes) {
			await this.seatRepository.upsertDesiredSeats(
				workflowId,
				node.id,
				this.resolveSeatCount(node),
				versionId,
			);
		}
	}

	/**
	 * Replication from the node's optional `seatCount` parameter, defaulting to
	 * a singleton. Clamped so a typo can't fan out unbounded consumers.
	 */
	private resolveSeatCount(node: INode): number {
		const raw = node.parameters?.seatCount;
		const parsed = typeof raw === 'number' ? Math.floor(raw) : 1;
		return Math.min(Math.max(parsed, 1), MAX_SEAT_COUNT);
	}

	/**
	 * Marks the given nodes' seats inactive and waits — bounded — for their
	 * holders to report teardown. On timeout it returns anyway: the fence makes
	 * a straggler's emissions inert, so the wait is operator courtesy
	 * ("old triggers observably stopped before the version advanced"), never a
	 * correctness dependency.
	 */
	async retireSeatsAndAwait(workflowId: string, nodeIds: string[]): Promise<void> {
		if (nodeIds.length === 0) return;

		await this.seatRepository.markSeatsInactive(workflowId, nodeIds);

		const deadline =
			Date.now() +
			this.workflowsConfig.triggerSeatTeardownWaitSeconds * Time.seconds.toMilliseconds;

		while (Date.now() < deadline) {
			const stillRegistered = await this.seatRepository.countRegisteredSeats(workflowId, nodeIds);
			if (stillRegistered === 0) return;
			await sleep(TEARDOWN_ACK_POLL_INTERVAL_MS);
		}

		this.logger.warn(
			'Timed out waiting for seat holders to ack trigger teardown; proceeding — the fence covers stragglers',
			{ workflowId, nodeIds },
		);
	}
}
