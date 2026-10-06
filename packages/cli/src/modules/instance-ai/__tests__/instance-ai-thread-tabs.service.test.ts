import type { InstanceAiThreadTabsState } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { N8nMemory } from '../../agents/integrations/n8n-memory';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';
import { InstanceAiThreadTabsService } from '../instance-ai-thread-tabs.service';

const THREAD_ID = 'thread-1';
const USER_ID = 'user-1';

type Metadata = Record<string, unknown> | undefined;
type PatchArgs = {
	threadId: string;
	update: (current: { metadata?: Metadata }) => { metadata?: Metadata } | null | undefined;
};

describe('InstanceAiThreadTabsService', () => {
	const logger = mock<Logger>();
	const threadMemory = {
		getThread: vi.fn(),
		patchThread: vi.fn(),
	};
	const getImplementation = vi.fn(() => threadMemory);
	const service = new InstanceAiThreadTabsService(logger, {
		getImplementation,
	} as unknown as N8nMemory);

	const state: InstanceAiThreadTabsState = {
		tabs: [{ type: 'agent', id: 'agent-1', name: 'SEO Auditor' }],
		closedTabs: [],
		activeTab: { type: 'agent', id: 'agent-1' },
	};

	function storeTabs(tabs: unknown) {
		threadMemory.getThread.mockResolvedValue({ id: THREAD_ID, metadata: { instanceAiTabs: tabs } });
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns the tabs stored in the Assistant thread metadata', async () => {
		storeTabs(state);

		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toEqual(state);
		expect(getImplementation).toHaveBeenCalledWith(ASSISTANT_AGENT_ID);
		expect(threadMemory.getThread).toHaveBeenCalledWith(THREAD_ID);
	});

	it('returns stored tabs that were saved before previewOpen existed, and keeps previewOpen when present', async () => {
		storeTabs(state);
		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toEqual(state);

		storeTabs({ ...state, previewOpen: true });
		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toEqual({
			...state,
			previewOpen: true,
		});
	});

	it('returns null when no tabs are stored', async () => {
		threadMemory.getThread.mockResolvedValue({ id: THREAD_ID, metadata: {} });
		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toBeNull();

		threadMemory.getThread.mockResolvedValue(null);
		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toBeNull();
	});

	it('returns null and logs a warning when the stored tabs have an invalid shape', async () => {
		storeTabs({ tabs: 'not-an-array' });

		await expect(service.getState(THREAD_ID, USER_ID)).resolves.toBeNull();
		expect(logger.warn).toHaveBeenCalledWith(expect.any(String), { threadId: THREAD_ID });
	});

	it('saves the tabs in the thread metadata and keeps the other keys', async () => {
		let metadata: Metadata = { source: 'onboarding' };
		threadMemory.patchThread.mockImplementation(async ({ update }: PatchArgs) => {
			metadata = update({ metadata })?.metadata;
			return { id: THREAD_ID, metadata };
		});

		await service.saveState(THREAD_ID, USER_ID, state);

		expect(threadMemory.patchThread).toHaveBeenCalledWith(
			expect.objectContaining({ threadId: THREAD_ID }),
		);
		expect(metadata).toEqual({ source: 'onboarding', instanceAiTabs: state });
	});
});
