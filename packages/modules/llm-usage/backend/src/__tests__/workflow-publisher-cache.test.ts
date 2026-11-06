import type { WorkflowPublishHistoryRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { WorkflowPublisherCache } from '../workflow-publisher-cache';

describe('WorkflowPublisherCache', () => {
	const publishHistory = mock<WorkflowPublishHistoryRepository>();
	let cache: WorkflowPublisherCache;

	beforeEach(() => {
		publishHistory.findPublisherUserId.mockReset().mockResolvedValue('publisher-1');
		cache = new WorkflowPublisherCache(publishHistory);
	});

	it('counts a call for the user who started the run, without a lookup', () => {
		expect(cache.accountableUserId({ userId: 'user-1', workflowId: 'wf-1' })).toBe('user-1');
		expect(publishHistory.findPublisherUserId).not.toHaveBeenCalled();
	});

	it('loads the publisher in the background on a miss, and counts later calls for it', async () => {
		expect(cache.accountableUserId({ workflowId: 'wf-1' })).toBeUndefined();
		await vi.waitFor(() =>
			expect(cache.accountableUserId({ workflowId: 'wf-1' })).toBe('publisher-1'),
		);

		expect(publishHistory.findPublisherUserId).toHaveBeenCalledTimes(1);
	});
});
