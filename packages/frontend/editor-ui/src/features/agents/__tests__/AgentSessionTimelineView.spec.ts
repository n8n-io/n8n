/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import type * as AgentThreadsApiModule from '../composables/useAgentThreadsApi';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shallowMount, flushPromises, enableAutoUnmount } from '@vue/test-utils';
import { nextTick, reactive, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { N8nIconButton } from '@n8n/design-system';
import AgentSessionTimelineView from '../views/AgentSessionTimelineView.vue';
import AgentSessionTimelinePanel from '../components/AgentSessionTimelinePanel.vue';
import AgentSessionTimelineHeader from '../components/AgentSessionTimelineHeader.vue';
import { AGENT_SESSION_DETAIL_VIEW, AGENT_SESSIONS_LIST_VIEW } from '../constants';

enableAutoUnmount(afterEach);

function sessionThread(id: string) {
	return {
		id,
		projectId: 'p1',
		agentId: 'a1',
		canContinueInPreview: true,
		updatedAt: '2026-01-01T00:00:00.000Z',
		title: 'Session title',
		totalPromptTokens: 10,
		totalCompletionTokens: 20,
		totalCost: 0.5,
		totalDuration: 1500,
	};
}

const routeParams = reactive({ projectId: 'p1', agentId: 'a1', threadId: 'thread-a' });
const routerPush = vi.fn();
const sessionThreads = reactive([sessionThread('thread-a'), sessionThread('thread-c')]);
const fetchSessionThreads = vi.fn().mockResolvedValue(undefined);
const fetchConfig = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/agents/composables/useAgentExecutionUpdates', () => ({
	useAgentExecutionUpdates: vi.fn(),
}));

const clipboardCopy = vi.fn().mockResolvedValue(undefined);
const deleteThread = vi.fn().mockResolvedValue(undefined);
const confirmDeletion = vi.fn().mockResolvedValue('confirm');
const showError = vi.fn();
const showMessage = vi.fn();
const canDeleteSession = ref(true);
const canExecute = ref(true);
const stopSession = vi.hoisted(() => vi.fn());
const sendSession = vi.fn();

vi.mock('@n8n/composables/useClipboard', () => ({ useClipboard: () => ({ copy: clipboardCopy }) }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError, showMessage }) }));
vi.mock('../composables/useAgentPermissions', () => ({
	useAgentPermissions: () => ({ canUpdate: canDeleteSession, canExecute }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));
vi.mock('../composables/useAgentThreadsApi', async (importOriginal) => ({
	...(await importOriginal<typeof AgentThreadsApiModule>()),
	stopSession,
}));
vi.mock('../composables/useAgentConfirmationModal', () => ({
	useAgentConfirmationModal: () => ({ openAgentConfirmationModal: confirmDeletion }),
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: routeParams, query: {} }),
	useRouter: () => ({
		push: routerPush,
		resolve: () => ({ href: '/projects/p1/agents/a1/sessions/thread-a' }),
		options: { history: { state: {} } },
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({ personalProject: { id: 'p1' }, currentProject: null, myProjects: [] }),
}));

vi.mock('@/features/agents/agentSessions.store', () => ({
	useAgentSessionsStore: () => ({
		threads: sessionThreads,
		fetchThreads: fetchSessionThreads,
		deleteThread,
	}),
}));

vi.mock('@/features/agents/composables/useAgentSessionLangSmithExport', () => ({
	useAgentSessionLangSmithExport: () => ({
		isEnabled: false,
		isExporting: false,
		sendSession,
	}),
}));

vi.mock('@/features/agents/composables/useAgentConfig', () => ({
	useAgentConfig: () => ({
		config: { value: null },
		fetchConfig,
	}),
}));

async function renderTimeline() {
	const wrapper = shallowMount(AgentSessionTimelineView);
	await flushPromises();
	wrapper.findComponent(AgentSessionTimelinePanel).vm.$emit('loaded', {
		thread: sessionThread('thread-a'),
		executions: [],
	});
	await nextTick();
	return wrapper;
}

describe('AgentSessionTimelineView', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		fetchSessionThreads.mockReset().mockResolvedValue(undefined);
		routeParams.threadId = 'thread-a';
		canDeleteSession.value = true;
		canExecute.value = true;
		stopSession.mockReset().mockResolvedValue({ cancelRequested: true });
		confirmDeletion.mockResolvedValue('confirm');
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('stops a running integration session and removes the icon after cancellation', async () => {
		const wrapper = await renderTimeline();
		const panel = wrapper.getComponent(AgentSessionTimelinePanel);
		const header = wrapper.getComponent(AgentSessionTimelineHeader);
		panel.vm.$emit('loaded', {
			thread: { ...sessionThread('thread-a'), canContinueInPreview: false },
			executions: [{ id: 'e1', source: 'slack', status: 'running' }],
		});
		await nextTick();
		expect(header.props('showStop')).toBe(true);

		const pending = Promise.withResolvers<{ cancelRequested: boolean }>();
		stopSession.mockReturnValueOnce(pending.promise);
		header.vm.$emit('stop');
		header.vm.$emit('stop');
		await nextTick();
		expect(header.props('stopLoading')).toBe(true);
		expect(stopSession).toHaveBeenCalledExactlyOnceWith({}, 'p1', 'a1', 'thread-a');
		pending.resolve({ cancelRequested: true });
		await flushPromises();
		expect(header.props('stopLoading')).toBe(false);
		expect(header.props('showStop')).toBe(true);

		panel.vm.$emit('loaded', {
			thread: sessionThread('thread-a'),
			executions: [{ id: 'e1', source: 'slack', status: 'cancelled' }],
		});
		await nextTick();
		expect(header.props('showStop')).toBe(false);
	});

	it.each(['success', 'error', 'cancelled', 'interrupted'])(
		'hides Stop for a %s execution',
		async (status) => {
			const wrapper = await renderTimeline();
			wrapper.getComponent(AgentSessionTimelinePanel).vm.$emit('loaded', {
				thread: sessionThread('thread-a'),
				executions: [{ id: 'e1', status }],
			});
			await nextTick();
			const header = wrapper.getComponent(AgentSessionTimelineHeader);
			expect(header.props('showStop')).toBe(false);
			header.vm.$emit('stop');
			expect(stopSession).not.toHaveBeenCalled();
		},
	);

	it('requires execute permission to stop a session', async () => {
		const wrapper = await renderTimeline();
		canExecute.value = false;
		wrapper.getComponent(AgentSessionTimelinePanel).vm.$emit('loaded', {
			thread: sessionThread('thread-a'),
			executions: [{ id: 'e1', status: 'running' }],
		});
		await nextTick();
		const header = wrapper.getComponent(AgentSessionTimelineHeader);
		expect(header.props('showStop')).toBe(false);
		header.vm.$emit('stop');
		expect(stopSession).not.toHaveBeenCalled();
	});

	it('keeps the stop action available after a failed request', async () => {
		const wrapper = await renderTimeline();
		wrapper.getComponent(AgentSessionTimelinePanel).vm.$emit('loaded', {
			thread: sessionThread('thread-a'),
			executions: [{ id: 'e1', status: 'running' }],
		});
		await nextTick();
		const error = new Error('Request failed');
		stopSession.mockRejectedValueOnce(error);
		const header = wrapper.getComponent(AgentSessionTimelineHeader);
		header.vm.$emit('stop');
		await flushPromises();
		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
		expect(header.props('stopLoading')).toBe(false);
		expect(header.props('showStop')).toBe(true);
		header.vm.$emit('stop');
		await flushPromises();
		expect(stopSession).toHaveBeenCalledTimes(2);
	});

	it('shows an accessible stop icon without a replacement label after stopping', async () => {
		const wrapper = shallowMount(AgentSessionTimelineHeader, {
			global: { stubs: { N8nTooltip: { template: '<slot />' } } },
			props: {
				breadcrumbItems: [],
				projectIcon: { type: 'icon', value: 'user' },
				sessionTitle: '',
				sessionOptions: [],
				showLangsmithExport: false,
				langsmithExportLoading: false,
				showStop: true,
			},
		});
		const stopButton = wrapper.get('[data-testid="agent-session-stop"]');
		expect(stopButton.attributes('aria-label')).toBe('Stop session');
		await stopButton.trigger('click');
		expect(wrapper.emitted('stop')).toEqual([[]]);
		await wrapper.setProps({ stopLoading: true });
		const stopIcon = wrapper
			.findAllComponents(N8nIconButton)
			.find((component) => component.attributes('data-testid') === 'agent-session-stop');
		expect(stopIcon?.props()).toMatchObject({
			variant: 'ghost',
			size: 'medium',
			icon: 'square',
			loading: true,
		});
		await wrapper.setProps({ showStop: false, stopLoading: false });
		expect(wrapper.find('[data-testid="agent-session-stop"]').exists()).toBe(false);
		expect(wrapper.text()).not.toContain('Session stopped');
	});

	it('loads configuration and sessions for the timeline', async () => {
		await renderTimeline();

		expect(fetchConfig).toHaveBeenCalledExactlyOnceWith('p1', 'a1');
		expect(fetchSessionThreads).toHaveBeenCalledExactlyOnceWith('p1', 'a1', {
			filters: expect.any(Object),
		});
	});

	it('renders the timeline without a preview dock', async () => {
		const wrapper = await renderTimeline();

		expect(wrapper.findComponent(AgentSessionTimelinePanel).exists()).toBe(true);
		expect(wrapper.find('agent-preview-dock-stub').exists()).toBe(false);
	});

	it('does not render Preview controls in the timeline header', () => {
		const wrapper = shallowMount(AgentSessionTimelineHeader, {
			props: {
				breadcrumbItems: [],
				projectIcon: { type: 'icon', value: 'user' },
				sessionTitle: '',
				sessionOptions: [],
				showLangsmithExport: false,
				langsmithExportLoading: false,
			},
		});

		expect(wrapper.find('[data-testid="agent-session-timeline-preview-btn"]').exists()).toBe(false);
	});

	it('shows the loaded title and metadata', async () => {
		const wrapper = await renderTimeline();

		expect(wrapper.findComponent(AgentSessionTimelineHeader).props('sessionTitle')).toBe(
			'Session title',
		);
		expect(wrapper.findComponent(AgentSessionTimelineHeader).props('metadata')).toEqual({
			trigger: { source: null, icon: 'bolt-filled', label: '' },
			totalTokens: 30,
			totalCost: 0.5,
			durationLabel: '1.5s',
		});
	});

	it('returns to the session list when closed without a previous route', async () => {
		const wrapper = await renderTimeline();
		wrapper.findComponent(AgentSessionTimelineHeader).vm.$emit('close');

		expect(routerPush).toHaveBeenCalledExactlyOnceWith({
			name: AGENT_SESSIONS_LIST_VIEW,
			params: { projectId: 'p1', agentId: 'a1' },
		});
	});

	it('gives the Close button an accessible name and emits close', async () => {
		const wrapper = shallowMount(AgentSessionTimelineHeader, {
			global: { stubs: { N8nTooltip: { template: '<slot />' } } },
			props: {
				breadcrumbItems: [],
				projectIcon: { type: 'icon', value: 'user' },
				sessionTitle: '',
				sessionOptions: [],
				showLangsmithExport: false,
				langsmithExportLoading: false,
			},
		});
		const button = wrapper.get('[data-testid="agent-session-timeline-close"]');

		expect(button.attributes('aria-label')).toBe('Close');
		await button.trigger('click');
		expect(wrapper.emitted('close')).toEqual([[]]);
		expect(wrapper.emitted('edit')).toBeUndefined();
	});

	it('copies a link to the loaded trace', async () => {
		const wrapper = await renderTimeline();
		wrapper.getComponent(AgentSessionTimelineHeader).vm.$emit('copy-link');
		await flushPromises();
		expect(clipboardCopy).toHaveBeenCalledExactlyOnceWith(
			new URL('/projects/p1/agents/a1/sessions/thread-a', window.location.origin).href,
		);
	});

	it('reports a clipboard failure', async () => {
		const error = new Error('Clipboard unavailable');
		clipboardCopy.mockRejectedValueOnce(error);
		const wrapper = await renderTimeline();
		wrapper.getComponent(AgentSessionTimelineHeader).vm.$emit('copy-link');
		await flushPromises();
		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
	});

	it('exports the current session', async () => {
		const wrapper = await renderTimeline();
		wrapper.getComponent(AgentSessionTimelineHeader).vm.$emit('langsmith-export');
		expect(sendSession).toHaveBeenCalledExactlyOnceWith({
			projectId: 'p1',
			agentId: 'a1',
			threadId: 'thread-a',
		});
	});

	it('confirms deletion and returns to the session list', async () => {
		const wrapper = await renderTimeline();
		wrapper.getComponent(AgentSessionTimelineHeader).vm.$emit('delete-session');
		await flushPromises();
		expect(confirmDeletion).toHaveBeenCalledOnce();
		expect(deleteThread).toHaveBeenCalledExactlyOnceWith('p1', 'a1', 'thread-a');
		expect(routerPush).toHaveBeenCalledExactlyOnceWith({
			name: AGENT_SESSIONS_LIST_VIEW,
			params: { projectId: 'p1', agentId: 'a1' },
		});
	});

	it('keeps the session when deletion is canceled', async () => {
		confirmDeletion.mockResolvedValueOnce('cancel');
		const wrapper = await renderTimeline();
		wrapper.getComponent(AgentSessionTimelineHeader).vm.$emit('delete-session');
		await flushPromises();
		expect(deleteThread).not.toHaveBeenCalled();
		expect(routerPush).not.toHaveBeenCalled();
	});

	it('requires permission to delete the session', async () => {
		canDeleteSession.value = false;
		const wrapper = await renderTimeline();
		wrapper.getComponent(AgentSessionTimelineHeader).vm.$emit('delete-session');
		await flushPromises();
		expect(confirmDeletion).not.toHaveBeenCalled();
		expect(deleteThread).not.toHaveBeenCalled();
	});

	it('does not delete after switching sessions during confirmation', async () => {
		let confirm: (value: string) => void = () => {};
		confirmDeletion.mockImplementationOnce(
			async () =>
				await new Promise<string>((resolve) => {
					confirm = resolve;
				}),
		);
		const wrapper = await renderTimeline();
		wrapper.getComponent(AgentSessionTimelineHeader).vm.$emit('delete-session');
		routeParams.threadId = 'thread-c';
		confirm('confirm');
		await flushPromises();
		expect(deleteThread).not.toHaveBeenCalled();
	});

	it('ignores a second delete request while confirmation is open', async () => {
		let confirm: (value: string) => void = () => {};
		confirmDeletion.mockImplementationOnce(
			async () =>
				await new Promise<string>((resolve) => {
					confirm = resolve;
				}),
		);
		const wrapper = await renderTimeline();
		const header = wrapper.getComponent(AgentSessionTimelineHeader);
		header.vm.$emit('delete-session');
		header.vm.$emit('delete-session');
		await nextTick();
		expect(header.props('isDeletingSession')).toBe(true);
		expect(confirmDeletion).toHaveBeenCalledOnce();
		confirm('confirm');
		await flushPromises();
		expect(deleteThread).toHaveBeenCalledOnce();
	});

	it('does not delete after leaving the trace during confirmation', async () => {
		let confirm: (value: string) => void = () => {};
		confirmDeletion.mockImplementationOnce(
			async () =>
				await new Promise<string>((resolve) => {
					confirm = resolve;
				}),
		);
		const wrapper = await renderTimeline();
		wrapper.getComponent(AgentSessionTimelineHeader).vm.$emit('delete-session');
		wrapper.unmount();
		confirm('confirm');
		await flushPromises();
		expect(deleteThread).not.toHaveBeenCalled();
	});

	it('reports deletion errors and keeps the trace open', async () => {
		const error = new Error('Request failed');
		deleteThread.mockRejectedValueOnce(error);
		const wrapper = await renderTimeline();
		wrapper.getComponent(AgentSessionTimelineHeader).vm.$emit('delete-session');
		await flushPromises();
		expect(showError).toHaveBeenCalledWith(error, expect.any(String));
		expect(routerPush).not.toHaveBeenCalled();
		expect(wrapper.getComponent(AgentSessionTimelineHeader).props('isDeletingSession')).toBe(false);
	});

	it('navigates to the selected session', async () => {
		const wrapper = await renderTimeline();

		await wrapper.findComponent(AgentSessionTimelineHeader).vm.$emit('session-select', 'thread-c');

		expect(routerPush).toHaveBeenCalledExactlyOnceWith({
			name: AGENT_SESSION_DETAIL_VIEW,
			params: { projectId: 'p1', agentId: 'a1', threadId: 'thread-c' },
		});
	});
});
