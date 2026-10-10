/* eslint-disable import-x/no-extraneous-dependencies -- test-only patterns */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import AgentSessionTimelineView from '../views/AgentSessionTimelineView.vue';
import AgentSessionTimelinePanel from '../components/AgentSessionTimelinePanel.vue';
import AgentSessionTimelineHeader from '../components/AgentSessionTimelineHeader.vue';
import SessionTimelineSidePanel from '../components/SessionTimelineSidePanel.vue';
import { AGENT_SESSION_DETAIL_VIEW } from '../constants';

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

vi.mock('vue-router', () => ({
	useRoute: () => ({ params: routeParams, query: {} }),
	useRouter: () => ({
		push: routerPush,
		resolve: () => ({ href: '#' }),
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
	}),
}));

vi.mock('@/features/agents/composables/useAgentSessionLangSmithExport', () => ({
	useAgentSessionLangSmithExport: () => ({
		isEnabled: false,
		isExporting: false,
		sendSession: vi.fn(),
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
		routeParams.threadId = 'thread-a';
	});

	afterEach(() => {
		vi.clearAllMocks();
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
		expect(wrapper.findComponent(SessionTimelineSidePanel).props('metadata')).toEqual({
			trigger: { source: null, icon: 'bolt-filled', label: '' },
			totalTokens: 30,
			totalCost: 0.5,
			durationLabel: '1.5s',
		});
	});

	it('navigates to the selected session', async () => {
		const wrapper = await renderTimeline();

		await wrapper.findComponent(AgentSessionTimelineHeader).vm.$emit('session-select', 'thread-c');

		expect(routerPush).toHaveBeenCalledExactlyOnceWith({
			name: AGENT_SESSION_DETAIL_VIEW,
			params: { projectId: 'p1', agentId: 'a1', threadId: 'thread-c' },
		});
	});

	it('keeps the timeline visible when the side panel is toggled', async () => {
		const wrapper = await renderTimeline();
		const sidePanel = wrapper.findComponent(SessionTimelineSidePanel);
		const wasVisible = sidePanel.props('isVisible');

		await wrapper.findComponent(AgentSessionTimelineHeader).vm.$emit('toggle-side-panel');
		await nextTick();

		expect(sidePanel.props('isVisible')).toBe(!wasVisible);
		expect(wrapper.findComponent(AgentSessionTimelinePanel).exists()).toBe(true);
	});
});
