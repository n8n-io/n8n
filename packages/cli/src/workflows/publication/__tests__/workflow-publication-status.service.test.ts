import type {
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatus,
	WorkflowPublicationTriggerStatusRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';

describe('WorkflowPublicationStatusService', () => {
	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const triggerStatusRepository = mock<WorkflowPublicationTriggerStatusRepository>();

	const service = new WorkflowPublicationStatusService(outboxRepository, triggerStatusRepository);

	const WORKFLOW_ID = 'wf-1';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	function makeOutbox(
		overrides: Partial<WorkflowPublicationOutbox> = {},
	): WorkflowPublicationOutbox {
		return {
			id: 1,
			workflowId: WORKFLOW_ID,
			publishedVersionId: 'v-2',
			status: 'completed',
			errorMessage: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		} as WorkflowPublicationOutbox;
	}

	function makeRow(
		overrides: Partial<WorkflowPublicationTriggerStatus> = {},
	): WorkflowPublicationTriggerStatus {
		return {
			workflowId: WORKFLOW_ID,
			nodeId: 'node-1',
			versionId: 'v-2',
			status: 'activated',
			errorMessage: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		} as WorkflowPublicationTriggerStatus;
	}

	describe('never published (no rows, no in-flight publication)', () => {
		it('returns not_published with null versions', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('not_published');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBeNull();
			expect(result.triggers).toEqual([]);
		});
	});

	describe('first publish in flight (no rows; in-flight in_progress)', () => {
		it('returns in_progress with pending version and null live version', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(
				makeOutbox({ status: 'in_progress', publishedVersionId: 'v-2' }),
			);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('in_progress');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBe('v-2');
			expect(result.triggers).toEqual([]);
		});
	});

	describe('first publish pending (no rows; in-flight pending)', () => {
		it('returns in_progress with pending version and null live version', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(
				makeOutbox({ status: 'pending', publishedVersionId: 'v-2' }),
			);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('in_progress');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBe('v-2');
			expect(result.triggers).toEqual([]);
		});
	});

	describe('republish over live v1 (rows v1 all activated; in-flight in_progress pubVer v2)', () => {
		it('returns in_progress with live v1 and pending v2', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(
				makeOutbox({ status: 'in_progress', publishedVersionId: 'v-2' }),
			);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ versionId: 'v-1', status: 'activated' }),
			]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('in_progress');
			expect(result.liveVersionId).toBe('v-1');
			expect(result.pendingVersionId).toBe('v-2');
		});
	});

	describe('all triggers up (rows v2 all activated; no in-flight publication)', () => {
		it('returns published with live v2 and null pending', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'node-1', versionId: 'v-2', status: 'activated' }),
				makeRow({ nodeId: 'node-2', versionId: 'v-2', status: 'activated' }),
			]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('published');
			expect(result.liveVersionId).toBe('v-2');
			expect(result.pendingVersionId).toBeNull();
		});
	});

	describe('mixed (rows v2: ≥1 activated, ≥1 failed)', () => {
		it('returns partial with live v2 and null pending', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'node-1', versionId: 'v-2', status: 'activated' }),
				makeRow({ nodeId: 'node-2', versionId: 'v-2', status: 'failed', errorMessage: 'oops' }),
			]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('partial');
			expect(result.liveVersionId).toBe('v-2');
			expect(result.pendingVersionId).toBeNull();
		});
	});

	describe('all failed (rows v2 all failed)', () => {
		it('returns failed with null live version and null pending', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({ nodeId: 'node-1', versionId: 'v-2', status: 'failed', errorMessage: 'err1' }),
				makeRow({ nodeId: 'node-2', versionId: 'v-2', status: 'failed', errorMessage: 'err2' }),
			]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('failed');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBeNull();
		});
	});

	describe('no rows, no in-flight publication (e.g. a prior publish failed terminally)', () => {
		it('returns not_published: settled state comes from rows, terminal outbox is not consulted', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('not_published');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBeNull();
		});
	});

	describe('unpublished (rows cleared; no in-flight publication)', () => {
		it('returns not_published with null versions', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.status).toBe('not_published');
			expect(result.liveVersionId).toBeNull();
			expect(result.pendingVersionId).toBeNull();
		});
	});

	describe('triggers field mirrors the rows', () => {
		it('maps nodeId, status, errorMessage from rows', async () => {
			outboxRepository.findInFlightByWorkflowId.mockResolvedValue(null);
			triggerStatusRepository.findByWorkflowId.mockResolvedValue([
				makeRow({
					nodeId: 'n1',
					status: 'activated',
					errorMessage: null,
				}),
				makeRow({
					nodeId: 'n2',
					status: 'failed',
					errorMessage: 'schedule parse error',
				}),
			]);

			const result = await service.getStatus(WORKFLOW_ID);

			expect(result.triggers).toEqual([
				{ nodeId: 'n1', status: 'activated', errorMessage: null },
				{ nodeId: 'n2', status: 'failed', errorMessage: 'schedule parse error' },
			]);
		});
	});
});
