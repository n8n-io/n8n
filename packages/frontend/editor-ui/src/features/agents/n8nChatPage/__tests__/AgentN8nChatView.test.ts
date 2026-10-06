/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern: @vue/test-utils and @pinia/testing are transitive devDeps */
import { inject, nextTick, reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { i18nInstance } from '@n8n/i18n';
import type { AgentN8nChatAgentDetails } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { mockedStore, type MockedStore } from '@/__tests__/utils';
import {
	createProjectListItem,
	createTestProject,
} from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';

import { AGENT_N8N_CHAT_VIEW } from '../../constants';
import { AGENT_SUB_AGENT_NAMES_KEY } from '../../components/agentChatInjectionKeys';
import { useAgentN8nChatThreadsStore } from '../n8nChatThreads.store';
import { consumePendingN8nChatMessage, stashPendingN8nChatMessage } from '../pendingN8nChatMessage';
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
	// Runs before mount, so a preset `recentThreads` is in place for the view's
	// immediate watcher — setting it only after `renderView` returns is too late.
	configureThreadsStore: (
		store: MockedStore<typeof useAgentN8nChatThreadsStore>,
	) => void = () => {},
) {
	const pinia = createTestingPinia();
	const projectsStore = mockedStore(useProjectsStore);
	projectsStore.myProjects = [];
	projectsStore.personalProject = null;
	configureStore(projectsStore);
	configureThreadsStore(mockedStore(useAgentN8nChatThreadsStore));

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
						'attachmentCapabilities',
						'agentStatus',
						'connectedTriggers',
						'channel',
						'backgroundJobsActive',
						'centerEmptyState',
					],
					emits: ['session-created', 'update:streaming', 'first-user-message', 'agent-unavailable'],
					setup: () => ({ subAgentNames: inject(AGENT_SUB_AGENT_NAMES_KEY) }),
					methods: { sendMessageFromOutside: sendMessageFromOutsideMock },
				},
			},
		},
	});
}

const agentItem: AgentN8nChatAgentDetails = {
	id: 'agent-1',
	name: 'Support Agent',
	description: 'Answers billing questions.',
	personalisation: {
		icon: 'bot',
		gradient: { from: '#000000', to: '#FFFFFF', angle: 0, fromStop: 0, toStop: 100 },
	},
	project: { id: 'project-1', name: 'Marketing' },
	attachments: { image: true, pdf: true, audio: false },
	subAgents: [],
};

describe('AgentN8nChatView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		historyBack.value = undefined;
		getN8nChatAgentMock.mockResolvedValue(agentItem);
	});

	it('shows the chat history button only once the agent has loaded', async () => {
		let resolveAgent: (value: AgentN8nChatAgentDetails) => void = () => {};
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

	describe('thread title on the history button', () => {
		const toggleText = (wrapper: ReturnType<typeof renderView>) =>
			wrapper.get('[data-test-id="agent-n8n-chat-history-toggle"]').text();
		const recentThread = (title: string | null) => ({
			id: 'thread-9',
			title,
			updatedAt: '2026-01-01T00:00:00.000Z',
			agent: { id: 'agent-1', name: 'Support Agent', projectId: 'project-1' },
		});

		it('shows the open thread title instead of "Chat history"', async () => {
			const wrapper = renderView({ agentThreadId: 'thread-9' });
			mockedStore(useAgentN8nChatThreadsStore).recentThreads = [recentThread('Budget questions')];
			await flushPromises();

			expect(toggleText(wrapper)).toBe('Budget questions');
		});

		it('falls back to "New conversation" for an untitled thread', async () => {
			const wrapper = renderView({ agentThreadId: 'thread-9' });
			mockedStore(useAgentN8nChatThreadsStore).recentThreads = [recentThread(null)];
			await flushPromises();

			expect(toggleText(wrapper)).toBe('New conversation');
		});

		it('uses the first user message, cut to 60 characters, until the thread has a title', async () => {
			const wrapper = renderView({ agentThreadId: 'thread-9' });
			await flushPromises();
			const message = 'Please review this offer letter for the senior engineer role in Berlin';
			wrapper.findComponent({ name: 'AgentChatPanel' }).vm.$emit('first-user-message', message);
			await flushPromises();

			expect(toggleText(wrapper)).toBe(`${message.slice(0, 60)}…`);
		});

		it('keeps "Chat history" on a new chat', async () => {
			const wrapper = renderView();
			mockedStore(useAgentN8nChatThreadsStore).recentThreads = [recentThread('Budget questions')];
			await flushPromises();

			expect(toggleText(wrapper)).toBe('Chat history');
		});
	});

	describe('loading a thread missing from recentThreads', () => {
		it("fetches it when the open thread isn't in the list", async () => {
			renderView({ agentThreadId: 'thread-9' });
			await flushPromises();

			expect(mockedStore(useAgentN8nChatThreadsStore).loadThread).toHaveBeenCalledWith('thread-9');
		});

		it('does not fetch it when the thread is already in the list', async () => {
			renderView({ agentThreadId: 'thread-9' }, undefined, (store) => {
				store.recentThreads = [
					{
						id: 'thread-9',
						title: 'Budget questions',
						updatedAt: '2026-01-01T00:00:00.000Z',
						agent: { id: 'agent-1', name: 'Support Agent', projectId: 'project-1' },
					},
				];
			});
			await flushPromises();

			expect(mockedStore(useAgentN8nChatThreadsStore).loadThread).not.toHaveBeenCalled();
		});

		it('does not fetch anything on a new chat', async () => {
			renderView();
			await flushPromises();

			expect(mockedStore(useAgentN8nChatThreadsStore).loadThread).not.toHaveBeenCalled();
		});
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
		// n8n Chat has parity with Preview: background tasks poll once the agent loads.
		expect(panel.props('backgroundJobsActive')).toBe(true);
	});

	it('provides the agent sub-agents as an id → name map', async () => {
		getN8nChatAgentMock.mockResolvedValue({
			...agentItem,
			subAgents: [
				{ id: 'sub-1', name: 'Research Agent' },
				{ id: 'sub-2', name: 'Writer Agent' },
			],
		});
		const wrapper = renderView();
		await flushPromises();

		const panel = wrapper.findComponent({ name: 'AgentChatPanel' });
		expect([
			...(panel.vm as unknown as { subAgentNames: Map<string, string> }).subAgentNames,
		]).toEqual([
			['sub-1', 'Research Agent'],
			['sub-2', 'Writer Agent'],
		]);
	});

	it('passes the attachment capabilities the route resolved for this agent', async () => {
		const wrapper = renderView();
		await flushPromises();

		const panel = wrapper.findComponent({ name: 'AgentChatPanel' });
		expect(panel.props('attachmentCapabilities')).toEqual({
			image: true,
			pdf: true,
			audio: false,
		});
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

	it('drops a load failure that settles after unmount — no toast', async () => {
		const response = createDeferredPromise<AgentN8nChatAgentDetails>();
		getN8nChatAgentMock.mockReturnValueOnce(response.promise);
		const wrapper = renderView();
		await flushPromises();

		wrapper.unmount();
		response.reject(new Error('network down'));
		await flushPromises();

		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('fetches the new agent and clears the unavailable state when agentId changes after a 404', async () => {
		getN8nChatAgentMock.mockRejectedValueOnce({ httpStatusCode: 404 });
		const wrapper = renderView();
		await flushPromises();
		expect(wrapper.find('[data-testid="agent-n8n-chat-unavailable"]').exists()).toBe(true);

		getN8nChatAgentMock.mockResolvedValueOnce({ ...agentItem, id: 'agent-2', name: 'Other Agent' });
		await wrapper.setProps({ agentId: 'agent-2' });
		await flushPromises();

		expect(getN8nChatAgentMock).toHaveBeenLastCalledWith(expect.anything(), 'agent-2');
		expect(wrapper.find('[data-testid="agent-n8n-chat-unavailable"]').exists()).toBe(false);
		expect(wrapper.text()).toContain('Other Agent');
	});

	it('switches to the unavailable empty state when the panel reports the agent is no longer available', async () => {
		const wrapper = renderView();
		await flushPromises();

		expect(wrapper.find('[data-testid="chat-panel-stub"]').exists()).toBe(true);
		const panel = wrapper.findComponent({ name: 'AgentChatPanel' });
		await panel.vm.$emit('agent-unavailable');
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-n8n-chat-unavailable"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="chat-panel-stub"]').exists()).toBe(false);
	});

	it("ignores a late unavailable event from the previous agent's panel while the next agent loads", async () => {
		const wrapper = renderView();
		await flushPromises();
		const oldPanel = wrapper.findComponent({ name: 'AgentChatPanel' });

		const nextAgent = createDeferredPromise<AgentChatListItem>();
		getN8nChatAgentMock.mockReturnValueOnce(nextAgent.promise);
		const rerender = wrapper.setProps({ agentId: 'agent-2' });
		// The old panel is still mounted until the re-render after the agent change.
		await nextTick();
		oldPanel.vm.$emit('agent-unavailable');
		await rerender;
		nextAgent.resolve({ ...agentItem, id: 'agent-2', name: 'Other Agent' });
		await flushPromises();

		expect(wrapper.find('[data-testid="agent-n8n-chat-unavailable"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="chat-panel-stub"]').exists()).toBe(true);
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

	it('goes to the n8n Assistant page, not back in history, even with in-app history', async () => {
		historyBack.value = '/some/previous/route';
		const wrapper = renderView();
		await flushPromises();

		await wrapper.get('[data-testid="n8n-chat-back"]').trigger('click');
		expect(pushMock).toHaveBeenCalledWith({ name: INSTANCE_AI_VIEW });
		expect(backMock).not.toHaveBeenCalled();
	});

	describe('a pending message handed off from the n8n Assistant picker', () => {
		it('sends it once the panel loads, with its text and files', async () => {
			const file = new File(['a'], 'a.txt');
			stashPendingN8nChatMessage({ agentId: 'agent-1', text: 'hello agent', files: [file] });

			renderView();
			await flushPromises();

			expect(sendMessageFromOutsideMock).toHaveBeenCalledExactlyOnceWith('hello agent', [file]);
		});

		it('sends nothing when there is no pending message', async () => {
			renderView();
			await flushPromises();

			expect(sendMessageFromOutsideMock).not.toHaveBeenCalled();
		});

		it('sends nothing when the URL already has a thread id', async () => {
			stashPendingN8nChatMessage({ agentId: 'agent-1', text: 'hello agent', files: [] });

			renderView({ agentThreadId: 'thread-99' });
			await flushPromises();

			expect(sendMessageFromOutsideMock).not.toHaveBeenCalled();
			expect(consumePendingN8nChatMessage('agent-1')).toBeUndefined();
		});

		it('drops the pending message when the agent cannot load', async () => {
			getN8nChatAgentMock.mockRejectedValue({ httpStatusCode: 404 });
			stashPendingN8nChatMessage({ agentId: 'agent-1', text: 'hello agent', files: [] });

			renderView();
			await flushPromises();

			expect(sendMessageFromOutsideMock).not.toHaveBeenCalled();
			expect(consumePendingN8nChatMessage('agent-1')).toBeUndefined();
		});

		it('ignores a pending message stored for a different agent', async () => {
			stashPendingN8nChatMessage({ agentId: 'agent-2', text: 'hello agent', files: [] });

			renderView({ agentId: 'agent-1' });
			await flushPromises();

			expect(sendMessageFromOutsideMock).not.toHaveBeenCalled();
		});

		it('discards a hand-off for an agent abandoned before its panel ever mounts', async () => {
			// `RouterView` isn't keyed on `agentId`: this same view instance is reused
			// for agent-2 while agent-1 is still loading, so agent-1's panel never mounts.
			const agentOneLoad = createDeferredPromise<AgentN8nChatAgentDetails>();
			const agentTwoLoad = createDeferredPromise<AgentN8nChatAgentDetails>();
			getN8nChatAgentMock.mockReturnValueOnce(agentOneLoad.promise);
			getN8nChatAgentMock.mockReturnValueOnce(agentTwoLoad.promise);
			stashPendingN8nChatMessage({ agentId: 'agent-1', text: 'hello agent one', files: [] });

			const wrapper = renderView({ agentId: 'agent-1' });
			await flushPromises();

			await wrapper.setProps({ agentId: 'agent-2' });
			await flushPromises();

			agentTwoLoad.resolve({ ...agentItem, id: 'agent-2', name: 'Other Agent' });
			await flushPromises();
			agentOneLoad.resolve(agentItem);
			await flushPromises();

			expect(sendMessageFromOutsideMock).not.toHaveBeenCalled();
		});
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
