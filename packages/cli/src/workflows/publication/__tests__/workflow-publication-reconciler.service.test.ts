import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import type {
	WorkflowEntity,
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type {
	ActiveWorkflowTriggers,
	ErrorReporter,
	InstanceSettings,
	Span,
	Tracing,
} from 'n8n-core';

import type { EventService } from '@/events/event.service';
import type { NonWebhookTriggerRegistrar } from '@/workflows/triggers/non-webhook-trigger-registrar';

import type { PublishedWorkflowTriggerDeactivator } from '../published-workflow-trigger-deactivator';
import type { WorkflowPublicationLifecycleLock } from '../workflow-publication-lifecycle-lock';
import type { WorkflowPublicationOutboxConsumer } from '../workflow-publication-outbox-consumer';
import { WorkflowPublicationReconciler } from '../workflow-publication-reconciler.service';

const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
const config = mock<WorkflowsConfig>({
	useWorkflowPublicationService: true,
	publicationReconcileIntervalSeconds: 5,
});
const triggerStatusRepository = mock<WorkflowPublicationTriggerStatusRepository>();
const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
const nonWebhookTriggerRegistrar = mock<NonWebhookTriggerRegistrar>();
const outboxConsumer = mock<WorkflowPublicationOutboxConsumer>();
const instanceSettings = mock<InstanceSettings>({ isLeader: true });
const errorReporter = mock<ErrorReporter>();
const tracing = mock<Tracing>();
const eventService = mock<EventService>();
const lifecycleLock = mock<WorkflowPublicationLifecycleLock>();
const workflowRepository = mock<WorkflowRepository>();
const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
const triggerDeactivator = mock<PublishedWorkflowTriggerDeactivator>();

let service: WorkflowPublicationReconciler;

/** Registers `workflowId -> registered node ids` for the in-memory registry mock. */
function setRegistered(byWorkflow: Record<string, string[]>) {
	nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds.mockImplementation(
		(workflowId) => new Set(byWorkflow[workflowId] ?? []),
	);
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.clearAllMocks();
	tracing.startSpan.mockImplementation(async (_opts, spanCb) => await spanCb(mock<Span>()));
	Object.assign(instanceSettings, { isLeader: true });
	Object.assign(config, {
		useWorkflowPublicationService: true,
		publicationReconcileIntervalSeconds: 5,
	});
	triggerStatusRepository.findActivatedInMemoryTriggers.mockResolvedValue([]);
	outboxRepository.enqueueByWorkflowIds.mockResolvedValue();
	outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
	outboxRepository.findVersionSkewedWorkflowIds.mockResolvedValue([]);
	outboxRepository.findTriggerStatusDriftedWorkflowIds.mockResolvedValue([]);
	outboxRepository.findUnreportedPublishedWorkflowIds.mockResolvedValue([]);
	outboxConsumer.drainPending.mockResolvedValue(0);
	setRegistered({});
	activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue([]);
	activeWorkflowTriggers.remove.mockResolvedValue(true);
	workflowRepository.getActiveIds.mockResolvedValue([]);
	workflowRepository.findOneBy.mockResolvedValue(null);
	lifecycleLock.runExclusive.mockImplementation(async (_workflowId, fn) => await fn());
	triggerDeactivator.sweepGhostTriggers.mockResolvedValue(0);
	service = new WorkflowPublicationReconciler(
		logger,
		config,
		triggerStatusRepository,
		outboxRepository,
		nonWebhookTriggerRegistrar,
		outboxConsumer,
		instanceSettings,
		errorReporter,
		tracing,
		eventService,
		lifecycleLock,
		workflowRepository,
		activeWorkflowTriggers,
		triggerDeactivator,
	);
});

afterEach(() => {
	service.shutdown();
	vi.useRealTimers();
});

describe('WorkflowPublicationReconciler', () => {
	describe('init', () => {
		it('schedules reconciliation at the configured interval when leader', async () => {
			service.init();
			await vi.advanceTimersByTimeAsync(5_000);

			expect(triggerStatusRepository.findActivatedInMemoryTriggers).toHaveBeenCalled();
		});

		it('runs an initial pass immediately on startup', async () => {
			service.init();
			await vi.advanceTimersByTimeAsync(0);

			expect(triggerStatusRepository.findActivatedInMemoryTriggers).toHaveBeenCalledTimes(1);
		});

		it('schedules the loop on a follower too, ticking the ghost sweep instead of the detections', async () => {
			Object.assign(instanceSettings, { isLeader: false });

			service.init();
			await vi.advanceTimersByTimeAsync(5_000);

			expect(triggerDeactivator.sweepGhostTriggers).toHaveBeenCalled();
			expect(triggerStatusRepository.findActivatedInMemoryTriggers).not.toHaveBeenCalled();
		});
	});

	describe('loop lifecycle', () => {
		it('does not start when the publication service is disabled', async () => {
			Object.assign(config, { useWorkflowPublicationService: false });
			Object.assign(instanceSettings, { isLeader: false });

			service.init();
			await vi.advanceTimersByTimeAsync(10_000);

			expect(triggerDeactivator.sweepGhostTriggers).not.toHaveBeenCalled();
			expect(triggerStatusRepository.findActivatedInMemoryTriggers).not.toHaveBeenCalled();
		});

		it('does not start after shutdown', async () => {
			service.shutdown();
			service.init();
			await vi.advanceTimersByTimeAsync(10_000);

			expect(triggerDeactivator.sweepGhostTriggers).not.toHaveBeenCalled();
			expect(triggerStatusRepository.findActivatedInMemoryTriggers).not.toHaveBeenCalled();
		});

		it('keeps ticking across a stepdown, flipping to the follower checks', async () => {
			service.init();
			await vi.advanceTimersByTimeAsync(5_000);
			expect(triggerStatusRepository.findActivatedInMemoryTriggers).toHaveBeenCalled();

			Object.assign(instanceSettings, { isLeader: false });
			await vi.advanceTimersByTimeAsync(5_000);

			expect(triggerDeactivator.sweepGhostTriggers).toHaveBeenCalled();
		});

		it('needs no takeover kick: the next tick after promotion runs the leader detections', async () => {
			Object.assign(instanceSettings, { isLeader: false });
			service.init();

			Object.assign(instanceSettings, { isLeader: true });
			await vi.advanceTimersByTimeAsync(5_000);

			expect(triggerStatusRepository.findActivatedInMemoryTriggers).toHaveBeenCalled();
		});

		it('stops only at shutdown', async () => {
			service.init();
			await vi.advanceTimersByTimeAsync(5_000);

			service.shutdown();
			triggerStatusRepository.findActivatedInMemoryTriggers.mockClear();
			await vi.advanceTimersByTimeAsync(20_000);

			expect(triggerStatusRepository.findActivatedInMemoryTriggers).not.toHaveBeenCalled();
			expect(triggerDeactivator.sweepGhostTriggers).not.toHaveBeenCalled();
		});
	});

	describe('leader takeover', () => {
		it('kicks an immediate pass without waiting for the interval', async () => {
			service.startReconciler();

			await service.reconcileOnLeaderTakeover();

			expect(triggerStatusRepository.findActivatedInMemoryTriggers).toHaveBeenCalledTimes(1);
		});

		it('does nothing while the loop is not running', async () => {
			// The loop only runs when the publication service is enabled and the
			// instance is not shutting down; the takeover kick must not open a
			// side door around those gates.
			await service.reconcileOnLeaderTakeover();

			expect(triggerStatusRepository.findActivatedInMemoryTriggers).not.toHaveBeenCalled();
			expect(triggerDeactivator.sweepGhostTriggers).not.toHaveBeenCalled();
		});
	});

	describe('reconcile', () => {
		it('re-publishes a workflow whose in-memory trigger is missing', async () => {
			triggerStatusRepository.findActivatedInMemoryTriggers.mockResolvedValue([
				{ workflowId: 'wf-1', nodeId: 'n1' },
				{ workflowId: 'wf-1', nodeId: 'n2' },
			]);
			setRegistered({ 'wf-1': ['n1'] }); // n2 is missing

			await service.reconcile();

			expect(outboxRepository.enqueueByWorkflowIds).toHaveBeenCalledWith(['wf-1']);
			expect(outboxConsumer.startPolling).toHaveBeenCalled();
			expect(outboxConsumer.drainPending).toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith(
				'workflow-publication-reconciliation',
				expect.objectContaining({ result: 'success', deficientCount: 1 }),
			);
		});

		it('does nothing when every desired trigger is registered', async () => {
			triggerStatusRepository.findActivatedInMemoryTriggers.mockResolvedValue([
				{ workflowId: 'wf-1', nodeId: 'n1' },
			]);
			setRegistered({ 'wf-1': ['n1'] });

			await service.reconcile();

			expect(outboxRepository.enqueueByWorkflowIds).not.toHaveBeenCalled();
			expect(outboxConsumer.drainPending).not.toHaveBeenCalled();
		});

		it('enqueues only the workflows with missing triggers among several', async () => {
			triggerStatusRepository.findActivatedInMemoryTriggers.mockResolvedValue([
				{ workflowId: 'wf-1', nodeId: 'n1' },
				{ workflowId: 'wf-2', nodeId: 'n2' },
			]);
			setRegistered({ 'wf-1': ['n1'], 'wf-2': [] }); // only wf-2 is missing a trigger

			await service.reconcile();

			expect(outboxRepository.enqueueByWorkflowIds).toHaveBeenCalledWith(['wf-2']);
		});

		it('re-enqueues a workflow whose published version diverged from the active version', async () => {
			outboxRepository.findVersionSkewedWorkflowIds.mockResolvedValue(['wf-skew']);

			await service.reconcile();

			expect(outboxRepository.enqueueByWorkflowIds).toHaveBeenCalledWith(['wf-skew']);
			expect(outboxConsumer.drainPending).toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith(
				'workflow-publication-reconciliation',
				expect.objectContaining({ result: 'success', versionSkewCount: 1, deficientCount: 0 }),
			);
		});

		it('re-enqueues a workflow whose trigger-status rows lag the active version', async () => {
			outboxRepository.findTriggerStatusDriftedWorkflowIds.mockResolvedValue(['wf-drift']);

			await service.reconcile();

			expect(outboxRepository.enqueueByWorkflowIds).toHaveBeenCalledWith(['wf-drift']);
			expect(outboxConsumer.drainPending).toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith(
				'workflow-publication-reconciliation',
				expect.objectContaining({ result: 'success', statusDriftCount: 1, versionSkewCount: 0 }),
			);
		});

		it('re-enqueues a published workflow that has no trigger-status rows', async () => {
			outboxRepository.findUnreportedPublishedWorkflowIds.mockResolvedValue(['wf-unreported']);

			await service.reconcile();

			expect(outboxRepository.enqueueByWorkflowIds).toHaveBeenCalledWith(['wf-unreported']);
			expect(outboxConsumer.drainPending).toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith(
				'workflow-publication-reconciliation',
				expect.objectContaining({ result: 'success', unreportedCount: 1, statusDriftCount: 0 }),
			);
		});

		it('catches and reports errors without throwing', async () => {
			triggerStatusRepository.findActivatedInMemoryTriggers.mockRejectedValue(
				new Error('DB error'),
			);

			await expect(service.reconcile()).resolves.toBeUndefined();
			expect(errorReporter.error).toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith(
				'workflow-publication-reconciliation',
				expect.objectContaining({ result: 'failure' }),
			);
		});

		it('runs the ghost sweep and none of the leader detections when not leader', async () => {
			Object.assign(instanceSettings, { isLeader: false });

			await service.reconcile();

			expect(triggerDeactivator.sweepGhostTriggers).toHaveBeenCalledTimes(1);
			expect(triggerStatusRepository.findActivatedInMemoryTriggers).not.toHaveBeenCalled();
			expect(outboxRepository.findVersionSkewedWorkflowIds).not.toHaveBeenCalled();
			expect(outboxRepository.findTriggerStatusDriftedWorkflowIds).not.toHaveBeenCalled();
			expect(outboxRepository.findUnreportedPublishedWorkflowIds).not.toHaveBeenCalled();
			expect(outboxRepository.enqueueByWorkflowIds).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalledWith(
				'workflow-publication-reconciliation',
				expect.anything(),
			);
		});

		it('does not run the ghost sweep on the leader', async () => {
			await service.reconcile();

			expect(triggerDeactivator.sweepGhostTriggers).not.toHaveBeenCalled();
			expect(triggerStatusRepository.findActivatedInMemoryTriggers).toHaveBeenCalled();
		});
	});

	describe('surplus (ghost) triggers', () => {
		/** A registered workflow that is no longer published: the ghost scenario. */
		function setGhost(workflowId: string) {
			activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue([workflowId]);
			workflowRepository.getActiveIds.mockResolvedValue([]);
			workflowRepository.findOneBy.mockResolvedValue({
				id: workflowId,
				activeVersionId: null,
			} as WorkflowEntity);
		}

		it('tears down ghost triggers under the workflow lock and reports the surplus', async () => {
			setGhost('wf-ghost');

			await service.reconcile();

			expect(lifecycleLock.runExclusive).toHaveBeenCalledWith('wf-ghost', expect.any(Function));
			expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-ghost');
			expect(eventService.emit).toHaveBeenCalledWith(
				'workflow-publication-reconciliation',
				expect.objectContaining({ result: 'success', surplusCount: 1 }),
			);
		});

		it('leaves a registered workflow that is still published alone', async () => {
			activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1']);
			workflowRepository.getActiveIds.mockResolvedValue(['wf-1']);

			await service.reconcile();

			expect(activeWorkflowTriggers.remove).not.toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith(
				'workflow-publication-reconciliation',
				expect.objectContaining({ surplusCount: 0 }),
			);
		});

		it('leaves a workflow with an in-flight record for that publication to handle', async () => {
			setGhost('wf-ghost');
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(
				mock<WorkflowPublicationOutbox>({ workflowId: 'wf-ghost' }),
			);

			await service.reconcile();

			expect(activeWorkflowTriggers.remove).not.toHaveBeenCalled();
		});

		it('reports a failing ghost teardown and keeps reconciling', async () => {
			// One ghost whose teardown throws must not take down the rest of the
			// surplus pass — nor the missing/skew detections that run after it.
			activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-bad', 'wf-good']);
			activeWorkflowTriggers.remove.mockImplementation(async (workflowId) => {
				if (workflowId === 'wf-bad') throw new Error('closeFunction failed');
				return true;
			});

			await service.reconcile();

			expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-good');
			expect(errorReporter.error).toHaveBeenCalledWith(expect.any(Error), {
				shouldBeLogged: true,
			});
			// The pass carried on into the later detections.
			expect(triggerStatusRepository.findActivatedInMemoryTriggers).toHaveBeenCalled();
			expect(outboxRepository.findVersionSkewedWorkflowIds).toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledWith(
				'workflow-publication-reconciliation',
				expect.objectContaining({ result: 'success', surplusCount: 1 }),
			);
		});

		it('re-checks under the lock and skips a workflow republished since detection', async () => {
			setGhost('wf-ghost');
			// By the time the lock is acquired, a publish has completed: the workflow
			// is active again and its registered triggers are current, not ghosts.
			workflowRepository.findOneBy.mockResolvedValue({
				id: 'wf-ghost',
				activeVersionId: 'v-2',
			} as WorkflowEntity);

			await service.reconcile();

			expect(activeWorkflowTriggers.remove).not.toHaveBeenCalled();
		});
	});
});
