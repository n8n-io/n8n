import type { Logger } from '@n8n/backend-common';
import type { WorkflowEntity, WorkflowPublishHistoryRepository, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import * as credentialSharing from '@/constants/credential-sharing';
import { WorkflowPublisherService } from '@/workflows/workflow-publisher.service';

describe('WorkflowPublisherService', () => {
	const logger = mock<Logger>();
	const workflowRepository = mock<WorkflowRepository>();
	const publishHistoryRepository = mock<WorkflowPublishHistoryRepository>();

	const service = new WorkflowPublisherService(
		logger,
		workflowRepository,
		publishHistoryRepository,
	);

	const workflowId = 'workflow-1';

	beforeEach(() => {
		vi.resetAllMocks();
		vi.spyOn(credentialSharing, 'isCredSharingEnabled').mockReturnValue(true);
		workflowRepository.findOne.mockResolvedValue(
			mock<WorkflowEntity>({ id: workflowId, activeVersionId: 'version-1' }),
		);
	});

	it('attributes the run to whoever published the active version', async () => {
		publishHistoryRepository.findPublisherUserId.mockResolvedValue('user-1');

		await expect(service.findPublisherUserId(workflowId)).resolves.toBe('user-1');

		expect(publishHistoryRepository.findPublisherUserId).toHaveBeenCalledWith(
			workflowId,
			'version-1',
		);
	});

	// A deleted publisher nulls the column; a git-imported workflow never had one.
	// Either way the run carries no identity and behaves as it does today.
	it('returns nothing and logs when there is no publisher', async () => {
		publishHistoryRepository.findPublisherUserId.mockResolvedValue(undefined);

		await expect(service.findPublisherUserId(workflowId)).resolves.toBeUndefined();

		expect(logger.debug).toHaveBeenCalledWith(
			'Triggered execution has no publishing user to attribute it to',
			{ workflowId },
		);
	});

	it('still asks when the workflow has no active version', async () => {
		workflowRepository.findOne.mockResolvedValue(null);
		publishHistoryRepository.findPublisherUserId.mockResolvedValue('user-1');

		await expect(service.findPublisherUserId(workflowId)).resolves.toBe('user-1');

		expect(publishHistoryRepository.findPublisherUserId).toHaveBeenCalledWith(
			workflowId,
			undefined,
		);
	});

	// The schedule, poll and webhook paths run this per execution and already
	// hold the workflow, so they pass the version and save a query each time.
	it('skips the workflow lookup when the caller supplies the version', async () => {
		publishHistoryRepository.findPublisherUserId.mockResolvedValue('user-1');

		await expect(service.findPublisherUserId(workflowId, 'version-9')).resolves.toBe('user-1');

		expect(workflowRepository.findOne).not.toHaveBeenCalled();
		expect(publishHistoryRepository.findPublisherUserId).toHaveBeenCalledWith(
			workflowId,
			'version-9',
		);
	});

	// `null` is a real value here — an unpublished workflow — and must not be
	// mistaken for "the caller did not tell me".
	it('treats a null version from the caller as given, not missing', async () => {
		publishHistoryRepository.findPublisherUserId.mockResolvedValue(undefined);

		await service.findPublisherUserId(workflowId, null);

		expect(workflowRepository.findOne).not.toHaveBeenCalled();
		expect(publishHistoryRepository.findPublisherUserId).toHaveBeenCalledWith(workflowId, null);
	});

	// The single gate for this behaviour, so every call site stays unconditional.
	it('reads nothing at all while the feature flag is off', async () => {
		vi.spyOn(credentialSharing, 'isCredSharingEnabled').mockReturnValue(false);

		await expect(service.findPublisherUserId(workflowId)).resolves.toBeUndefined();

		expect(workflowRepository.findOne).not.toHaveBeenCalled();
		expect(publishHistoryRepository.findPublisherUserId).not.toHaveBeenCalled();
	});
});
