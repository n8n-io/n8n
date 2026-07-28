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
	outboxConsumer.drainPending.mockResolvedValue(0);
	setRegistered({});
	activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue([]);
	activeWorkflowTriggers.remove.mockResolvedValue(true);
	workflowRepository.getActiveIds.mockResolvedValue([]);
	workflowRepository.findOneBy.mockResolvedValue(null);
	lifecycleLock.runExclusive.mockImplementation(async (_workflowId, fn) => await fn());
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

		it('does not start when the instance is not leader', () => {
			Object.assign(instanceSettings, { isLeader: false });

			service.init();
			vi.advanceTimersByTime(10_000);

			expect(triggerStatusRepository.findActivatedInMemoryTriggers).not.toHaveBeenCalled();
		});
	});

	describe('startReconciler', () => {
		it('does not start when the publication service is disabled', () => {
			Object.assign(config, { useWorkflowPublicationService: false });

			service.startReconciler();
			vi.advanceTimersByTime(10_000);

			expect(triggerStatusRepository.findActivatedInMemoryTriggers).not.toHaveBeenCalled();
		});

		it('does not start if shutting down', () => {
			service.shutdown();
			service.startReconciler();
			vi.advanceTimersByTime(10_000);

			expect(triggerStatusRepository.findActivatedInMemoryTriggers).not.toHaveBeenCalled();
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

		it('does not run when the instance is no longer leader', async () => {
			Object.assign(instanceSettings, { isLeader: false });

			await service.reconcile();

			expect(triggerStatusRepository.findActivatedInMemoryTriggers).not.toHaveBeenCalled();
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

	describe('stopReconciler', () => {
		it('stops the interval on leader stepdown', () => {
			service.startReconciler();
			service.stopReconciler();

			vi.advanceTimersByTime(10_000);

			expect(triggerStatusRepository.findActivatedInMemoryTriggers).not.toHaveBeenCalled();
		});
	});
});
