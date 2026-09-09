import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';

import { WorkflowReviewStateNotifier } from '../workflow-review-state-notifier.service';

/**
 * Every review mutation ends by telling open editors their review state moved.
 * Delivery is deliberately fire-and-forget, so the guarantee under test is that a
 * failed broadcast never reaches the caller — the mutation has already committed.
 */
describe('WorkflowReviewStateNotifier', () => {
	const logger = mock<Logger>();
	const collaborationService = mock<CollaborationService>();
	const notifier = new WorkflowReviewStateNotifier(logger, collaborationService);

	beforeEach(() => {
		vi.resetAllMocks();
		collaborationService.broadcastWorkflowReviewStateChanged.mockResolvedValue(undefined);
	});

	it('tells open editors of one workflow', () => {
		notifier.notify('wf-1');

		expect(
			collaborationService.broadcastWorkflowReviewStateChanged,
		).toHaveBeenCalledExactlyOnceWith('wf-1');
	});

	it('tells open editors of every workflow a batch touched', () => {
		notifier.notifyMany(['wf-1', 'wf-2']);

		expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledTimes(2);
		expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-1');
		expect(collaborationService.broadcastWorkflowReviewStateChanged).toHaveBeenCalledWith('wf-2');
	});

	it('sends nothing for an empty batch', () => {
		notifier.notifyMany([]);

		expect(collaborationService.broadcastWorkflowReviewStateChanged).not.toHaveBeenCalled();
	});

	// The mutation is already committed when this runs, so a delivery failure can
	// only be logged. Every caller relies on this instead of catching it themselves.
	it('only warns when delivery fails, and never throws at the caller', async () => {
		collaborationService.broadcastWorkflowReviewStateChanged.mockRejectedValue(
			new Error('push down'),
		);

		expect(() => notifier.notify('wf-1')).not.toThrow();

		// Wait for the rejected notification to be logged.
		await new Promise(process.nextTick);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to broadcast review state change',
			expect.objectContaining({ workflowId: 'wf-1' }),
		);
	});
});
