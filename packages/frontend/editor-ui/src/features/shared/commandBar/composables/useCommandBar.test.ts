import { computed, defineComponent, h, nextTick, ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { describe, it, beforeEach, vi, expect } from 'vitest';
import { renderComponent } from '@/__tests__/render';
import { VIEWS } from '@/app/constants';
import type {
	CommandBarItem,
	CommandBarRemoteSource,
	CommandBarSearchRequest,
	CommandBarSearchResult,
	CommandGroup,
} from '../types';
import { ACTIONS_TAB, ALL_TAB, PAGE_SIZE, PREVIEW_LIMIT, useCommandBar } from './useCommandBar';

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			options?.interpolate ? `${key}:${Object.values(options.interpolate).join(',')}` : key,
	}),
}));

vi.mock('lodash/debounce', () => ({
	default: (fn: (...args: unknown[]) => unknown) =>
		Object.assign((...args: unknown[]) => fn(...args), { cancel: vi.fn() }),
}));

const currentRoute = ref<{ name: string; params: Record<string, string> }>({
	name: VIEWS.WORKFLOWS,
	params: {},
});
vi.mock('vue-router', () => ({
	useRouter: () => ({ currentRoute }),
	useRoute: () => currentRoute.value,
	RouterLink: vi.fn(),
}));

const loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({ loadNodeTypesIfNotLoaded }),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		personalProject: { id: 'p1' },
		myProjects: [{ id: 'p1', name: 'Personal' }],
		currentProjectId: 'p1',
	}),
}));

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

const items = (prefix: string, count: number, start = 0): CommandBarItem[] =>
	Array.from({ length: count }, (_, index) => ({
		id: `${prefix}-${start + index}`,
		title: `${prefix} ${start + index}`,
	}));

function createRemoteSource(id: string, totalItems = 12) {
	const search = vi.fn(
		async ({ query, offset, limit }: CommandBarSearchRequest): Promise<CommandBarSearchResult> => ({
			items: items(`${id}${query}`, Math.min(limit, Math.max(totalItems - offset, 0)), offset),
			hasMore: offset + limit < totalItems,
		}),
	);
	const source: CommandBarRemoteSource = {
		id,
		title: id,
		isRemote: true,
		isAvailable: () => true,
		search,
	};
	return { source, search };
}

const group = (commands: CommandBarItem[], extra: Partial<CommandGroup> = {}): CommandGroup => ({
	commands: computed(() => commands),
	...extra,
});

const subWorkflowAction: CommandBarItem = {
	id: 'open-sub-workflow',
	title: 'Open sub-workflow',
	section: 'Workflow',
	placeholder: 'Search sub-workflows',
	children: [
		{ id: 'child-alpha', title: 'Alpha child', handler: vi.fn() },
		{ id: 'child-beta', title: 'Beta child', handler: vi.fn() },
	],
};

const settingsHandler = vi.fn();
const genericCommands: CommandBarItem[] = [
	{ id: 'settings', title: 'Settings', section: 'General', handler: settingsHandler },
	...Array.from({ length: 6 }, (_, index) => ({
		id: `setting-${index}`,
		title: `Settings page ${index}`,
		section: 'General',
	})),
	{ id: 'docs', title: 'Documentation', section: 'Help', href: '/docs' },
];

const workflows = createRemoteSource('workflows');
const credentials = createRemoteSource('credentials', 3);
const favoritesInitialize = vi.fn().mockResolvedValue(undefined);
const nodeEntries = ref<CommandBarItem[]>(items('node', 25));
const assistantCommands = ref<CommandBarItem[]>([]);
const recentInitialize = vi.fn().mockResolvedValue(undefined);
const workflowNavigationInitialize = vi.fn().mockResolvedValue(undefined);

vi.mock('./useRecentResources', () => ({
	useRecentResources: () =>
		group([{ id: 'recent-1', title: 'Recent workflow', section: 'Recent' }], {
			initialize: recentInitialize,
		}),
}));
vi.mock('./useNodeCommands', () => ({
	useNodeCommands: () =>
		group([{ id: 'add-sticky', title: 'Add sticky note', section: 'Nodes' }], {
			source: {
				id: 'nodes',
				title: 'nodes',
				isRemote: false,
				isAvailable: () => true,
				search: ({ offset, limit }: CommandBarSearchRequest) => ({
					items: nodeEntries.value.slice(offset, offset + limit),
					hasMore: offset + limit < nodeEntries.value.length,
				}),
			},
		}),
}));
vi.mock('./useWorkflowCommands', () => ({
	useWorkflowCommands: () => group([subWorkflowAction]),
}));
vi.mock('./useExecutionCommands', () => ({
	useExecutionCommands: () =>
		group([{ id: 'delete-execution', title: 'Delete this execution', section: 'Execution' }]),
}));
vi.mock('./useWorkflowNavigationCommands', () => ({
	useWorkflowNavigationCommands: () =>
		group([{ id: 'create-workflow', title: 'Create workflow', section: 'Workflows' }], {
			source: workflows.source,
			initialize: workflowNavigationInitialize,
		}),
}));
vi.mock('./useCredentialNavigationCommands', () => ({
	useCredentialNavigationCommands: () => group([], { source: credentials.source }),
}));
vi.mock('./useProjectNavigationCommands', () => ({
	useProjectNavigationCommands: () =>
		group([], {
			source: { ...createRemoteSource('projects').source, isAvailable: () => false },
		}),
}));
vi.mock('./useDataTableNavigationCommands', () => ({
	useDataTableNavigationCommands: () => group([]),
}));
vi.mock('./useExecutionNavigationCommands', () => ({
	useExecutionNavigationCommands: () => group([]),
}));
vi.mock('./useGenericCommands', () => ({
	useGenericCommands: () => group(genericCommands),
}));
vi.mock('./useChatHubCommands', () => ({
	useChatHubCommands: () => group([]),
}));
vi.mock('./useInstanceAiCommands', () => ({
	useInstanceAiCommands: () => ({ commands: computed(() => assistantCommands.value) }),
}));
vi.mock('./useSettingsCommands', () => ({
	useSettingsCommands: () =>
		group([{ id: 'settings-personal', title: 'Personal', section: 'Settings' }]),
}));
vi.mock('./useFavoriteCommands', () => ({
	useFavoriteCommands: () =>
		group([{ id: 'favorite-1', title: 'Favorite workflow', section: 'Favorites' }], {
			initialize: favoritesInitialize,
		}),
}));

describe('useCommandBar', () => {
	let commandBar: ReturnType<typeof useCommandBar>;

	const renderCommandBar = () =>
		renderComponent(
			defineComponent({
				setup() {
					commandBar = useCommandBar();
					return () => h('div');
				},
			}),
			{ pinia: createTestingPinia() },
		);

	async function open() {
		commandBar.isOpen.value = true;
		await flushPromises();
	}

	async function search(query: string) {
		commandBar.query.value = query;
		await flushPromises();
	}

	const sectionIds = () => commandBar.sections.value.map(({ id }) => id);
	const itemIds = () =>
		commandBar.sections.value.flatMap((section) => section.items.map(({ id }) => id));

	beforeEach(() => {
		vi.clearAllMocks();
		workflows.search.mockReset();
		currentRoute.value = { name: VIEWS.WORKFLOWS, params: {} };
		nodeEntries.value = items('node', 25);
		assistantCommands.value = [];
		renderCommandBar();
	});

	it('initializes the groups and node types when it opens', async () => {
		await open();

		expect(loadNodeTypesIfNotLoaded).toHaveBeenCalled();
		expect(recentInitialize).toHaveBeenCalled();
		expect(favoritesInitialize).toHaveBeenCalled();
		expect(workflowNavigationInitialize).toHaveBeenCalled();
	});

	it('shows a tab for each available source between All and Actions', async () => {
		await open();
		expect(commandBar.tabs.value.map(({ id }) => id)).toEqual([
			ALL_TAB,
			'workflows',
			'credentials',
			ACTIONS_TAB,
		]);

		currentRoute.value = { name: VIEWS.WORKFLOW, params: {} };
		await nextTick();
		expect(commandBar.tabs.value.map(({ id }) => id)).toEqual([
			ALL_TAB,
			'nodes',
			'workflows',
			'credentials',
			ACTIONS_TAB,
		]);
	});

	it('shows recent items and all actions by section without a query', async () => {
		await open();

		expect(sectionIds()).toEqual([
			'recent:Recent',
			'favorites:Favorites',
			'actions:Workflows',
			'actions:General',
			'actions:Help',
			'actions:Settings',
		]);
		expect(workflows.search).not.toHaveBeenCalled();
	});

	it('adds contextual actions for the current view', async () => {
		currentRoute.value = { name: VIEWS.EXECUTION_PREVIEW, params: {} };
		await open();

		expect(itemIds()).toContain('delete-execution');
		expect(itemIds()).not.toContain('open-sub-workflow');
	});

	it('previews matching actions and every source for a query', async () => {
		await open();
		await search('settings');

		expect(workflows.search).toHaveBeenCalledWith({
			query: 'settings',
			offset: 0,
			limit: PAGE_SIZE,
		});
		expect(credentials.search).toHaveBeenCalledWith({
			query: 'settings',
			offset: 0,
			limit: PAGE_SIZE,
		});

		const [actionsSection, workflowsSection, credentialsSection] = commandBar.sections.value;
		expect(actionsSection.items[0].id).toBe('settings');
		expect(actionsSection.items).toHaveLength(PREVIEW_LIMIT + 1);
		expect(actionsSection.items.at(-1)?.id).toBe(`show-all-${ACTIONS_TAB}`);
		expect(workflowsSection.items).toHaveLength(PREVIEW_LIMIT + 1);
		expect(workflowsSection.items.at(-1)?.id).toBe('show-all-workflows');
		expect(credentialsSection.items.map(({ id }) => id)).toEqual([
			'credentialssettings-0',
			'credentialssettings-1',
			'credentialssettings-2',
		]);
	});

	it('switches to the type tab from a show all item', async () => {
		await open();
		await search('settings');

		const showAll = commandBar.sections.value[1].items.at(-1);
		if (!showAll) throw new Error('missing show all item');
		commandBar.select(showAll, { newTab: false });

		expect(commandBar.activeTab.value).toBe('workflows');
		expect(commandBar.isOpen.value).toBe(true);
	});

	it('lists the source commands and a full page in a type tab', async () => {
		await open();
		commandBar.activeTab.value = 'workflows';
		await flushPromises();

		expect(workflows.search).toHaveBeenCalledWith({ query: '', offset: 0, limit: PAGE_SIZE });
		expect(commandBar.sections.value[0].items.map(({ id }) => id)).toEqual(['create-workflow']);
		expect(commandBar.sections.value[1].items).toHaveLength(12);
		expect(commandBar.hasMore.value).toBe(false);
	});

	it('loads the next page of a remote source and skips known items', async () => {
		const pages: CommandBarSearchResult[] = [
			{ items: items('workflow', PAGE_SIZE), hasMore: true },
			{
				items: [...items('workflow', 1, PAGE_SIZE - 1), ...items('workflow', 2, PAGE_SIZE)],
				hasMore: false,
			},
		];
		workflows.search.mockImplementation(async ({ offset }) => pages[offset === 0 ? 0 : 1]);
		await open();
		commandBar.activeTab.value = 'workflows';
		await flushPromises();
		expect(commandBar.hasMore.value).toBe(true);

		commandBar.loadMore();
		await flushPromises();

		expect(workflows.search).toHaveBeenLastCalledWith({
			query: '',
			offset: PAGE_SIZE,
			limit: PAGE_SIZE,
		});
		expect(commandBar.sections.value[1].items).toHaveLength(PAGE_SIZE + 2);
		expect(commandBar.hasMore.value).toBe(false);
	});

	it('ignores responses of outdated searches', async () => {
		const pending: Record<string, (result: CommandBarSearchResult) => void> = {};
		workflows.search.mockImplementation(
			async ({ query }) => await new Promise((resolve) => (pending[query] = resolve)),
		);
		await open();
		commandBar.activeTab.value = 'workflows';
		await search('fir');
		await search('first');

		pending.first({ items: items('latest', 1), hasMore: false });
		await flushPromises();
		pending.fir({ items: items('outdated', 1), hasMore: false });
		await flushPromises();

		expect(commandBar.sections.value[1].items.map(({ id }) => id)).toEqual(['latest-0']);
		expect(commandBar.isLoading.value).toBe(false);
	});

	it('reports loading while a remote search is pending', async () => {
		workflows.search.mockImplementation(async () => await new Promise(() => {}));
		await open();
		await search('pending');

		expect(commandBar.isLoading.value).toBe(true);
		expect(commandBar.sections.value[1]).toMatchObject({ id: 'workflows', isLoading: true });
	});

	it('pages a local source and follows changes of its data', async () => {
		currentRoute.value = { name: VIEWS.WORKFLOW, params: {} };
		await open();
		commandBar.activeTab.value = 'nodes';
		await flushPromises();
		expect(commandBar.sections.value[1].items).toHaveLength(PAGE_SIZE);

		commandBar.loadMore();
		await flushPromises();
		expect(commandBar.sections.value[1].items).toHaveLength(25);

		nodeEntries.value = items('node', 2);
		await flushPromises();
		expect(commandBar.sections.value[1].items).toHaveLength(2);
	});

	it('opens the children of an item and restores the query on back', async () => {
		currentRoute.value = { name: VIEWS.WORKFLOW, params: {} };
		await open();
		await search('sub');

		commandBar.select(subWorkflowAction, { newTab: false });
		await flushPromises();

		expect(commandBar.breadcrumb.value).toBe('Open sub-workflow');
		expect(commandBar.placeholder.value).toBe('Search sub-workflows');
		expect(commandBar.query.value).toBe('');
		expect(itemIds()).toEqual(['child-alpha', 'child-beta']);

		await search('beta');
		expect(itemIds()).toEqual(['child-beta']);

		commandBar.back();
		await flushPromises();
		expect(commandBar.breadcrumb.value).toBeUndefined();
		expect(commandBar.query.value).toBe('sub');
	});

	it('shows children that load after the item was opened', async () => {
		const openThread = (children: CommandBarItem[]): CommandBarItem => ({
			id: 'open-thread',
			title: 'Open thread',
			section: 'Assistant',
			children,
		});
		assistantCommands.value = [openThread([])];
		await open();

		commandBar.select(assistantCommands.value[0], { newTab: false });
		await flushPromises();
		expect(itemIds()).toEqual([]);

		assistantCommands.value = [openThread([{ id: 'thread-1', title: 'First thread' }])];
		await flushPromises();
		expect(itemIds()).toEqual(['thread-1']);
	});

	it('runs the handler, closes and tracks the command', async () => {
		await open();

		commandBar.select(genericCommands[0], { newTab: false });

		expect(settingsHandler).toHaveBeenCalled();
		expect(commandBar.isOpen.value).toBe(false);
		expect(track).toHaveBeenCalledWith('User executed command bar command', {
			command_id: 'settings',
			command_section: 'General',
			view: VIEWS.WORKFLOWS,
			parent_command_id: undefined,
		});
	});

	it('tracks the parent of a child command', async () => {
		currentRoute.value = { name: VIEWS.WORKFLOW, params: {} };
		await open();
		commandBar.select(subWorkflowAction, { newTab: false });

		const child = subWorkflowAction.children?.[0];
		if (!child) throw new Error('missing child');
		commandBar.select(child, { newTab: false });

		expect(child.handler).toHaveBeenCalled();
		expect(track).toHaveBeenCalledWith(
			'User executed command bar command',
			expect.objectContaining({
				command_id: 'child-alpha',
				parent_command_id: 'open-sub-workflow',
			}),
		);
	});

	it('opens items with a link in a new tab', async () => {
		const openWindow = vi.spyOn(window, 'open').mockReturnValue(null);
		await open();

		commandBar.select(genericCommands[genericCommands.length - 1], { newTab: true });

		expect(openWindow).toHaveBeenCalledWith('/docs', '_blank', 'noopener');
		expect(commandBar.isOpen.value).toBe(false);
	});

	it('resets the query, tab and scope when it opens again', async () => {
		currentRoute.value = { name: VIEWS.WORKFLOW, params: {} };
		await open();
		commandBar.activeTab.value = 'workflows';
		commandBar.select(subWorkflowAction, { newTab: false });
		await search('alpha');

		commandBar.isOpen.value = false;
		await flushPromises();
		await open();

		expect(commandBar.query.value).toBe('');
		expect(commandBar.activeTab.value).toBe(ALL_TAB);
		expect(commandBar.breadcrumb.value).toBeUndefined();
	});
});
