import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { TriggerSeatFence, WorkflowTriggerSeat } from '@n8n/db';
import {
	TriggerRunnerRepository,
	WorkflowRepository,
	WorkflowTriggerSeatRepository,
} from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { ErrorReporter, InstanceSettings } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { NonWebhookTriggerRegistrar } from '@/workflows/triggers/non-webhook-trigger-registrar';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import type { HeldSeat, SeatView, TickAction } from './plan-tick';
import { planTick } from './plan-tick';

/** Heartbeats older than this many reconcile intervals mean the runner is gone. */
const LIVENESS_INTERVALS = 3;

/** How many reconcile intervals a vacancy waits for its desired holder before anyone may claim it. */
const CLAIM_GRACE_INTERVALS = 4;

/**
 * Converges this instance's in-memory trigger registrations toward the seat
 * table: claims seats it should hold (rendezvous + anti-affinity, grace
 * fallback), renews leases, swaps versions in place, honors handoff requests,
 * and tears down anything it holds no seat for. Runs on every main — there is
 * no leader; correctness against concurrent holders comes from the seat epoch
 * fence at execution insert, not from mutual exclusion here.
 */
@Service()
export class TriggerSeatReconciler {
	/** Seats this process holds, by seat id. */
	private readonly held = new Map<string, HeldSeat>();

	private interval: NodeJS.Timeout | undefined;

	private tickInFlight = false;

	private stopped = false;

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly seatRepository: WorkflowTriggerSeatRepository,
		private readonly runnerRepository: TriggerRunnerRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nonWebhookTriggerRegistrar: NonWebhookTriggerRegistrar,
		private readonly triggerExecutionContextFactory: TriggerExecutionContextFactory,
		private readonly nodeTypes: NodeTypes,
	) {
		this.logger = this.logger.scoped('workflow-activation');
	}

	private get runnerId(): string {
		return this.instanceSettings.hostId;
	}

	private get intervalMs(): number {
		return this.workflowsConfig.triggerSeatReconcileIntervalSeconds * Time.seconds.toMilliseconds;
	}

	private get leaseMs(): number {
		return this.workflowsConfig.triggerSeatLeaseSeconds * Time.seconds.toMilliseconds;
	}

	init() {
		if (!this.workflowsConfig.useTriggerSeats) return;
		if (this.instanceSettings.instanceType !== 'main') return;

		this.interval = setInterval(() => {
			void this.tickSafely();
		}, this.intervalMs);
		this.logger.info('Trigger seat reconciler started', {
			runnerId: this.runnerId,
			intervalMs: this.intervalMs,
		});
		void this.tickSafely();
	}

	@OnShutdown()
	async shutdown() {
		this.stopped = true;
		if (this.interval) clearInterval(this.interval);

		// Graceful goodbye: tear down and vacate every held seat so successors
		// claim immediately instead of waiting out the lease.
		for (const held of [...this.held.values()]) {
			await this.retireHeldSeat(held);
		}
	}

	/** One reconcile pass. Never throws; overlapping passes are skipped. */
	async tickSafely(): Promise<void> {
		if (this.tickInFlight || this.stopped) return;
		this.tickInFlight = true;
		try {
			await this.tick();
		} catch (error) {
			this.errorReporter.error(error, { shouldBeLogged: true });
		} finally {
			this.tickInFlight = false;
		}
	}

	private async tick(): Promise<void> {
		await this.runnerRepository.heartbeat(this.runnerId);
		const liveRunners = await this.runnerRepository.findLiveRunnerIds(
			LIVENESS_INTERVALS * this.intervalMs,
		);
		const seats = await this.seatRepository.findAllRelevantSeats();

		const now = Date.now();
		const seatViews: SeatView[] = seats.map((seat) => ({
			id: seat.id,
			workflowId: seat.workflowId,
			nodeId: seat.nodeId,
			desiredState: seat.desiredState,
			desiredVersionId: seat.desiredVersionId,
			holderId: seat.holderId,
			leaseExpired: seat.leaseExpiresAt !== null && seat.leaseExpiresAt.getTime() < now,
			leaseEpoch: seat.leaseEpoch,
			desiredHolderId: seat.desiredHolderId,
			msSinceUpdated: Math.max(0, now - seat.updatedAt.getTime()),
		}));

		const actions = planTick({
			myRunnerId: this.runnerId,
			liveRunners,
			seats: seatViews,
			held: this.held,
			graceMs: CLAIM_GRACE_INTERVALS * this.intervalMs,
		});

		for (const action of actions) {
			if (this.stopped) return;
			await this.execute(action);
		}
	}

	private async execute(action: TickAction): Promise<void> {
		try {
			switch (action.type) {
				case 'renew': {
					const renewed = await this.seatRepository.renew(
						action.seat.id,
						this.runnerId,
						action.held.leaseEpoch,
						this.leaseMs,
					);
					// 0 rows = no longer ours: tear down; the fence already made our
					// emissions inert the moment someone re-claimed.
					if (!renewed) await this.dropRegistration(action.held, action.seat);
					break;
				}
				case 'adopt': {
					await this.registerSeat(action.seat, action.seat.leaseEpoch);
					break;
				}
				case 'claim': {
					const epoch = await this.seatRepository.claim(
						action.seat.id,
						this.runnerId,
						this.leaseMs,
					);
					if (epoch === null) break; // lost the race; benign
					this.logger.info('Claimed trigger seat', {
						seatId: action.seat.id,
						workflowId: action.seat.workflowId,
						nodeId: action.seat.nodeId,
						leaseEpoch: epoch,
					});
					await this.registerSeat(action.seat, epoch);
					break;
				}
				case 'swapVersion': {
					await this.nonWebhookTriggerRegistrar.deregister(
						action.seat.workflowId,
						action.seat.nodeId,
					);
					this.held.delete(action.seat.id);
					await this.registerSeat(action.seat, action.held.leaseEpoch);
					break;
				}
				case 'retire': {
					await this.retireHeldSeat(action.held, action.seat);
					break;
				}
				case 'requestHandoff': {
					const requested = await this.seatRepository.requestHandoff(action.seat.id, this.runnerId);
					if (requested) {
						this.logger.info('Requested trigger seat handoff', {
							seatId: action.seat.id,
							from: action.seat.holderId,
						});
					}
					break;
				}
				case 'deregisterGhost': {
					await this.dropRegistration(action.held);
					break;
				}
			}
		} catch (error) {
			this.errorReporter.error(error, { shouldBeLogged: true });
			this.logger.error('Trigger seat action failed', {
				action: action.type,
				error: ensureError(error).message,
			});
		}
	}

	/**
	 * Registers the seat's trigger node in memory with a fence carrying this
	 * claim's epoch and version. A registration failure reports the error on the
	 * seat and vacates it, so another runner (or a later tick) retries.
	 */
	private async registerSeat(seat: SeatView, leaseEpoch: number): Promise<void> {
		const fence: TriggerSeatFence = {
			seatId: seat.id,
			holderId: this.runnerId,
			leaseEpoch,
			versionId: seat.desiredVersionId,
		};

		try {
			const dbWorkflow = await this.workflowRepository.findOneBy({ id: seat.workflowId });
			if (!dbWorkflow) throw new Error(`Workflow ${seat.workflowId} not found`);

			const workflowData: IWorkflowBase =
				await this.triggerExecutionContextFactory.loadPublishedWorkflowData(seat.workflowId, {
					bypassCache: true,
				});

			const workflow = new Workflow({
				id: workflowData.id,
				name: workflowData.name,
				nodes: workflowData.nodes,
				connections: workflowData.connections,
				active: true,
				nodeTypes: this.nodeTypes,
				staticData: workflowData.staticData,
				settings: workflowData.settings,
			});

			const additionalData = await WorkflowExecuteAdditionalData.getBase({
				workflowId: workflowData.id,
				workflowSettings: workflowData.settings,
			});

			const registration = this.nonWebhookTriggerRegistrar.createRegistrationContext(dbWorkflow, {
				activationMode: 'init',
				executionMode: 'trigger',
				additionalData,
				resolveWorkflowData: async () =>
					await this.triggerExecutionContextFactory.loadPublishedWorkflowData(seat.workflowId),
				onTriggerFailure: ({ error }) => {
					void this.onRuntimeTriggerFailure(seat, fence, error);
				},
				seatFence: fence,
			});

			await workflow.expression.acquireIsolate();
			try {
				await this.nonWebhookTriggerRegistrar.register(workflow, registration, seat.nodeId);
			} finally {
				await workflow.expression.releaseIsolate();
			}

			this.held.set(seat.id, {
				seatId: seat.id,
				leaseEpoch,
				registeredVersionId: seat.desiredVersionId,
			});
			await this.seatRepository.reportActual(seat.id, this.runnerId, leaseEpoch, {
				state: 'registered',
				versionId: seat.desiredVersionId,
			});
			this.logger.info('Registered trigger for seat', {
				seatId: seat.id,
				workflowId: seat.workflowId,
				nodeId: seat.nodeId,
				versionId: seat.desiredVersionId,
			});
		} catch (error) {
			const failure = ensureError(error);
			this.logger.error('Failed to register trigger for seat; vacating', {
				seatId: seat.id,
				workflowId: seat.workflowId,
				nodeId: seat.nodeId,
				error: failure.message,
			});
			await this.seatRepository.reportActual(seat.id, this.runnerId, leaseEpoch, {
				state: 'error',
				error: failure.message,
			});
			await this.seatRepository.release(seat.id, this.runnerId, leaseEpoch);
			this.held.delete(seat.id);
		}
	}

	/**
	 * A trigger that failed at runtime (e.g. the broker connection dropped and
	 * the node reported a fatal error): tear it down and vacate the seat, so a
	 * fresh claim — here or elsewhere — reconnects.
	 */
	private async onRuntimeTriggerFailure(
		seat: SeatView,
		fence: TriggerSeatFence,
		error: Error,
	): Promise<void> {
		this.logger.warn('Trigger reported a runtime failure; vacating its seat', {
			seatId: seat.id,
			workflowId: seat.workflowId,
			nodeId: seat.nodeId,
			error: error.message,
		});
		try {
			await this.nonWebhookTriggerRegistrar.deregister(seat.workflowId, seat.nodeId);
		} catch (teardownError) {
			this.errorReporter.error(teardownError, { shouldBeLogged: true });
		}
		this.held.delete(seat.id);
		await this.seatRepository.reportActual(seat.id, this.runnerId, fence.leaseEpoch, {
			state: 'error',
			error: error.message,
		});
		await this.seatRepository.release(seat.id, this.runnerId, fence.leaseEpoch);
	}

	/** Deregister, report closed, release — the orderly goodbye. */
	private async retireHeldSeat(held: HeldSeat, seat?: SeatView): Promise<void> {
		const seatRow = seat ?? (await this.findSeatRowView(held.seatId));
		if (seatRow) {
			await this.nonWebhookTriggerRegistrar.deregister(seatRow.workflowId, seatRow.nodeId);
		}
		this.held.delete(held.seatId);
		await this.seatRepository.reportActual(held.seatId, this.runnerId, held.leaseEpoch, {
			state: 'closed',
		});
		await this.seatRepository.release(held.seatId, this.runnerId, held.leaseEpoch);
	}

	/** Tear down a registration whose seat is no longer ours; no seat writes. */
	private async dropRegistration(held: HeldSeat, seat?: SeatView): Promise<void> {
		const seatRow = seat ?? (await this.findSeatRowView(held.seatId));
		if (seatRow) {
			await this.nonWebhookTriggerRegistrar.deregister(seatRow.workflowId, seatRow.nodeId);
		}
		this.held.delete(held.seatId);
	}

	private async findSeatRowView(
		seatId: string,
	): Promise<Pick<WorkflowTriggerSeat, 'workflowId' | 'nodeId'> | null> {
		return await this.seatRepository.findOne({
			select: ['workflowId', 'nodeId'],
			where: { id: seatId },
		});
	}
}
