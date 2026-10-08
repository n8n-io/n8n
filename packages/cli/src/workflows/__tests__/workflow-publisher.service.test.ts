import type { Logger } from '@n8n/backend-common';
import type { WorkflowPublishHistoryRepository } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';
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

	// A wait resume and bootup recovery rebuild the run from the stored row, where
	// the acting user is not a field. Without deriving it again, the run comes back
	// unattributed and a credential only its publisher may use is refused halfway.
	describe('findActingUserIdForRestart', () => {
		it('prefers the user a manual run recorded', async () => {
			await expect(
				service.findActingUserIdForRestart({
					workflowData: { id: workflowId, versionId: 'version-9' },
					data: { manualData: { userId: 'the-clicker' } },
				}),
			).resolves.toBe('the-clicker');

			expect(publishHistoryRepository.findPublisherUserId).not.toHaveBeenCalled();
		});

		it('falls back to the publisher of the version being run', async () => {
			publishHistoryRepository.findPublisherUserId.mockResolvedValue('the-publisher');

			await expect(
				service.findActingUserIdForRestart({
					workflowData: { id: workflowId, versionId: 'version-9' },
					data: {},
				}),
			).resolves.toBe('the-publisher');

			expect(publishHistoryRepository.findPublisherUserId).toHaveBeenCalledWith(
				workflowId,
				'version-9',
			);
		});

		it('returns nothing for an execution with no workflow id to ask about', async () => {
			await expect(
				service.findActingUserIdForRestart({
					// An unsaved workflow: `IWorkflowBase.id` is optional.
					workflowData: { versionId: 'version-9' } as IWorkflowBase,
					data: {},
				}),
			).resolves.toBeUndefined();

			expect(publishHistoryRepository.findPublisherUserId).not.toHaveBeenCalled();
		});
	});

	// The single gate for this behaviour, so every call site stays unconditional.
	it('reads nothing at all while the feature flag is off', async () => {
		vi.spyOn(credentialSharing, 'isCredSharingEnabled').mockReturnValue(false);

		await expect(service.findPublisherUserId(workflowId, 'version-9')).resolves.toBeUndefined();

		expect(publishHistoryRepository.findPublisherUserId).not.toHaveBeenCalled();
	});
});
