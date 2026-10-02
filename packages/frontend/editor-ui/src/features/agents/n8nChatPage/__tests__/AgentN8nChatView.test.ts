/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils and @pinia/testing are transitive devDeps */
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { i18nInstance } from '@n8n/i18n';
import type { AgentChatListItem } from '@n8n/api-types';

import { mockedStore, type MockedStore } from '@/__tests__/utils';
import {
	createProjectListItem,
	createTestProject,
} from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';

import { AGENT_N8N_CHAT_VIEW } from '../../constants';
import { useAgentN8nChatThreadsStore } from '../n8nChatThreads.store';
import AgentN8nChatView from '../AgentN8nChatView.vue';

const getN8nChatAgentMock = vi.fn();
vi.mock('../../composables/useAgentApi', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../composables/useAgentApi')>();
	return { ...actual, getN8nChatAgent: (...args: unknown[]) => getN8nChatAgentMock(...args) };
});

// `useProjectsStore` calls `useRoute()` in its own setup to watch for a `projectId`
// param on whatever route is active. This view no longer carries one, but the
// store still needs a route object to read from.
const route = reactive<{ params: Record<string, string | undefined> }>({ params: {} });

const showErrorMock = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

vi.mock('../../components/AgentPersonalisationIcon.vue', () => ({
	default: { name: 'AgentPersonalisationIcon', template: '<div data-testid="stub-avatar" />' },
}));

const sendMessageFromOutsideMock = vi.fn();
const pushMock = vi.fn();
const replaceMock = vi.fn();
const backMock = vi.fn();
const resolveMock = vi.fn(() => ({
	href: '/resolved',
	matched: [{}],
}));
const historyBack = { value: undefined as string | undefined };

vi.mock('vue-router', () => ({
	RouterLink: { template: '<a><slot /></a>' },
	useRoute: () => route,
	useRouter: () => ({
		push: pushMock,
		replace: replaceMock,
		back: backMock,
		resolve: resolveMock,
		options: {
			history: {
				get state() {
					return { back: historyBack.value };
				},
			},
		},
	}),
}));

function renderView(
	props: { agentId?: string; agentThreadId?: string } = {},
	configureStore: (store: MockedStore<typeof useProjectsStore>) => void = () => {},
) {
	const pinia = createTestingPinia();
	const projectsStore = mockedStore(useProjectsStore);
	projectsStore.myProjects = [];
	projectsStore.personalProject = null;
	configureStore(projectsStore);

	return mount(AgentN8nChatView, {
		props: { agentId: 'agent-1', ...props },
		global: {
			plugins: [pinia, i18nInstance],
			stubs: {
				AgentChatPanel: {
					name: 'AgentChatPanel',
					template: `
						<div data-testid="chat-panel-stub">
							<div data-testid="stub-empty-state"><slot name="empty-state" /></div>
							<div data-testid="stub-input-footer"><slot name="input-footer" /></div>
						</div>
					`,
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
						'centerEmptyState',
					],
					emits: ['session-created', 'update:streaming'],
					methods: { sendMessageFromOutside: sendMessageFromOutsideMock },
				},
			},
		},
	});
}

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

describe('AgentN8nChatView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		historyBack.value = undefined;
		getN8nChatAgentMock.mockResolvedValue(agentItem);
	});

	it('shows the chat history button only once the agent has loaded', async () => {
		let resolveAgent: (value: AgentChatListItem) => void = () => {};
		getN8nChatAgentMock.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveAgent = resolve;
			}),
		);
		const wrapper = renderView();
		await flushPromises();

		expect(wrapper.find('[data-test-id="agent-n8n-chat-history-toggle"]').exists()).toBe(false);

		resolveAgent(agentItem);
		await flushPromises();

		expect(wrapper.find('[data-test-id="agent-n8n-chat-history-toggle"]').exists()).toBe(true);
	});

	it('renders the agent avatar, name, description, and the placeholder-driving name', async () => {
		const wrapper = renderView();
		await flushPromises();

		expect(getN8nChatAgentMock).toHaveBeenCalledWith(expect.anything(), 'agent-1');
		expect(wrapper.find('[data-testid="stub-avatar"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('Support Agent');
		expect(wrapper.text()).toContain('Answers billing questions.');
		const panel = wrapper.findComponent({ name: 'AgentChatPanel' });
		expect(panel.props('projectId')).toBe('project-1');
		expect(panel.props('agentConfig')).toMatchObject({ name: 'Support Agent' });
		expect(panel.props('channel')).toBe('n8n-chat');
	});

	it('shows "Personal" with a project icon for the personal project', async () => {
		const personalProject = createTestProject({ id: 'project-1', type: ProjectTypes.Personal });
		const wrapper = renderView({}, (store) => {
			store.personalProject = personalProject;
		});
		await flushPromises();

		const footer = wrapper.get('[data-testid="agent-n8n-chat-project"]');
		expect(footer.text()).toContain('Personal');
	});

	it('shows the project name for a team project', async () => {
		const wrapper = renderView();
		await flushPromises();

		const footer = wrapper.get('[data-testid="agent-n8n-chat-project"]');
		expect(footer.text()).toContain('Marketing');
	});

	it('shows the agent page link only with agent:read in that project', async () => {
		const withRead = renderView({}, (store) => {
			store.myProjects = [{ ...createProjectListItem(), id: 'project-1', scopes: ['agent:read'] }];
		});
		await flushPromises();
		expect(withRead.find('[data-testid="agent-n8n-chat-open-page"]').exists()).toBe(true);
	});

	it('hides the agent page link without agent:read in that project', async () => {
		const withoutRead = renderView({}, (store) => {
			store.myProjects = [{ ...createProjectListItem(), id: 'project-1', scopes: [] }];
		});
		await flushPromises();
		expect(withoutRead.find('[data-testid="agent-n8n-chat-open-page"]').exists()).toBe(false);
	});

	it('shows an unavailable empty state on a 404', async () => {
		getN8nChatAgentMock.mockRejectedValue({ httpStatusCode: 404 });
		const wrapper = renderView();
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-n8n-chat-unavailable"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('This agent is not available');
		expect(wrapper.find('[data-testid="chat-panel-stub"]').exists()).toBe(false);
	});

	it('toasts on a non-404 load failure instead of showing the unavailable state', async () => {
		getN8nChatAgentMock.mockRejectedValue(new Error('network down'));
		const wrapper = renderView();
		await flushPromises();

		expect(showErrorMock).toHaveBeenCalled();
		expect(wrapper.find('[data-testid="agent-n8n-chat-unavailable"]').exists()).toBe(false);
	});

	it('shows a retryable error state on a non-404 load failure and reloads on retry', async () => {
		getN8nChatAgentMock.mockRejectedValue(new Error('network down'));
		const wrapper = renderView();
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-n8n-chat-load-error"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="chat-panel-stub"]').exists()).toBe(false);
		const errorState = wrapper.get('[data-testid="agent-n8n-chat-load-error"]');

		getN8nChatAgentMock.mockResolvedValueOnce(agentItem);
		await errorState.get('button').trigger('click');
		await flushPromises();

		expect(getN8nChatAgentMock).toHaveBeenCalledTimes(2);
		expect(wrapper.find('[data-testid="agent-n8n-chat-load-error"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="chat-panel-stub"]').exists()).toBe(true);
	});

	it('loads history via the agentThreadId prop and marks the session as continued', async () => {
		const wrapper = renderView({ agentThreadId: 'thread-99' });
		await flushPromises();

		const panel = wrapper.findComponent({ name: 'AgentChatPanel' });
		expect(panel.props('continueSessionId')).toBe('thread-99');
		expect(panel.props('newSession')).toBe(false);
	});

	it('mints a session id and reports it as new when there is no agentThreadId prop', async () => {
		const wrapper = renderView();
		await flushPromises();

		const panel = wrapper.findComponent({ name: 'AgentChatPanel' });
		expect(panel.props('continueSessionId')).toEqual(expect.any(String));
		expect(panel.props('newSession')).toBe(true);
	});

	it('replaces the route with the new thread id when the panel reports a session was created', async () => {
		const wrapper = renderView();
		await flushPromises();

		const panel = wrapper.findComponent({ name: 'AgentChatPanel' });
		const mintedId = panel.props('continueSessionId') as string;

		panel.vm.$emit('session-created', mintedId);
		await flushPromises();

		expect(replaceMock).toHaveBeenCalledWith({
			name: AGENT_N8N_CHAT_VIEW,
			params: { agentId: 'agent-1', agentThreadId: mintedId },
		});
	});

	it('mints a new session id for the same agent once the route drops back to no thread id', async () => {
		const wrapper = renderView({ agentThreadId: 'thread-99' });
		await flushPromises();

		await wrapper.setProps({ agentThreadId: undefined });
		await flushPromises();

		const panel = wrapper.findComponent({ name: 'AgentChatPanel' });
		expect(panel.props('continueSessionId')).toEqual(expect.any(String));
		expect(panel.props('continueSessionId')).not.toBe('thread-99');
		expect(panel.props('newSession')).toBe(true);
	});

	it('keeps the minted id present when landing on a thread URL and navigating back to no thread', async () => {
		const wrapper = renderView({ agentThreadId: 'thread-1' });
		await flushPromises();

		await wrapper.setProps({ agentThreadId: undefined });
		await flushPromises();

		const panel = wrapper.findComponent({ name: 'AgentChatPanel' });
		expect(panel.props('continueSessionId')).toEqual(expect.any(String));
	});

	it('goes back in-app when the previous route resolves', async () => {
		historyBack.value = '/some/previous/route';
		const wrapper = renderView();
		await flushPromises();

		await wrapper.get('[data-testid="n8n-chat-back"]').trigger('click');
		expect(backMock).toHaveBeenCalled();
		expect(pushMock).not.toHaveBeenCalled();
	});

	it('falls back to the n8n Assistant view when there is no in-app history', async () => {
		historyBack.value = undefined;
		const wrapper = renderView();
		await flushPromises();

		await wrapper.get('[data-testid="n8n-chat-back"]').trigger('click');
		expect(pushMock).toHaveBeenCalledWith({ name: INSTANCE_AI_VIEW });
		expect(backMock).not.toHaveBeenCalled();
	});

	describe('refreshing the n8n Chat threads store', () => {
		it('does not refresh when a session is created, only when a turn finishes streaming', async () => {
			const wrapper = renderView();
			await flushPromises();
			const threadsStore = mockedStore(useAgentN8nChatThreadsStore);
			const panel = wrapper.findComponent({ name: 'AgentChatPanel' });
			const mintedId = panel.props('continueSessionId') as string;

			panel.vm.$emit('session-created', mintedId);
			await flushPromises();
			expect(threadsStore.fetchRecent).not.toHaveBeenCalled();

			panel.vm.$emit('update:streaming', true);
			panel.vm.$emit('update:streaming', false);
			await flushPromises();
			expect(threadsStore.fetchRecent).toHaveBeenCalledTimes(1);

			// Every later turn refreshes too — order and title can change on any of them.
			panel.vm.$emit('update:streaming', true);
			panel.vm.$emit('update:streaming', false);
			await flushPromises();
			expect(threadsStore.fetchRecent).toHaveBeenCalledTimes(2);
		});

		it('does not refresh while still streaming or on an unmatched streaming toggle', async () => {
			const wrapper = renderView({ agentThreadId: 'thread-99' });
			await flushPromises();
			const threadsStore = mockedStore(useAgentN8nChatThreadsStore);
			const panel = wrapper.findComponent({ name: 'AgentChatPanel' });

			panel.vm.$emit('update:streaming', true);
			await flushPromises();

			expect(threadsStore.fetchRecent).not.toHaveBeenCalled();
		});
	});
});
