/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
	fetchThreads: vi.fn(),
	getThreadDetail: vi.fn(),
	routerPush: vi.fn(),
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({
		params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
	}),
	useRouter: () => ({
		push: mocks.routerPush,
		resolve: () => ({ href: '#' }),
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		personalProject: { id: 'project-1' },
		currentProject: { id: 'project-1', name: 'Project' },
		myProjects: [],
	}),
}));

vi.mock('../agentSessions.store', () => ({
	useAgentSessionsStore: () => ({
		threads: [],
		fetchThreads: mocks.fetchThreads,
		getThreadDetail: mocks.getThreadDetail,
	}),
}));

const baseText = (key: string) =>
	({
		'agentSessions.timeline.memory': 'Memory',
		'agentSessions.timeline.memory.empty': 'No memory has been saved for this session yet.',
		'agentSessions.timeline.events': 'Events',
		'agentSessions.timeline.user': 'User',
		'agentSessions.timeline.agent': 'Agent',
		'agentSessions.timeline.searchPlaceholder': 'Search',
		'projects.menu.personal': 'Personal',
	})[key] ?? key;

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText }),
	i18n: { baseText },
}));

vi.mock('@n8n/design-system', () => ({
	N8nBreadcrumbs: { template: '<div><slot name="append" /></div>', props: ['items', 'theme'] },
	N8nButton: {
		props: ['icon', 'label'],
		template:
			'<button v-bind="$attrs"><span v-if="icon" :data-icon="icon" /> <slot>{{ label }}</slot></button>',
	},
	N8nDropdownMenu: { template: '<div><slot name="trigger" /></div>', props: ['items'] },
	N8nIcon: { template: '<i :data-icon="icon" />', props: ['icon', 'size'] },
	N8nIconButton: {
		props: ['icon'],
		emits: ['click'],
		template:
			'<button v-bind="$attrs" @click="$emit(\'click\')"><span :data-icon="icon" /></button>',
	},
	N8nInput: { template: '<div><slot name="prefix" /></div>', props: ['modelValue'] },
	N8nText: { template: '<span><slot /></span>', props: ['bold'] },
}));

function makeThreadDetail(workingMemory: string | null) {
	return {
		thread: {
			id: 'thread-1',
			agentId: 'agent-1',
			agentName: 'Agent',
			projectId: 'project-1',
			sessionNumber: 1,
			title: null,
			emoji: null,
			totalPromptTokens: 0,
			totalCompletionTokens: 0,
			totalCost: 0,
			totalDuration: 0,
			createdAt: '2026-05-07T10:00:00Z',
			updatedAt: '2026-05-07T10:00:00Z',
			firstMessage: null,
		},
		executions: [
			{
				id: 'execution-1',
				threadId: 'thread-1',
				agentId: 'agent-1',
				status: 'success',
				createdAt: '2026-05-07T10:00:00Z',
				startedAt: '2026-05-07T10:00:00Z',
				stoppedAt: null,
				duration: 0,
				userMessage: 'Hello',
				assistantResponse: '',
				model: null,
				promptTokens: null,
				completionTokens: null,
				totalTokens: null,
				cost: null,
				toolCalls: null,
				timeline: null,
				error: null,
				hitlStatus: null,
				workingMemory: null,
				source: 'chat',
			},
		],
		workingMemory,
	};
}

async function mountTimeline(workingMemory: string | null) {
	mocks.getThreadDetail.mockResolvedValue(makeThreadDetail(workingMemory));
	const { default: AgentSessionTimelineView } = await import(
		'../views/AgentSessionTimelineView.vue'
	);
	const wrapper = mount(AgentSessionTimelineView, {
		global: {
			stubs: {
				SessionEventFilter: {
					template: '<button data-test-id="filter-trigger">Events</button>',
					props: ['available', 'selected'],
				},
				SessionTimelineChart: true,
				SessionTimelineTable: {
					template:
						'<div><button data-test-id="timeline-select" @click="$emit(\'select\', 0)">Select event</button></div>',
					props: ['items'],
					emits: ['select'],
				},
				SessionDetailPanel: {
					template: '<div data-test-id="event-detail"></div>',
					props: ['item'],
				},
			},
		},
	});
	await flushPromises();
	return wrapper;
}

describe('AgentSessionTimelineView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders a Memory button beside the Events filter', async () => {
		const wrapper = await mountTimeline('# Thread memory');

		expect(wrapper.find('[data-test-id="filter-trigger"]').text()).toContain('Events');
		const button = wrapper.find('[data-test-id="session-memory-trigger"]');
		expect(button.text()).toContain('Memory');
		expect(button.find('[data-icon="brain"]').exists()).toBe(true);
	});

	it('opens the memory drawer with the latest thread working memory', async () => {
		const wrapper = await mountTimeline('# Thread memory\n\n- Prefers concise answers');

		await wrapper.find('[data-test-id="session-memory-trigger"]').trigger('click');

		expect(wrapper.find('[data-test-id="session-memory-content"]').text()).toContain(
			'Prefers concise answers',
		);
	});

	it('shows an empty state when the thread has no saved memory', async () => {
		const wrapper = await mountTimeline(null);

		await wrapper.find('[data-test-id="session-memory-trigger"]').trigger('click');

		expect(wrapper.find('[data-test-id="session-memory-empty"]').text()).toContain(
			'No memory has been saved for this session yet.',
		);
	});

	it('switches from memory drawer to event detail when a timeline item is selected', async () => {
		const wrapper = await mountTimeline('# Thread memory');
		await wrapper.find('[data-test-id="session-memory-trigger"]').trigger('click');

		await wrapper.find('[data-test-id="timeline-select"]').trigger('click');

		expect(wrapper.find('[data-test-id="event-detail"]').exists()).toBe(true);
		expect(wrapper.find('[data-test-id="session-memory-content"]').exists()).toBe(false);
	});
});
