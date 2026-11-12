/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { flushPromises, mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentResource } from '../types';
import type { ChangeLocationSearchResponseItem } from '@/features/core/folders/folders.types';
import { PROJECT_ROOT } from 'n8n-workflow';

import AgentsListView from '../views/AgentsListView.vue';
import {
	AGENT_BUILDER_VIEW,
	AGENT_DUPLICATE_MODAL_KEY,
	NEW_SESSION_PARAM,
	PENDING_AGENT_ID_STATE,
	PENDING_AGENT_STARTER_STATE,
} from '../constants';

const templatesEnabled = ref(false);
const experimentVariant = ref<'control' | 'test' | undefined>('control');
const trackTemplatesExposure = vi.fn();
const foldersEnabled = ref(false);
const folderReadAllowed = ref(true);
const navigation = ref<{ projectId?: string; folderId?: string }>({});

const mocks = vi.hoisted(() => ({
	listAgentsPage: vi.fn(),
	listAgentsPageGlobal: vi.fn(),
	getProjectFolders: vi.fn(),
	routerPush: vi.fn(),
	routerReplace: vi.fn(),
	setTitle: vi.fn(),
	executeWeeklySummary: vi.fn(),
	isSummaryEnabled: false,
	trackClickedNewAgent: vi.fn(),
	trackDuplicatedAgent: vi.fn(),
	duplicateAgent: vi.fn(),
	upsertProjectAgentsListCache: vi.fn(),
	routeProjectId: undefined as string | undefined,
	routeQuery: {} as Record<string, string>,
	routeFolderId: undefined as string | undefined,
	toastShowMessage: vi.fn(),
	toastShowError: vi.fn(),
	openModalWithData: vi.fn(),
}));

vi.mock('../composables/useAgentApi', () => ({
	listAgentsPage: mocks.listAgentsPage,
	listAgentsPageGlobal: mocks.listAgentsPageGlobal,
	duplicateAgent: mocks.duplicateAgent,
}));

vi.mock('@/features/core/folders/folders.api', () => ({
	getProjectFolders: mocks.getProjectFolders,
}));

vi.mock('../composables/useProjectAgentsList', () => ({
	upsertProjectAgentsListCache: mocks.upsertProjectAgentsListCache,
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		useRoute: () => ({
			params: {
				get projectId() {
					return navigation.value.projectId;
				},
			},
			get query() {
				return {
					...mocks.routeQuery,
					...(navigation.value.folderId ? { folderId: navigation.value.folderId } : {}),
				};
			},
		}),
		useRouter: () => ({ push: mocks.routerPush, replace: mocks.routerReplace }),
	};
});

vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({
		get isFoldersFeatureEnabled() {
			return foldersEnabled.value;
		},
	}),
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({ currentUser: { globalScopes: [] } }),
}));

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
		myProjects: [
			{
				id: 'project-1',
				get scopes() {
					return folderReadAllowed.value ? ['folder:list'] : [];
				},
			},
		],
	}),
}));

vi.mock('@n8n/frontend-module-insights', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/frontend-module-insights')>()),
	useInsightsStore: () => ({
		isSummaryEnabled: mocks.isSummaryEnabled,
		weeklySummary: { isLoading: false, state: null, execute: mocks.executeWeeklySummary },
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

vi.mock(
	'@/experiments/agentsListEmptyStateTemplates/useAgentsListEmptyStateTemplatesExperiment',
	() => ({
		useAgentsListEmptyStateTemplatesExperiment: () => ({
			isFeatureEnabled: computed(() => templatesEnabled.value),
			variant: computed(() => experimentVariant.value),
			trackExposure: trackTemplatesExposure,
		}),
	}),
);

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
				'hasEmptyState',
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
					<slot name="list-prepend" />
					<div v-for="(item, index) in resources" :key="item.id">
						<slot name="item" :item="item" :index="index" />
					</div>
					<slot v-if="resources.length === 0 && !$slots['list-prepend']" name="empty" />
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

const folder = (id: string): ChangeLocationSearchResponseItem => ({
	id,
	name: `Folder ${id}`,
	createdAt: '2026-01-01T00:00:00Z',
	updatedAt: '2026-01-02T00:00:00Z',
	agentCount: 0,
	workflowCount: 0,
	subFolderCount: 0,
	path: [],
});

// Mounted views are unmounted after each test. Without this, watchers from
// earlier tests stay alive and react to shared refs mutated by later tests.
const activeWrappers: Array<ReturnType<typeof mount>> = [];

const mountView = async () => {
	navigation.value = { projectId: mocks.routeProjectId, folderId: mocks.routeFolderId };

	const wrapper = mount(AgentsListView, {
		global: {
			stubs: {
				AgentFolderBrowser: {
					name: 'AgentFolderBrowser',
					props: ['folders'],
					data: () => ({ breadcrumbs: [] }),
					template:
						'<div><div v-for="folder in folders" :key="folder.id" data-test-id="agent-folder-card">{{ folder.name }}</div></div>',
				},
				AgentFolderToolbar: true,
				AgentFolderDialog: true,
				ProjectHeader: { template: '<div><slot /></div>' },
				InsightsSummary: true,
				N8nEmptyState: { template: '<div />' },
				ResourcesListEmptyState: {
					template: '<div data-test-id="agents-list-empty-fallback" />',
				},
				AgentsListIntro: {
					name: 'AgentsListIntro',
					props: ['disabled'],
					emits: ['create-blank', 'submit', 'select'],
					template: `
						<div data-test-id="agents-list-intro">
							<button data-test-id="agents-list-intro-create-blank" @click="$emit('create-blank')">blank</button>
							<button data-test-id="agents-list-intro-submit" @click="$emit('submit', 'Summarize my inbox')">prompt</button>
							<button data-test-id="agents-list-intro-template" @click="$emit('select', { id: 'morning-news-brief' })">template</button>
						</div>
					`,
				},
			},
		},
	});
	await flushPromises();
	activeWrappers.push(wrapper);
	return wrapper;
};

// The route query is shared state. Reset it so no suite inherits it.
beforeEach(() => {
	mocks.routeQuery = {};
});

afterEach(() => {
	let wrapper: (typeof activeWrappers)[number] | undefined;
	while ((wrapper = activeWrappers.shift())) wrapper.unmount();
});

beforeEach(() => {
	foldersEnabled.value = false;
	folderReadAllowed.value = true;
	mocks.routeFolderId = undefined;
	mocks.getProjectFolders.mockResolvedValue({ data: [], count: 0 });
});

describe('AgentsListView — folder pagination', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		mocks.routeProjectId = 'project-1';
		foldersEnabled.value = true;
		templatesEnabled.value = false;
		mocks.listAgentsPage.mockResolvedValue({ count: 75, data: [agent('a1', 'Support Agent')] });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shares one page limit and total across folder-only, mixed, and Agent-only pages', async () => {
		const firstFolders = Array.from({ length: 50 }, (_, index) => folder(`f${index}`));
		const lastFolders = Array.from({ length: 5 }, (_, index) => folder(`f${index + 50}`));
		mocks.getProjectFolders
			.mockResolvedValueOnce({ data: firstFolders, count: 55 })
			.mockResolvedValueOnce({ data: lastFolders, count: 55 })
			.mockResolvedValueOnce({ data: [], count: 55 });
		const firstAgents = Array.from({ length: 45 }, (_, index) =>
			agent(`a${index}`, `Agent ${index}`),
		);
		const lastAgents = Array.from({ length: 30 }, (_, index) =>
			agent(`a${index + 45}`, `Agent ${index + 45}`),
		);
		mocks.listAgentsPage
			.mockResolvedValueOnce({ count: 75, data: firstAgents.slice(0, 1) })
			.mockResolvedValueOnce({ count: 75, data: firstAgents })
			.mockResolvedValueOnce({ count: 75, data: lastAgents });
		const wrapper = await mountView();
		const layout = wrapper.findComponent({ name: 'ResourcesListLayout' });

		expect(wrapper.findAll('[data-test-id="agent-folder-card"]')).toHaveLength(50);
		expect(wrapper.findAll('[data-test-id="agent-card"]')).toHaveLength(0);
		expect(layout.props('totalItems')).toBe(130);
		expect(mocks.getProjectFolders).toHaveBeenLastCalledWith(
			expect.any(Object),
			'project-1',
			{ resourceType: 'agent', skip: 0, take: 50, sortBy: 'updatedAt:desc' },
			{ parentFolderId: PROJECT_ROOT },
			expect.arrayContaining(['agentCount', 'subFolderCount', 'createdAt', 'updatedAt']),
		);
		expect(mocks.listAgentsPage.mock.lastCall?.[2]).toMatchObject({
			skip: 0,
			take: 1,
			filter: { parentFolderId: null },
		});

		layout.vm.$emit('update:pagination-and-sort', { page: 2 });
		await vi.advanceTimersByTimeAsync(500);
		await flushPromises();

		expect(mocks.getProjectFolders.mock.lastCall?.[2]).toMatchObject({ skip: 50, take: 50 });
		expect(mocks.listAgentsPage.mock.lastCall?.[2]).toMatchObject({ skip: 0, take: 45 });
		expect(wrapper.findAll('[data-test-id="agent-folder-card"]')).toHaveLength(5);
		expect(wrapper.findAll('[data-test-id="agent-card"]')).toHaveLength(45);
		expect(
			wrapper.findAll('[data-test-id="agent-folder-card"], [data-test-id="agent-card"]')[5].text(),
		).toBe('Agent 0');

		layout.vm.$emit('update:pagination-and-sort', { page: 3 });
		await vi.advanceTimersByTimeAsync(500);
		await flushPromises();

		expect(mocks.getProjectFolders.mock.lastCall?.[2]).toMatchObject({ skip: 100, take: 50 });
		expect(mocks.listAgentsPage.mock.lastCall?.[2]).toMatchObject({ skip: 45, take: 50 });
		expect(wrapper.findAll('[data-test-id="agent-folder-card"]')).toHaveLength(0);
		expect(wrapper.findAll('[data-test-id="agent-card"]')).toHaveLength(30);
		expect(layout.props('totalItems')).toBe(130);
	});

	it('uses the selected page size and sort for both resources, then resets search to page one', async () => {
		mocks.routeFolderId = 'support';
		mocks.getProjectFolders.mockResolvedValue({ data: [folder('f1')], count: 12 });
		const wrapper = await mountView();
		const layout = wrapper.findComponent({ name: 'ResourcesListLayout' });

		layout.vm.$emit('update:pagination-and-sort', { page: 2, pageSize: 10, sort: 'nameDesc' });
		await vi.advanceTimersByTimeAsync(500);
		await flushPromises();

		expect(mocks.getProjectFolders.mock.lastCall?.[2]).toEqual({
			resourceType: 'agent',
			skip: 10,
			take: 10,
			sortBy: 'name:desc',
		});
		expect(mocks.listAgentsPage.mock.lastCall?.[2]).toMatchObject({
			skip: 0,
			take: 9,
			sortBy: 'name:desc',
			filter: { parentFolderId: 'support' },
		});

		layout.vm.$emit('update:search', 'Triage');
		await vi.advanceTimersByTimeAsync(500);
		await flushPromises();

		expect(mocks.getProjectFolders.mock.lastCall?.[2]).toMatchObject({ skip: 0, take: 10 });
		expect(mocks.getProjectFolders.mock.lastCall?.[3]).toEqual({
			parentFolderId: 'support',
			name: 'Triage',
		});
		expect(mocks.listAgentsPage.mock.lastCall?.[2]).toMatchObject({
			skip: 0,
			take: 9,
			filter: { query: 'Triage', parentFolderId: 'support', includeDescendants: true },
		});
	});

	it.each(['license', 'permission', 'overview'])(
		'keeps the list flat without folder access: %s',
		async (reason) => {
			if (reason === 'license') foldersEnabled.value = false;
			if (reason === 'permission') folderReadAllowed.value = false;
			if (reason === 'overview') mocks.routeProjectId = undefined;
			mocks.listAgentsPageGlobal.mockResolvedValue({
				count: 75,
				data: [agent('a1', 'Support Agent')],
			});
			const wrapper = await mountView();

			expect(mocks.getProjectFolders).not.toHaveBeenCalled();
			expect(wrapper.findComponent({ name: 'AgentFolderBrowser' }).exists()).toBe(false);
			const list = reason === 'overview' ? mocks.listAgentsPageGlobal : mocks.listAgentsPage;
			expect(list.mock.lastCall?.at(-1)).toMatchObject({ skip: 0, take: 50, filter: undefined });
		},
	);

	it.each([
		{ name: 'an empty project root', folderId: undefined, folderCount: 0, expected: true },
		{
			name: 'a project root with folders only',
			folderId: undefined,
			folderCount: 1,
			expected: false,
		},
		{ name: 'an empty folder', folderId: 'f1', folderCount: 0, expected: false },
	])('sets the full empty state like the workflow list: $name', async (testCase) => {
		mocks.routeFolderId = testCase.folderId;
		mocks.getProjectFolders.mockResolvedValue({
			data: Array.from({ length: testCase.folderCount }, (_, index) => folder(`f${index}`)),
			count: testCase.folderCount,
		});
		mocks.listAgentsPage.mockResolvedValue({ count: 0, data: [] });
		const wrapper = await mountView();

		expect(wrapper.findComponent({ name: 'ResourcesListLayout' }).props('hasEmptyState')).toBe(
			testCase.expected,
		);
		expect(wrapper.find('[data-test-id="empty-agent-folder-action-box"]').exists()).toBe(
			testCase.folderId !== undefined,
		);
	});

	it('clears folder rows and refetches a flat list when folder access is removed', async () => {
		mocks.getProjectFolders.mockResolvedValue({ data: [folder('f1')], count: 1 });
		const wrapper = await mountView();
		expect(wrapper.findAll('[data-test-id="agent-folder-card"]')).toHaveLength(1);

		folderReadAllowed.value = false;
		await flushPromises();

		expect(wrapper.findAll('[data-test-id="agent-folder-card"]')).toHaveLength(0);
		expect(mocks.listAgentsPage.mock.lastCall?.[2]).toMatchObject({
			skip: 0,
			take: 50,
			filter: undefined,
		});
		expect(wrapper.findComponent({ name: 'ResourcesListLayout' }).props('totalItems')).toBe(75);
	});

	it('ignores a folder response from the previous project', async () => {
		let resolveFolders!: (result: {
			data: ChangeLocationSearchResponseItem[];
			count: number;
		}) => void;
		mocks.getProjectFolders.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveFolders = resolve;
			}),
		);
		const wrapper = await mountView();

		navigation.value = { projectId: 'project-2' };
		await flushPromises();
		resolveFolders({ data: [folder('old')], count: 1 });
		await flushPromises();

		expect(wrapper.findAll('[data-test-id="agent-folder-card"]')).toHaveLength(0);
		expect(mocks.listAgentsPage).toHaveBeenCalledTimes(1);
		expect(mocks.listAgentsPage.mock.lastCall?.[1]).toBe('project-2');
	});
});

describe('AgentsListView — project page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.routeProjectId = 'project-1';
		mocks.isSummaryEnabled = false;
		templatesEnabled.value = false;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('does not load the insights summary on a project page', async () => {
		mocks.listAgentsPage.mockResolvedValueOnce({ count: 0, data: [] });
		mocks.isSummaryEnabled = true;

		await mountView();

		expect(mocks.executeWeeklySummary).not.toHaveBeenCalled();
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
		// The frontend event keeps the source Agent context.
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

	it('requests archived agents and syncs the URL when the show-archived filter is on', async () => {
		mocks.listAgentsPage.mockResolvedValue({ count: 0, data: [] });

		const wrapper = await mountView();
		expect(mocks.listAgentsPage).toHaveBeenLastCalledWith(
			expect.any(Object),
			'project-1',
			expect.objectContaining({ filter: undefined }),
		);

		const layout = wrapper.findComponent({ name: 'ResourcesListLayout' });
		layout.vm.$emit('update:filters', { search: '', homeProject: '', showArchived: true });
		await flushPromises();

		expect(mocks.routerReplace).toHaveBeenCalledWith({ query: { showArchived: 'true' } });
		expect(mocks.listAgentsPage).toHaveBeenLastCalledWith(
			expect.any(Object),
			'project-1',
			expect.objectContaining({ filter: { includeArchived: true } }),
		);
	});

	it('starts with the show-archived filter on when the URL query sets it', async () => {
		mocks.routeQuery = { showArchived: 'true' };
		mocks.listAgentsPage.mockResolvedValue({ count: 0, data: [] });

		const wrapper = await mountView();

		const layout = wrapper.findComponent({ name: 'ResourcesListLayout' });
		expect(layout.vm.$attrs.filters).toEqual(expect.objectContaining({ showArchived: true }));
		expect(mocks.listAgentsPage).toHaveBeenLastCalledWith(
			expect.any(Object),
			'project-1',
			expect.objectContaining({ filter: { includeArchived: true } }),
		);
	});

	it('removes showArchived from the URL and refetches when the show-archived filter is off', async () => {
		mocks.routeQuery = { showArchived: 'true' };
		mocks.listAgentsPage.mockResolvedValue({ count: 0, data: [] });

		const wrapper = await mountView();
		const layout = wrapper.findComponent({ name: 'ResourcesListLayout' });
		layout.vm.$emit('update:filters', { search: '', homeProject: '', showArchived: false });
		await flushPromises();

		expect(mocks.routerReplace).toHaveBeenCalledWith({ query: {} });
		expect(mocks.listAgentsPage).toHaveBeenCalledTimes(2);
		expect(mocks.listAgentsPage).toHaveBeenLastCalledWith(
			expect.any(Object),
			'project-1',
			expect.objectContaining({ filter: undefined }),
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
		mocks.isSummaryEnabled = false;
		templatesEnabled.value = false;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('loads the insights summary on mount when it is enabled', async () => {
		mocks.listAgentsPageGlobal.mockResolvedValueOnce({ count: 0, data: [] });
		mocks.isSummaryEnabled = true;

		await mountView();

		expect(mocks.executeWeeklySummary).toHaveBeenCalledTimes(1);
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
		templatesEnabled.value = false;
	});

	it('opens the builder for a new pending agent in the current project', async () => {
		mocks.listAgentsPage.mockResolvedValueOnce({ count: 0, data: [] });
		const wrapper = await mountView();

		const vm = wrapper.vm as unknown as { onCreateAgentClick: () => void };
		vm.onCreateAgentClick();

		// The same minted id is reported with the click and carried into the route,
		// so the "clicked" and "created" events can be joined on it.
		const [, mintedAgentId] = mocks.trackClickedNewAgent.mock.calls[0] as [string, string];
		expect(mocks.trackClickedNewAgent).toHaveBeenCalledWith('button', expect.any(String));
		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: 'project-1', agentId: mintedAgentId },
			state: { [PENDING_AGENT_ID_STATE]: mintedAgentId },
		});
	});
});

describe('AgentsListView — empty state templates', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.routeProjectId = 'project-1';
		templatesEnabled.value = false;
		experimentVariant.value = 'control';
		mocks.listAgentsPage.mockResolvedValue({ count: 0, data: [] });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('keeps the current empty state unless the experiment is enabled', async () => {
		const flagOff = await mountView();
		expect(flagOff.find('[data-test-id="agents-list-intro"]').exists()).toBe(false);
		expect(flagOff.find('[data-test-id="agents-list-empty-fallback"]').exists()).toBe(true);

		templatesEnabled.value = true;
		const enabled = await mountView();
		expect(enabled.find('[data-test-id="agents-list-intro"]').exists()).toBe(true);
		expect(enabled.find('[data-test-id="agents-list-empty-fallback"]').exists()).toBe(false);
	});

	it('records experiment exposure for the rendered empty state', async () => {
		await mountView();

		expect(trackTemplatesExposure).toHaveBeenCalledTimes(1);
	});

	it('records no exposure when the list has agents', async () => {
		mocks.listAgentsPage.mockResolvedValueOnce({
			count: 1,
			data: [agent('agent-1', 'Support Agent')],
		});

		await mountView();

		expect(trackTemplatesExposure).not.toHaveBeenCalled();
	});

	it('records no exposure while a search yields no matching agents', async () => {
		vi.useFakeTimers();
		mocks.listAgentsPage
			.mockResolvedValueOnce({ count: 1, data: [agent('agent-1', 'Support Agent')] })
			.mockResolvedValueOnce({ count: 0, data: [] });

		const wrapper = await mountView();
		const layout = wrapper.findComponent({ name: 'ResourcesListLayout' });

		layout.vm.$emit('update:search', 'No agent matches');
		await flushPromises();
		vi.advanceTimersByTime(300);
		await flushPromises();

		expect(mocks.listAgentsPage).toHaveBeenCalledTimes(2);
		expect(trackTemplatesExposure).not.toHaveBeenCalled();
	});

	it('records exposure when the variant resolves after the list is empty', async () => {
		experimentVariant.value = undefined;

		await mountView();

		expect(trackTemplatesExposure).not.toHaveBeenCalled();

		experimentVariant.value = 'test';
		await flushPromises();

		expect(trackTemplatesExposure).toHaveBeenCalledTimes(1);
	});

	it.each([
		{
			name: 'Create blank',
			testId: 'agents-list-intro-create-blank',
			source: 'empty_state_blank',
			starter: undefined,
		},
		{
			name: 'a typed prompt',
			testId: 'agents-list-intro-submit',
			source: 'empty_state_prompt',
			starter: { kind: 'prompt', text: 'Summarize my inbox' },
		},
		{
			name: 'a template card',
			testId: 'agents-list-intro-template',
			source: 'empty_state_template',
			starter: { kind: 'template', templateId: 'morning-news-brief' },
		},
	])('records $name and opens the builder', async ({ testId, source, starter }) => {
		templatesEnabled.value = true;
		const wrapper = await mountView();

		await wrapper.get(`[data-test-id="${testId}"]`).trigger('click');

		const [, mintedAgentId] = mocks.trackClickedNewAgent.mock.calls[0] as [string, string];
		if (starter?.kind === 'template') {
			expect(mocks.trackClickedNewAgent).toHaveBeenCalledWith(
				source,
				mintedAgentId,
				starter.templateId,
			);
		} else {
			expect(mocks.trackClickedNewAgent).toHaveBeenCalledWith(source, mintedAgentId);
		}
		expect(mocks.routerPush).toHaveBeenCalledWith({
			name: AGENT_BUILDER_VIEW,
			params: { projectId: 'project-1', agentId: mintedAgentId },
			state: {
				[PENDING_AGENT_ID_STATE]: mintedAgentId,
				...(starter ? { [PENDING_AGENT_STARTER_STATE]: starter } : {}),
			},
		});
	});
});
