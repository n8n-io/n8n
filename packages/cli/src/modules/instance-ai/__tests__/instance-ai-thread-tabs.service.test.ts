import type { InstanceAiThreadTabsState } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { InstanceAiThreadTabsService } from '../instance-ai-thread-tabs.service';
import type { InstanceAiThreadTabsRepository } from '../repositories/instance-ai-thread-tabs.repository';

const THREAD_ID = 'thread-1';
const USER_ID = 'user-1';

describe('InstanceAiThreadTabsService', () => {
	const logger = mock<Logger>();
	const repository = mock<InstanceAiThreadTabsRepository>();
	const service = new InstanceAiThreadTabsService(logger, repository);

	const state: InstanceAiThreadTabsState = {
		tabs: [{ type: 'agent', id: 'agent-1', name: 'SEO Auditor' }],
		closedTabs: [],
		activeTab: { type: 'agent', id: 'agent-1' },
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns the stored tabs', async () => {
		repository.findState.mockResolvedValue(state);

		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toEqual(state);
		expect(repository.findState).toHaveBeenCalledWith(THREAD_ID, USER_ID);
	});

	it('returns null when no tabs are stored', async () => {
		repository.findState.mockResolvedValue(null);

		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toBeNull();
	});

	it('returns null and logs a warning when the stored tabs have an invalid shape', async () => {
		repository.findState.mockResolvedValue({ tabs: 'not-an-array' });

		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toBeNull();
		expect(logger.warn).toHaveBeenCalledWith(expect.any(String), { threadId: THREAD_ID });
	});

	it('saves the tabs for the user and thread', async () => {
		await service.saveState(THREAD_ID, USER_ID, state);

		expect(repository.saveState).toHaveBeenCalledWith(THREAD_ID, USER_ID, state);
	});
});
