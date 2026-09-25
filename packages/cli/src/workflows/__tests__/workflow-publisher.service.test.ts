import type { Logger } from '@n8n/backend-common';
import type { WorkflowPublishHistoryRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import * as credentialSharing from '@/constants/credential-sharing';
import { WorkflowPublisherService } from '@/workflows/workflow-publisher.service';

describe('WorkflowPublisherService', () => {
	const logger = mock<Logger>();
	const publishHistoryRepository = mock<WorkflowPublishHistoryRepository>();

	const service = new WorkflowPublisherService(logger, publishHistoryRepository);

	const workflowId = 'workflow-1';

	beforeEach(() => {
		vi.resetAllMocks();
		vi.spyOn(credentialSharing, 'isCredSharingEnabled').mockReturnValue(true);
	});

	// The caller passes the version whose nodes are about to run, never the
	// workflow row's `activeVersionId`, which names the next version while a
	// publication is still applying.
	it('attributes the run to whoever published the version it runs', async () => {
		publishHistoryRepository.findPublisherUserId.mockResolvedValue('user-1');

		await expect(service.findPublisherUserId(workflowId, 'version-9')).resolves.toBe('user-1');

		expect(publishHistoryRepository.findPublisherUserId).toHaveBeenCalledWith(
			workflowId,
			'version-9',
		);
	});

	// A deleted publisher nulls the column; a git-imported workflow never had one.
	// Either way the run carries no identity and behaves as it does today.
	it('returns nothing and logs when there is no publisher', async () => {
		publishHistoryRepository.findPublisherUserId.mockResolvedValue(undefined);

		await expect(service.findPublisherUserId(workflowId, 'version-9')).resolves.toBeUndefined();

		expect(logger.debug).toHaveBeenCalledWith(
			'Triggered execution has no publishing user to attribute it to',
			{ workflowId },
		);
	});

	// An unpublished workflow, and a shape that carries no version at all. The
	// newest activation belongs to whichever version was published last, so
	// falling back to it would attribute the run to someone who published
	// something else.
	it.each([null, undefined])(
		'leaves the run unattributed, and reads nothing, when the version is %s',
		async (versionId) => {
			await expect(service.findPublisherUserId(workflowId, versionId)).resolves.toBeUndefined();

			expect(publishHistoryRepository.findPublisherUserId).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				'Triggered execution has no version to attribute it to',
				{ workflowId },
			);
		},
	);

	// Attribution is metadata, not a precondition: the caller is mid-emit, and
	// rejecting here would drop a trigger that would otherwise have run.
	it('leaves the run unattributed, and warns, when the lookup fails', async () => {
		publishHistoryRepository.findPublisherUserId.mockRejectedValue(new Error('connection lost'));

		await expect(service.findPublisherUserId(workflowId, 'version-9')).resolves.toBeUndefined();

		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to resolve the publishing user for a triggered execution',
			{ workflowId, error: 'connection lost' },
		);
	});

	// The single gate for this behaviour, so every call site stays unconditional.
	it('reads nothing at all while the feature flag is off', async () => {
		vi.spyOn(credentialSharing, 'isCredSharingEnabled').mockReturnValue(false);

		await expect(service.findPublisherUserId(workflowId, 'version-9')).resolves.toBeUndefined();

		expect(publishHistoryRepository.findPublisherUserId).not.toHaveBeenCalled();
	});
});
