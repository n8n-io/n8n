import { computed, ref, shallowRef, watch, watchEffect } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import debounce from 'lodash/debounce';
import type { CommandBarSection, CommandBarSelectOptions, CommandBarTab } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { DEBOUNCE_TIME, VIEWS } from '@/app/constants';
import { PROJECT_DATA_TABLES, DATA_TABLE_VIEW } from '@/features/core/dataTable/constants';
import {
	CHAT_CONVERSATION_VIEW,
	CHAT_PERSONAL_AGENTS_VIEW,
	CHAT_VIEW,
	CHAT_WORKFLOW_AGENTS_VIEW,
} from '@/features/ai/chatHub/constants';
import { AGENT_BUILDER_VIEW, AGENTS_LIST_VIEW, PROJECT_AGENTS } from '@/features/agents/constants';
import { useNodeCommands } from './useNodeCommands';
import { useWorkflowCommands } from './useWorkflowCommands';
import { useWorkflowNavigationCommands } from './useWorkflowNavigationCommands';
import { useDataTableNavigationCommands } from './useDataTableNavigationCommands';
import { useCredentialNavigationCommands } from './useCredentialNavigationCommands';
import { useExecutionNavigationCommands } from './useExecutionNavigationCommands';
import { useProjectNavigationCommands } from './useProjectNavigationCommands';
import { useExecutionCommands } from './useExecutionCommands';
import { useGenericCommands } from './useGenericCommands';
import { useRecentResources } from './useRecentResources';
import { useChatHubCommands } from './useChatHubCommands';
import { useInstanceAiCommands } from './useInstanceAiCommands';
import { useAgentNavigationCommands } from './useAgentNavigationCommands';
import { rankItems } from '../commandBar.utils';
import type {
	CommandBarItem,
	CommandBarRemoteSource,
	CommandBarSource,
	CommandGroup,
} from '../types';

export const ALL_TAB = 'all';
export const ACTIONS_TAB = 'actions';
export const PREVIEW_LIMIT = 5;
export const PAGE_SIZE = 20;

interface CommandBarScope {
	item: CommandBarItem;
	parentQuery: string;
}

interface SourceResults {
	query: string;
	items: CommandBarItem[];
	nextOffset: number;
	hasMore: boolean;
	isLoading: boolean;
}

const CANVAS_VIEWS: string[] = [VIEWS.WORKFLOW, VIEWS.NEW_WORKFLOW];
const EXECUTION_VIEWS: string[] = [VIEWS.EXECUTION_PREVIEW, VIEWS.EXECUTION_DEBUG];
const CREDENTIAL_VIEWS: string[] = [
	VIEWS.CREDENTIALS,
	VIEWS.PROJECTS_CREDENTIALS,
	VIEWS.SHARED_CREDENTIALS,
];
const DATA_TABLE_VIEWS: string[] = [PROJECT_DATA_TABLES, DATA_TABLE_VIEW];
const AGENT_VIEWS: string[] = [AGENTS_LIST_VIEW, PROJECT_AGENTS, AGENT_BUILDER_VIEW];
const CHAT_VIEWS: string[] = [
	CHAT_VIEW,
	CHAT_CONVERSATION_VIEW,
	CHAT_PERSONAL_AGENTS_VIEW,
	CHAT_WORKFLOW_AGENTS_VIEW,
];

function isRelatedQuery(previous: string, next: string) {
	return next.startsWith(previous) || previous.startsWith(next);
}

function groupBySection(
	items: CommandBarItem[],
	idPrefix: string,
	fallbackTitle?: string,
): CommandBarSection[] {
	const sections = new Map<string, CommandBarSection>();
	for (const item of items) {
		const title = item.section ?? fallbackTitle;
		const id = `${idPrefix}:${title ?? ''}`;
		const section = sections.get(id) ?? { id, title, items: [] };
		section.items.push(item);
		sections.set(id, section);
	}
	return [...sections.values()];
}

export function useCommandBar() {
	const nodeTypesStore = useNodeTypesStore();
	const projectsStore = useProjectsStore();
	const router = useRouter();
	const route = useRoute();
	const i18n = useI18n();
	const telemetry = useTelemetry();

	const currentProjectName = computed(() => {
		const projectId = route.params.projectId || projectsStore.currentProjectId;

		if (projectId === projectsStore.personalProject?.id) {
			return 'Personal';
		}

		return projectsStore.myProjects.find((p) => p.id === projectId)?.name ?? 'Personal';
	});

	const nodeCommandGroup = useNodeCommands();
	const workflowCommandGroup = useWorkflowCommands();
	const executionCommandGroup = useExecutionCommands();
	const workflowNavigationGroup = useWorkflowNavigationCommands({ currentProjectName });
	const dataTableNavigationGroup = useDataTableNavigationCommands({ currentProjectName });
	const credentialNavigationGroup = useCredentialNavigationCommands({ currentProjectName });
	const executionNavigationGroup = useExecutionNavigationCommands();
	const projectNavigationGroup = useProjectNavigationCommands();
	const agentNavigationGroup = useAgentNavigationCommands({ currentProjectName });
	const genericCommandGroup = useGenericCommands();
	const recentResourcesGroup = useRecentResources();
	const chatHubCommandGroup = useChatHubCommands();
	const instanceAiCommandGroup = useInstanceAiCommands();

	const isOpen = ref(false);
	const query = ref('');
	const remoteQuery = ref('');
	const activeTab = ref(ALL_TAB);
	const scopeStack = shallowRef<CommandBarScope[]>([]);
	const results = shallowRef<Record<string, SourceResults>>({});
	const localLimits = shallowRef<Record<string, number>>({});
	const latestRequestIds = new Map<string, number>();
	const tabTargets = new WeakMap<CommandBarItem, string>();

	const routeName = computed(() => String(router.currentRoute.value.name ?? ''));
	const isCanvasView = computed(() => CANVAS_VIEWS.includes(routeName.value));

	const contextualGroups = computed<CommandGroup[]>(() => {
		if (isCanvasView.value) return [nodeCommandGroup, workflowCommandGroup];
		if (EXECUTION_VIEWS.includes(routeName.value)) return [executionCommandGroup];
		if (CHAT_VIEWS.includes(routeName.value)) return [chatHubCommandGroup];
		return [];
	});

	const leadingNavigationGroup = computed<CommandGroup | undefined>(() => {
		if (isCanvasView.value) return nodeCommandGroup;
		if (CREDENTIAL_VIEWS.includes(routeName.value)) return credentialNavigationGroup;
		if (DATA_TABLE_VIEWS.includes(routeName.value)) return dataTableNavigationGroup;
		if (AGENT_VIEWS.includes(routeName.value)) return agentNavigationGroup;
		return undefined;
	});

	const navigationGroups = computed<CommandGroup[]>(() => {
		const groups = [
			workflowNavigationGroup,
			agentNavigationGroup,
			projectNavigationGroup,
			credentialNavigationGroup,
			dataTableNavigationGroup,
		];
		const leading = leadingNavigationGroup.value;
		return leading ? [leading, ...groups.filter((group) => group !== leading)] : groups;
	});

	const actionGroups = computed<CommandGroup[]>(() => [
		...contextualGroups.value,
		instanceAiCommandGroup,
		...navigationGroups.value.filter((group) => group !== nodeCommandGroup),
		executionNavigationGroup,
		genericCommandGroup,
	]);

	const sources = computed(() =>
		navigationGroups.value
			.map((group) => group.source)
			.filter((source): source is CommandBarSource => !!source && source.isAvailable()),
	);

	const actions = computed(() => actionGroups.value.flatMap((group) => group.commands.value));

	const tabs = computed<CommandBarTab[]>(() => [
		{ id: ALL_TAB, label: i18n.baseText('commandBar.tabs.all') },
		...sources.value.map((source) => ({ id: source.id, label: source.title })),
		{ id: ACTIONS_TAB, label: i18n.baseText('commandBar.tabs.actions') },
	]);

	const scope = computed(() => {
		let candidates = actions.value;
		let current: CommandBarItem | undefined;
		for (const { item } of scopeStack.value) {
			current = candidates.find(({ id }) => id === item.id) ?? item;
			candidates = current.children ?? [];
		}
		return current;
	});
	const activeSource = computed(() => sources.value.find(({ id }) => id === activeTab.value));

	const localResults = computed(() => {
		const searchQuery = query.value.trim();
		const entries: Record<string, SourceResults> = {};
		for (const source of sources.value) {
			if (source.isRemote) continue;
			const limit = localLimits.value[source.id] ?? PAGE_SIZE;
			const page = source.search({ query: searchQuery, offset: 0, limit });
			entries[source.id] = { query: searchQuery, ...page, nextOffset: limit, isLoading: false };
		}
		return entries;
	});

	const getResults = (source: CommandBarSource): SourceResults | undefined =>
		source.isRemote ? results.value[source.id] : localResults.value[source.id];

	const isPending = (source: CommandBarSource) => {
		if (!source.isRemote) return false;
		const state = results.value[source.id];
		return !state || state.isLoading || state.query !== query.value.trim();
	};

	function setResults(sourceId: string, state: SourceResults) {
		results.value = { ...results.value, [sourceId]: state };
	}

	async function load(source: CommandBarRemoteSource, searchQuery: string, offset: number) {
		const requestId = (latestRequestIds.get(source.id) ?? 0) + 1;
		latestRequestIds.set(source.id, requestId);

		const previous = results.value[source.id];
		const keepsPreviousItems =
			previous !== undefined && (offset > 0 || isRelatedQuery(previous.query, searchQuery));
		const previousItems = keepsPreviousItems ? previous.items : [];

		setResults(source.id, {
			query: searchQuery,
			items: previousItems,
			nextOffset: offset,
			hasMore: keepsPreviousItems && previous.hasMore,
			isLoading: true,
		});

		try {
			const page = await source.search({ query: searchQuery, offset, limit: PAGE_SIZE });
			if (latestRequestIds.get(source.id) !== requestId) return;

			const knownIds = new Set(offset > 0 ? previousItems.map(({ id }) => id) : []);
			const newItems = page.items.filter(({ id }) => !knownIds.has(id));

			setResults(source.id, {
				query: searchQuery,
				items: offset > 0 ? [...previousItems, ...newItems] : newItems,
				nextOffset: offset + PAGE_SIZE,
				hasMore: page.hasMore,
				isLoading: false,
			});
		} catch {
			if (latestRequestIds.get(source.id) !== requestId) return;

			setResults(source.id, {
				query: searchQuery,
				items: offset > 0 ? previousItems : [],
				nextOffset: offset,
				hasMore: false,
				isLoading: false,
			});
		}
	}

	const sourcesToLoad = computed<CommandBarRemoteSource[]>(() => {
		if (!isOpen.value || scope.value) return [];
		const visibleSources = activeTab.value === ALL_TAB ? sources.value : [activeSource.value];
		return visibleSources.filter((source): source is CommandBarRemoteSource => !!source?.isRemote);
	});

	watch([sourcesToLoad, remoteQuery], ([toLoad, searchQuery]) => {
		const trimmed = searchQuery.trim();
		if (activeTab.value === ALL_TAB && trimmed === '') return;

		for (const source of toLoad) {
			if (results.value[source.id]?.query !== trimmed) {
				void load(source, trimmed, 0);
			}
		}
	});

	const updateRemoteQuery = debounce((value: string) => {
		remoteQuery.value = value;
	}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

	watch(query, (value) => {
		localLimits.value = {};
		if (value.trim() === '') {
			updateRemoteQuery.cancel();
			remoteQuery.value = '';
			return;
		}
		updateRemoteQuery(value);
	});

	function createShowAllItem(tab: CommandBarTab): CommandBarItem {
		const item: CommandBarItem = {
			id: `show-all-${tab.id}`,
			title: i18n.baseText('commandBar.showAll', { interpolate: { type: tab.label } }),
			icon: { type: 'icon', value: 'arrow-right' },
		};
		tabTargets.set(item, tab.id);
		return item;
	}

	function getSourcePreview(source: CommandBarSource): CommandBarSection[] {
		const state = getResults(source);
		const items = state?.items ?? [];
		const sections = groupBySection(items.slice(0, PREVIEW_LIMIT), source.id, source.title);
		const isLoading = isPending(source);

		if (sections.length === 0) {
			return [{ id: source.id, title: source.title, items: [], isLoading }];
		}
		if (items.length > PREVIEW_LIMIT || state?.hasMore) {
			sections[sections.length - 1].items.push(
				createShowAllItem({ id: source.id, label: source.title }),
			);
		}
		sections[0].isLoading = isLoading;
		return sections;
	}

	function getActionsPreview(): CommandBarSection[] {
		const matched = rankItems(actions.value, query.value);
		const label = i18n.baseText('commandBar.tabs.actions');
		const items = matched.slice(0, PREVIEW_LIMIT);
		if (matched.length > PREVIEW_LIMIT) {
			items.push(createShowAllItem({ id: ACTIONS_TAB, label }));
		}
		return [{ id: ACTIONS_TAB, title: label, items }];
	}

	function buildSections(): CommandBarSection[] {
		if (scope.value) {
			return [
				{
					id: `scope:${scope.value.id}`,
					items: rankItems(scope.value.children ?? [], query.value),
				},
			];
		}

		if (activeTab.value === ACTIONS_TAB) {
			return groupBySection(rankItems(actions.value, query.value), ACTIONS_TAB);
		}

		if (activeTab.value === ALL_TAB) {
			if (!query.value.trim()) {
				return [
					...groupBySection(recentResourcesGroup.commands.value, 'recent'),
					...groupBySection(actions.value, ACTIONS_TAB),
				];
			}
			return [...getActionsPreview(), ...sources.value.flatMap(getSourcePreview)];
		}

		const source = activeSource.value;
		if (!source) return [];

		const group = navigationGroups.value.find((candidate) => candidate.source === source);
		const commands = rankItems(group?.commands.value ?? [], query.value).map((item) => ({
			...item,
			section: undefined,
		}));
		const resultSections = groupBySection(getResults(source)?.items ?? [], source.id);
		if (resultSections.length === 0) {
			resultSections.push({ id: source.id, items: [] });
		}
		resultSections[0].isLoading = isPending(source);

		return [{ id: `${source.id}:commands`, items: commands }, ...resultSections];
	}

	const sections = shallowRef<CommandBarSection[]>([]);

	watchEffect(() => {
		if (isOpen.value) sections.value = buildSections();
	});

	const isLoading = computed(() => {
		if (scope.value) return false;
		if (activeTab.value === ALL_TAB) {
			return query.value.trim() !== '' && sources.value.some(isPending);
		}
		return activeSource.value ? isPending(activeSource.value) : false;
	});

	const hasMore = computed(() => {
		const source = activeSource.value;
		return !scope.value && !!source && !!getResults(source)?.hasMore;
	});

	const placeholder = computed(
		() => scope.value?.placeholder ?? i18n.baseText('commandBar.placeholder'),
	);

	const breadcrumb = computed(() => scope.value?.title);

	function trackCommand(item: CommandBarItem) {
		telemetry.track('User executed command bar command', {
			command_id: item.id,
			command_section: item.section,
			view: routeName.value,
			parent_command_id: scope.value?.id,
		});
	}

	function pushScope(item: CommandBarItem) {
		scopeStack.value = [...scopeStack.value, { item, parentQuery: query.value }];
		query.value = '';
	}

	function select(item: CommandBarItem, { newTab }: CommandBarSelectOptions) {
		const targetTab = tabTargets.get(item);
		if (targetTab) {
			activeTab.value = targetTab;
			return;
		}

		if (item.children) {
			pushScope(item);
			return;
		}

		trackCommand(item);
		isOpen.value = false;

		if (newTab && item.href) {
			window.open(item.href, '_blank', 'noopener');
			return;
		}

		void item.handler?.();
	}

	function back() {
		const current = scopeStack.value.at(-1);
		if (!current) return;
		scopeStack.value = scopeStack.value.slice(0, -1);
		query.value = current.parentQuery;
	}

	function loadMore() {
		const source = activeSource.value;
		const state = source ? getResults(source) : undefined;
		if (!source || !state || state.isLoading || !state.hasMore) return;

		if (source.isRemote) {
			void load(source, state.query, state.nextOffset);
		} else {
			localLimits.value = { ...localLimits.value, [source.id]: state.nextOffset + PAGE_SIZE };
		}
	}

	async function initialize() {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
		await Promise.all(
			[recentResourcesGroup, ...actionGroups.value].map(
				async (group) => await group.initialize?.(),
			),
		);
	}

	watch(isOpen, (open) => {
		if (!open) return;

		query.value = '';
		remoteQuery.value = '';
		activeTab.value = ALL_TAB;
		scopeStack.value = [];
		results.value = {};
		void initialize();
	});

	watch(tabs, (availableTabs) => {
		if (!availableTabs.some(({ id }) => id === activeTab.value)) {
			activeTab.value = ALL_TAB;
		}
	});

	return {
		isOpen,
		query,
		activeTab,
		tabs,
		sections,
		placeholder,
		breadcrumb,
		isLoading,
		hasMore,
		select,
		back,
		loadMore,
	};
}
