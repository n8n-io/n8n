import type { AssistantThreadTabsState } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { AssistantArtifactNamesService } from '../assistant-agent/assistant-artifact-names.service';
import { InstanceAiThreadTabsService } from '../instance-ai-thread-tabs.service';
import type { InstanceAiThreadTabsRepository } from '../repositories/instance-ai-thread-tabs.repository';

const THREAD_ID = 'thread-1';
const USER_ID = 'user-1';

describe('InstanceAiThreadTabsService', () => {
	const logger = mock<Logger>();
	const repository = mock<InstanceAiThreadTabsRepository>();
	const artifactNames = mock<AssistantArtifactNamesService>();
	const service = new InstanceAiThreadTabsService(logger, repository, artifactNames);

	const state: AssistantThreadTabsState = {
		tabs: [{ type: 'agent', id: 'agent-1', name: 'SEO Auditor' }],
		closedTabs: [],
		activeTab: { type: 'agent', id: 'agent-1' },
	};

	beforeEach(() => {
		vi.clearAllMocks();
		artifactNames.withCurrentName.mockImplementation(async (artifact) => artifact);
	});

	it('returns the stored tabs', async () => {
		repository.findState.mockResolvedValue(state);

		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toEqual(state);
		expect(repository.findState).toHaveBeenCalledWith(THREAD_ID, USER_ID);
	});

	it('returns stored tabs that were saved before previewOpen existed, and keeps previewOpen when present', async () => {
		repository.findState.mockResolvedValue(state);
		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toEqual(state);

		repository.findState.mockResolvedValue({ ...state, previewOpen: true });
		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toEqual({
			...state,
			previewOpen: true,
		});
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

	describe('showArtifactTab', () => {
		it('writes the stored tabs with the artifact tab open', async () => {
			await service.showArtifactTab(THREAD_ID, USER_ID, {
				type: 'workflow',
				id: 'wf-1',
				name: 'Sync',
			});

			expect(repository.updateState).toHaveBeenCalledWith(THREAD_ID, USER_ID, expect.any(Function));
			const update = repository.updateState.mock.calls[0][2];
			expect(update(state)).toEqual({
				tabs: [...state.tabs, { type: 'workflow', id: 'wf-1', name: 'Sync' }],
				closedTabs: [],
				activeTab: { type: 'workflow', id: 'wf-1' },
				previewOpen: true,
			});
		});

		it('creates the stored tabs when none or only invalid tabs are stored', async () => {
			await service.showArtifactTab(THREAD_ID, USER_ID, {
				type: 'workflow',
				id: 'wf-1',
				name: 'Sync',
			});

			const update = repository.updateState.mock.calls[0][2];
			const created = {
				tabs: [{ type: 'workflow', id: 'wf-1', name: 'Sync' }],
				closedTabs: [],
				activeTab: { type: 'workflow', id: 'wf-1' },
				previewOpen: true,
			};
			expect(update(null)).toEqual(created);
			expect(update({ tabs: 'not-an-array' })).toEqual(created);
		});
	});
});
