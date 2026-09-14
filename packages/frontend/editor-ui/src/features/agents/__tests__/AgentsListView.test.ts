/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentResource } from '../types';

import AgentsListView from '../views/AgentsListView.vue';
import { instanceAiCreateAgentRoute } from '@/features/ai/instanceAi/createAgentRoute';
import { AGENT_BUILDER_VIEW, AGENT_DUPLICATE_MODAL_KEY, NEW_SESSION_PARAM } from '../constants';

const mocks = vi.hoisted(() => ({
	listAgentsPage: vi.fn(),
	listAgentsPageGlobal: vi.fn(),
	routerPush: vi.fn(),
	setTitle: vi.fn(),
	trackClickedNewAgent: vi.fn(),
	trackDuplicatedAgent: vi.fn(),
	duplicateAgent: vi.fn(),
	upsertProjectAgentsListCache: vi.fn(),
	routeProjectId: undefined as string | undefined,
	toastShowMessage: vi.fn(),
	toastShowError: vi.fn(),
	openModalWithData: vi.fn(),
}));

vi.mock('../composables/useAgentApi', () => ({
	listAgentsPage: mocks.listAgentsPage,
	listAgentsPageGlobal: mocks.listAgentsPageGlobal,
	duplicateAgent: mocks.duplicateAgent,
}));

vi.mock('../composables/useProjectAgentsList', () => ({
	upsertProjectAgentsListCache: mocks.upsertProjectAgentsListCache,
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		useRoute: () => ({ params: { projectId: mocks.routeProjectId }, query: {} }),
		useRouter: () => ({ push: mocks.routerPush }),
	};
});

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '/rest', pushRef: 'push-ref' } }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage: mocks.toastShowMessage, showError: mocks.toastShowError }),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData: mocks.openModalWithData }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProject: { id: 'project-1' },
		personalProject: { id: 'personal-project' },
	}),
}));

vi.mock('@n8n/frontend-module-insights', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/frontend-module-insights')>()),
	useInsightsStore: () => ({
		isSummaryEnabled: false,
		weeklySummary: { isLoading: false, state: null },
	}),
}));

vi.mock('@/features/collaboration/projects/composables/useProjectPages', () => ({
	useProjectPages: () => ({ isOverviewSubPage: mocks.routeProjectId === undefined }),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: mocks.setTitle }),
}));

vi.mock('../composables/useAgentPermissions', async () => {
	const { ref } = await import('vue');
	return {
		useAgentPermissions: () => ({ canCreate: ref(true) }),
	};
});

vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({
		trackClickedNewAgent: mocks.trackClickedNewAgent,
		trackDuplicatedAgent: mocks.trackDuplicatedAgent,
	}),
}));

vi.mock('@/app/components/layouts/ResourcesListLayout.vue', async () => {
	const { defineComponent } = await import('vue');
	return {
		default: defineComponent({
			name: 'ResourcesListLayout',
			props: [
				'resources',
				'initialize',
				'resourcesRefreshing',
				'totalItems',
				'type',
				'dontPerformSortingAndFiltering',
			],
			emits: ['update:search', 'update:pagination-and-sort'],
			mounted() {
				void this.initialize();
			},
			template: `
				<div data-test-id="resources-list-layout">
					<div data-test-id="resources-refreshing">{{ String(resourcesRefreshing) }}</div>
					<div data-test-id="resources-total">{{ totalItems }}</div>
					<div v-for="(item, index) in resources" :key="item.id">
						<slot name="item" :item="item" :index="index" />
					</div>
				</div>
			`,
		}),
	};
});

vi.mock('../components/AgentCard.vue', async () => {
	const { defineComponent } = await import('vue');
	return {
		default: defineComponent({
			name: 'AgentCard',
			props: ['agent', 'projectId'],
			emits: ['new-chat', 'duplicate'],
			template: '<div data-test-id="agent-card">{{ agent.name }}</div>',
		}),
	};
});

const agent = (id: string, name: string, projectId = 'project-1'): AgentResource =>
	({
		id,
		name,
		resourceType: 'agent',
		projectId,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-02T00:00:00Z',
	}) as AgentResource;

const mountView = async () => {
	const wrapper = mount(AgentsListView, {
		global: {
			stubs: {
				ProjectHeader: { template: '<div><slot /></div>' },
				InsightsSummary: true,
				N8nEmptyState: { template: '<div />' },
			},
		},
	});
	await flushPromises();
	return wrapper;
};

describe('AgentsListView — project page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.routeProjectId = 'project-1';
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('calls listAgentsPage with the route project ID', async () => {
		mocks.listAgentsPage.mockResolvedValueOnce({
			count: 2,
			data: [agent('agent-1', 'Support Agent')],
		});

		const wrapper = await mountView();

		expect(mocks.listAgentsPage).toHaveBeenCalledWith(
			{ baseUrl: '/rest', pushRef: 'push-ref' },
			'project-1',
			{
				skip: 0,
				take: 50,
				sortBy: 'updatedAt:desc',
				filter: undefined,
			},
		);
		expect(mocks.listAgentsPageGlobal).not.toHaveBeenCalled();
		expect(wrapper.find('[data-test-id="agent-card"]').text()).toBe('Support Agent');
		expect(wrapper.find('[data-test-id="resources-total"]').text()).toBe('2');
		const layout = wrapper.findComponent({ name: 'ResourcesListLayout' });
		expect(layout.props('type')).toBe('list-paginated');
		expect(layout.props('dontPerformSortingAndFiltering')).toBe(true);
	});

	it('opens a new chat in the agent builder preview', async () => {
		mocks.listAgentsPage.mockResolvedValueOnce({
			count: 1,
			data: [agent('agent-1', 'Support Agent')],
		});
		const wrapper = await mountView();

		wrapper.findComponent({ name: 'AgentCard' }).vm.$emit('new-chat', 'agent-1', 'project-1');

		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: 'project-1', agentId: 'agent-1' },
			query: { [NEW_SESSION_PARAM]: 'true' },
		});
	});

	it('informs the user when duplicating an unconfigured agent instead of opening the modal', async () => {
		// The factory omits `schema`, so this agent is unconfigured.
		mocks.listAgentsPage.mockResolvedValueOnce({
			count: 1,
			data: [agent('agent-1', 'Draft Agent')],
		});
		const wrapper = await mountView();

		wrapper.findComponent({ name: 'AgentCard' }).vm.$emit('duplicate', 'agent-1');

		expect(mocks.toastShowMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'agents.duplicate.modal.unconfigured' }),
		);
		expect(mocks.openModalWithData).not.toHaveBeenCalled();
	});

	it('duplicates a configured agent: opens the modal with existing names, then copies, caches, and navigates to the clone', async () => {
		// A configured agent carries a `schema`, so it passes the guard.
		const source = { ...agent('agent-1', 'Support Agent'), schema: { name: 'Support Agent' } };
		const copy = { ...source, id: 'agent-2', name: 'Support Agent Copy' };
		mocks.listAgentsPage.mockResolvedValueOnce({ count: 1, data: [source] });
		mocks.duplicateAgent.mockResolvedValueOnce(copy);

		const wrapper = await mountView();
		wrapper.findComponent({ name: 'AgentCard' }).vm.$emit('duplicate', 'agent-1');
		await flushPromises();

		// The modal opens pre-filled with the source's project, id, name, and the
		// names already in the list (so the modal can reject a duplicate name).
		expect(mocks.openModalWithData).toHaveBeenCalledWith({
			name: AGENT_DUPLICATE_MODAL_KEY,
			data: {
				projectId: 'project-1',
				agentId: 'agent-1',
				name: 'Support Agent',
				existingNames: ['Support Agent'],
				onConfirm: expect.any(Function),
			},
		});

		// The modal invokes `onConfirm` with the chosen name; run it to exercise
		// the duplicate path the user actually hits on confirm.
		const modalData = (
			mocks.openModalWithData.mock.calls[0] as [
				{ data: { onConfirm: (n: string) => Promise<void> } },
			]
		)[0].data;
		await modalData.onConfirm('Support Agent Copy');

		expect(mocks.duplicateAgent).toHaveBeenCalledWith(
			{ baseUrl: '/rest', pushRef: 'push-ref' },
			'project-1',
			'agent-1',
			'Support Agent Copy',
		);
		// The clone is inserted into the list cache and the user is routed to it.
		expect(mocks.upsertProjectAgentsListCache).toHaveBeenCalledWith('project-1', copy);
		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: 'project-1', agentId: 'agent-2' },
		});
		expect(mocks.toastShowMessage).toHaveBeenCalledWith(
			expect.objectContaining({ title: 'agents.duplicate.modal.success', type: 'success' }),
		);
		// A duplicate is born configured, so the backend creation events never
		// fire for it; the duplicate is tracked directly, mirroring
		// "User duplicated workflow" — the source agent id distinguishes it.
		// Routed through the safe wrapper so a telemetry failure can't
		// misreport a successful duplicate.
		expect(mocks.trackDuplicatedAgent).toHaveBeenCalledWith({
			sourceAgentId: 'agent-1',
			agentId: 'agent-2',
			projectId: 'project-1',
		});
	});

	it('refetches with backend search, pagination, and sorting parameters', async () => {
		vi.useFakeTimers();
		mocks.listAgentsPage
			.mockResolvedValueOnce({ count: 2, data: [agent('agent-1', 'Support Agent')] })
			.mockResolvedValueOnce({ count: 1, data: [agent('agent-2', 'Support Bot')] })
			.mockResolvedValueOnce({ count: 1, data: [agent('agent-2', 'Support Bot')] });

		const wrapper = await mountView();
		const layout = wrapper.findComponent({ name: 'ResourcesListLayout' });

		layout.vm.$emit('update:search', 'Support');
		await flushPromises();
		vi.advanceTimersByTime(300);
		await flushPromises();

		expect(mocks.listAgentsPage).toHaveBeenLastCalledWith(
			expect.any(Object),
			'project-1',
			expect.objectContaining({
				skip: 0,
				take: 50,
				sortBy: 'updatedAt:desc',
				filter: { query: 'Support' },
			}),
		);

		layout.vm.$emit('update:pagination-and-sort', { page: 2, pageSize: 10, sort: 'nameAsc' });
		await flushPromises();
		vi.advanceTimersByTime(500);
		await flushPromises();

		expect(mocks.listAgentsPage).toHaveBeenLastCalledWith(
			expect.any(Object),
			'project-1',
			expect.objectContaining({
				skip: 10,
				take: 10,
				sortBy: 'name:asc',
				filter: { query: 'Support' },
			}),
		);
	});

	it('keeps the rendered list visible for fast search refreshes', async () => {
		vi.useFakeTimers();
		let resolveSearch!: (value: { count: number; data: AgentResource[] }) => void;
		const searchPromise = new Promise<{ count: number; data: AgentResource[] }>((resolve) => {
			resolveSearch = resolve;
		});
		mocks.listAgentsPage
			.mockResolvedValueOnce({ count: 1, data: [agent('agent-1', 'Support Agent')] })
			.mockReturnValueOnce(searchPromise);

		const wrapper = await mountView();
		const layout = wrapper.findComponent({ name: 'ResourcesListLayout' });

		layout.vm.$emit('update:search', 'Support');
		await flushPromises();
		vi.advanceTimersByTime(300);
		await flushPromises();

		expect(mocks.listAgentsPage).toHaveBeenCalledTimes(2);
		expect(layout.props('resourcesRefreshing')).toBe(false);

		vi.advanceTimersByTime(299);
		await flushPromises();
		expect(layout.props('resourcesRefreshing')).toBe(false);

		resolveSearch({ count: 1, data: [agent('agent-2', 'Support Bot')] });
		await flushPromises();

		expect(layout.props('resourcesRefreshing')).toBe(false);
		expect(wrapper.find('[data-test-id="agent-card"]').text()).toBe('Support Bot');
	});
});

describe('AgentsListView — overview page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.routeProjectId = undefined;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('calls listAgentsPageGlobal when no project ID is in the route', async () => {
		mocks.listAgentsPageGlobal.mockResolvedValueOnce({
			count: 3,
			data: [agent('agent-1', 'Agent A', 'project-1'), agent('agent-2', 'Agent B', 'project-2')],
		});

		const wrapper = await mountView();

		expect(mocks.listAgentsPageGlobal).toHaveBeenCalledWith(
			{ baseUrl: '/rest', pushRef: 'push-ref' },
			{
				skip: 0,
				take: 50,
				sortBy: 'updatedAt:desc',
				filter: undefined,
			},
		);
		expect(mocks.listAgentsPage).not.toHaveBeenCalled();
		expect(wrapper.find('[data-test-id="resources-total"]').text()).toBe('3');
	});

	it('refetches via listAgentsPageGlobal when search changes on the overview page', async () => {
		vi.useFakeTimers();
		mocks.listAgentsPageGlobal
			.mockResolvedValueOnce({ count: 2, data: [agent('agent-1', 'Support Agent', 'p1')] })
			.mockResolvedValueOnce({ count: 1, data: [agent('agent-2', 'Support Bot', 'p2')] });

		const wrapper = await mountView();
		const layout = wrapper.findComponent({ name: 'ResourcesListLayout' });

		layout.vm.$emit('update:search', 'Support');
		await flushPromises();
		vi.advanceTimersByTime(300);
		await flushPromises();

		expect(mocks.listAgentsPageGlobal).toHaveBeenLastCalledWith(
			expect.any(Object),
			expect.objectContaining({ filter: { query: 'Support' } }),
		);
		expect(mocks.listAgentsPage).not.toHaveBeenCalled();
	});
});

describe('AgentsListView — create agent', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.routeProjectId = 'project-1';
	});

	it('routes create-agent clicks to Instance AI with the project context', async () => {
		mocks.listAgentsPage.mockResolvedValueOnce({ count: 0, data: [] });
		const wrapper = await mountView();

		const vm = wrapper.vm as unknown as { onCreateAgentClick: () => void };
		vm.onCreateAgentClick();

		// The same minted id is reported with the click and carried into the route,
		// so the "clicked" and "created" events can be joined on it.
		const [, mintedAgentId] = mocks.trackClickedNewAgent.mock.calls[0] as [string, string];
		expect(mocks.trackClickedNewAgent).toHaveBeenCalledWith('button', expect.any(String));
		expect(mocks.routerPush).toHaveBeenCalledWith(
			instanceAiCreateAgentRoute('project-1', mintedAgentId),
		);
	});
});
