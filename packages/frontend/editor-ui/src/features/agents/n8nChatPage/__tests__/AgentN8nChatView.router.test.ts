/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils and @pinia/testing are transitive devDeps */
// A real memory-history router, unlike the rest of this view's tests: router.replace
// after a session is created really changes the `agentThreadId` prop, which is what
// exposed the regression where the sidebar refresh watcher reset itself on that
// navigation and swallowed the title refresh.
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { i18nInstance } from '@n8n/i18n';
import type { AgentChatListItem } from '@n8n/api-types';

import { mockedStore } from '@/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { AGENT_N8N_CHAT_VIEW } from '../../constants';
import { useAgentN8nChatThreadsStore } from '../n8nChatThreads.store';
import AgentN8nChatView from '../AgentN8nChatView.vue';

const getN8nChatAgentMock = vi.fn();
vi.mock('../../composables/useAgentApi', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../composables/useAgentApi')>();
	return { ...actual, getN8nChatAgent: (...args: unknown[]) => getN8nChatAgentMock(...args) };
});

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('../../components/AgentPersonalisationIcon.vue', () => ({
	default: { name: 'AgentPersonalisationIcon', template: '<div data-testid="stub-avatar" />' },
}));

const agentItem: AgentChatListItem = {
	id: 'agent-1',
	name: 'Support Agent',
	description: 'Answers billing questions.',
	personalisation: {
		icon: 'bot',
		gradient: { from: '#000000', to: '#FFFFFF', angle: 0, fromStop: 0, toStop: 100 },
	},
	project: { id: 'project-1', name: 'Marketing' },
};

const AgentChatPanelStub = {
	name: 'AgentChatPanel',
	template: '<div data-testid="chat-panel-stub" />',
	props: [
		'projectId',
		'agentId',
		'mode',
		'continueSessionId',
		'newSession',
		'agentConfig',
		'agentStatus',
		'connectedTriggers',
		'channel',
	],
	emits: ['session-created', 'update:streaming'],
};

async function renderOnRoute(path: string) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{
				path: '/assistant/agents/:agentId/:agentThreadId?',
				name: AGENT_N8N_CHAT_VIEW,
				component: AgentN8nChatView,
				props: true,
			},
		],
	});
	await router.push(path);
	await router.isReady();

	const pinia = createTestingPinia();
	const projectsStore = mockedStore(useProjectsStore);
	projectsStore.myProjects = [];
	projectsStore.personalProject = null;

	const wrapper = mount(RouterView, {
		global: {
			plugins: [pinia, i18nInstance, router],
			stubs: { AgentChatPanel: AgentChatPanelStub },
		},
	});
	return { wrapper, router };
}

describe('AgentN8nChatView with a real router', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getN8nChatAgentMock.mockResolvedValue(agentItem);
	});

	it('refreshes the sidebar on every turn, including the first, after router.replace updates agentThreadId', async () => {
		const { wrapper } = await renderOnRoute('/assistant/agents/agent-1');
		await flushPromises();
		const threadsStore = mockedStore(useAgentN8nChatThreadsStore);
		const panel = wrapper.findComponent(AgentChatPanelStub);
		const mintedId = panel.props('continueSessionId') as string;

		// Mirrors the real flow: the panel reports the session, the view navigates to
		// it, and the route (a real one, with `props: true`) really updates the prop.
		await panel.vm.$emit('session-created', mintedId);
		await flushPromises();
		expect(wrapper.findComponent(AgentChatPanelStub).props('continueSessionId')).toBe(mintedId);
		// `newSession` derives from `!props.agentThreadId` — the route now carries one.
		expect(wrapper.findComponent(AgentChatPanelStub).props('newSession')).toBe(false);

		const updatedPanel = wrapper.findComponent(AgentChatPanelStub);
		await updatedPanel.vm.$emit('update:streaming', true);
		await updatedPanel.vm.$emit('update:streaming', false);
		await flushPromises();

		expect(threadsStore.fetchRecent).toHaveBeenCalledTimes(1);

		// A later turn, now permanently on the thread URL, still refreshes.
		await updatedPanel.vm.$emit('update:streaming', true);
		await updatedPanel.vm.$emit('update:streaming', false);
		await flushPromises();

		expect(threadsStore.fetchRecent).toHaveBeenCalledTimes(2);
	});
});
