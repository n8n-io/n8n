import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NewAgentView from '../views/NewAgentView.vue';
import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENTS_LIST_VIEW, PROJECT_AGENTS } from '../constants';

const mocks = vi.hoisted(() => ({
	route: { query: { projectId: 'project-1' } as Record<string, string> },
	replace: vi.fn(),
	showError: vi.fn(),
	syncThread: vi.fn(),
	updateThreadMetadata: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRoute: () => mocks.route,
	useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError }),
}));
vi.mock('@/features/ai/instanceAi/instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		syncThread: mocks.syncThread,
		updateThreadMetadata: mocks.updateThreadMetadata,
	}),
}));
vi.mock('uuid', () => ({ v4: () => 'thread-1' }));
vi.mock('@n8n/utils/generate-nano-id', () => ({ generateNanoId: () => 'aBcDeFgHiJkLmNoP' }));

describe('NewAgentView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.route.query = { projectId: 'project-1' };
		history.replaceState({}, '');
	});

	it('opens an unsaved agent artifact without creating the agent', async () => {
		mount(NewAgentView);
		await flushPromises();

		expect(mocks.syncThread).toHaveBeenCalledWith('thread-1', 'project-1', {
			source: 'agent_builder_page',
			origin: 'internal',
			sourceContext: { agentId: 'aBcDeFgHiJkLmNoP' },
		});
		expect(mocks.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
			instanceAiPendingAgentTarget: {
				projectId: 'project-1',
				agentId: 'aBcDeFgHiJkLmNoP',
			},
		});
		expect(mocks.replace).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-1' },
		});
	});

	it('adopts the id minted at the click from history state, so it matches the reported click', async () => {
		history.replaceState({ instanceAiPendingAgentId: 'ZyXwVuTsRqPoNmLk' }, '');

		mount(NewAgentView);
		await flushPromises();

		expect(mocks.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
			instanceAiPendingAgentTarget: {
				projectId: 'project-1',
				agentId: 'ZyXwVuTsRqPoNmLk',
			},
		});
	});

	it('ignores a hand-authored agentId query and mints its own id', async () => {
		mocks.route.query = { projectId: 'project-1', agentId: 'ZyXwVuTsRqPoNmLk' };

		mount(NewAgentView);
		await flushPromises();

		expect(mocks.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
			instanceAiPendingAgentTarget: {
				projectId: 'project-1',
				agentId: 'aBcDeFgHiJkLmNoP',
			},
		});
	});

	it('mints its own id when the history-state value is not a valid agent id', async () => {
		history.replaceState({ instanceAiPendingAgentId: 'not-a-real-id' }, '');

		mount(NewAgentView);
		await flushPromises();

		expect(mocks.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
			instanceAiPendingAgentTarget: {
				projectId: 'project-1',
				agentId: 'aBcDeFgHiJkLmNoP',
			},
		});
	});

	it('returns to the agents list when no project was provided', async () => {
		mocks.route.query = {};

		mount(NewAgentView);
		await flushPromises();

		expect(mocks.syncThread).not.toHaveBeenCalled();
		expect(mocks.showError).toHaveBeenCalledWith(
			expect.any(Error),
			'agentSelector.createAgentFailed',
		);
		expect(mocks.replace).toHaveBeenCalledWith({ name: AGENTS_LIST_VIEW });
	});

	it('returns to the project agents list when the thread cannot be created', async () => {
		const error = new Error('sync failed');
		mocks.syncThread.mockRejectedValue(error);

		mount(NewAgentView);
		await flushPromises();

		expect(mocks.showError).toHaveBeenCalledWith(error, 'agentSelector.createAgentFailed');
		expect(mocks.replace).toHaveBeenCalledWith({
			name: PROJECT_AGENTS,
			params: { projectId: 'project-1' },
		});
	});
});
