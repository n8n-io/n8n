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
	stashPendingAgentAttachment: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRoute: () => mocks.route,
	useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: mocks.showError }),
}));
vi.mock('@/features/ai/instanceAi/instanceAi.store', () => ({
	useInstanceAiStore: () => ({
		syncThread: mocks.syncThread,
		updateThreadMetadata: mocks.updateThreadMetadata,
	}),
}));
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	stashPendingAgentAttachment: mocks.stashPendingAgentAttachment,
}));
vi.mock('uuid', () => ({ v4: () => 'thread-1' }));
vi.mock('@n8n/utils/generate-nano-id', () => ({ generateNanoId: () => 'minted-agent-id' }));

describe('NewAgentView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.route.query = { projectId: 'project-1' };
	});

	it('opens a thread bound to a minted agent id without creating the agent', async () => {
		mount(NewAgentView);
		await flushPromises();

		expect(mocks.syncThread).toHaveBeenCalledWith('thread-1', 'project-1', {
			source: 'agent_builder_page',
			origin: 'internal',
			sourceContext: { agentId: 'minted-agent-id' },
		});
		expect(mocks.updateThreadMetadata).toHaveBeenCalledWith('thread-1', {
			instanceAiAgentBuilderTarget: {
				agentId: 'minted-agent-id',
				projectId: 'project-1',
				name: 'agents.new.defaultName',
				pending: true,
			},
		});
		expect(mocks.stashPendingAgentAttachment).toHaveBeenCalledWith('thread-1', {
			type: 'agent',
			id: 'minted-agent-id',
			name: 'agents.new.defaultName',
			projectId: 'project-1',
		});
		expect(mocks.replace).toHaveBeenCalledWith({
			name: INSTANCE_AI_THREAD_VIEW,
			params: { threadId: 'thread-1' },
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

	it('returns to the project agents list when the thread cannot be opened', async () => {
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
