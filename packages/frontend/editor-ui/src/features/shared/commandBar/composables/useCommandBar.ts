import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { VIEWS } from '@/app/constants';
import { type CommandBarItem } from '@n8n/design-system';
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
import {
	useGlobalNodeSearchCommands,
	GLOBAL_NODE_SEARCH_COMMAND_ID,
} from './useGlobalNodeSearchCommands';
import { useWorkflowLocationSuffix } from './useWorkflowLocationSuffix';
import type { CommandGroup } from '../types';
import { useI18n } from '@n8n/i18n';
import { PROJECT_DATA_TABLES, DATA_TABLE_VIEW } from '@/features/core/dataTable/constants';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import {
	CHAT_CONVERSATION_VIEW,
	CHAT_PERSONAL_AGENTS_VIEW,
	CHAT_VIEW,
	CHAT_WORKFLOW_AGENTS_VIEW,
} from '@/features/ai/chatHub/constants';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';

export function useCommandBar() {
	const nodeTypesStore = useNodeTypesStore();
	const projectsStore = useProjectsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const router = useRouter();
	const route = useRoute();
	const i18n = useI18n();
	const telemetry = useTelemetry();

	const placeholder = i18n.baseText('commandBar.placeholder');

	const activeNodeId = ref<string | null>(null);
	const lastQuery = ref('');
	/** Cleared via the context badge X — unlocks cross-workflow node search. */
	const isContextCleared = ref(false);
	const { getProjectIcon } = useWorkflowLocationSuffix();

	const currentProjectName = computed(() => {
		const projectId = route.params.projectId || projectsStore.currentProjectId;

		if (projectId === projectsStore.personalProject?.id) {
			return i18n.baseText('projects.menu.personal');
		}

		return (
			projectsStore.myProjects.find((p) => p.id === projectId)?.name ??
			i18n.baseText('projects.menu.personal')
		);
	});

	const workflowContextLabel = computed(() => {
		const workflowName = workflowDocumentStore?.value?.name ?? '';
		switch (router.currentRoute.value.name) {
			case VIEWS.WORKFLOW:
			case VIEWS.NEW_WORKFLOW:
				return workflowName
					? i18n.baseText('commandBar.sections.workflow') + ' ⋅ ' + workflowName
					: '';
			case VIEWS.EXECUTION_PREVIEW:
			case VIEWS.EXECUTION_DEBUG:
				return workflowName
					? i18n.baseText('commandBar.sections.execution') + ' ⋅ ' + workflowName
					: '';
			case VIEWS.EVALUATION:
			case VIEWS.EVALUATION_EDIT:
			case VIEWS.EVALUATION_RUNS_DETAIL:
				return workflowName ? ' ⋅ ' + workflowName : '';
			default:
				return '';
		}
	});

	const isHomeProjectRoute = computed(() => {
		const name = router.currentRoute.value.name;
		return (
			name === VIEWS.WORKFLOWS ||
			name === VIEWS.CREDENTIALS ||
			name === VIEWS.EXECUTIONS ||
			name === VIEWS.FOLDERS ||
			name === VIEWS.HOME_VARIABLES
		);
	});

	/** Project id for the active list context (team URL param, or Personal on /home). */
	const routeProjectId = computed(() => {
		const projectId = router.currentRoute.value.params.projectId;
		if (typeof projectId === 'string' && projectId.length > 0) return projectId;
		if (isHomeProjectRoute.value && projectsStore.personalProject?.id) {
			return projectsStore.personalProject.id;
		}
		return null;
	});

	const contextProject = computed(() => {
		if (!routeProjectId.value) return null;
		if (routeProjectId.value === projectsStore.personalProject?.id) {
			return {
				id: routeProjectId.value,
				name: i18n.baseText('projects.menu.personal'),
				type: ProjectTypes.Personal,
				icon: projectsStore.personalProject.icon ?? null,
			};
		}
		if (projectsStore.currentProject?.id === routeProjectId.value) {
			return projectsStore.currentProject;
		}
		return projectsStore.myProjects.find((p) => p.id === routeProjectId.value) ?? null;
	});

	const projectContextLabel = computed(() => {
		// Workflow/execution context takes precedence when both apply.
		if (workflowContextLabel.value || !routeProjectId.value) return '';
		return currentProjectName.value;
	});

	const availableContext = computed(() => workflowContextLabel.value || projectContextLabel.value);

	const context = computed(() => (isContextCleared.value ? '' : availableContext.value));

	const contextIcon = computed(() => {
		if (isContextCleared.value || workflowContextLabel.value || !contextProject.value) {
			return undefined;
		}

		return {
			component: ProjectIcon,
			props: {
				icon: getProjectIcon({ homeProject: contextProject.value }),
				size: 'mini',
				borderLess: true,
			},
		};
	});

	/** Node search stays on the open workflow while the workflow context badge is shown. */
	const isWorkflowScoped = computed(
		() => workflowContextLabel.value !== '' && !isContextCleared.value,
	);

	/** Resource search stays inside the current project while the project context badge is shown. */
	const isProjectScoped = computed(
		() => projectContextLabel.value !== '' && !isContextCleared.value,
	);

	const scopedProjectId = computed(() => (isProjectScoped.value ? routeProjectId.value : null));

	const nodeCommandGroup = useNodeCommands({
		lastQuery,
		activeNodeId,
	});
	const workflowCommandGroup = useWorkflowCommands();
	const executionCommandGroup = useExecutionCommands();
	const workflowNavigationGroup = useWorkflowNavigationCommands({
		lastQuery,
		activeNodeId,
		currentProjectName,
		scopedProjectId,
	});
	const dataTableNavigationGroup = useDataTableNavigationCommands({
		lastQuery,
		activeNodeId,
		currentProjectName,
		scopedProjectId,
	});
	const credentialNavigationGroup = useCredentialNavigationCommands({
		lastQuery,
		activeNodeId,
		currentProjectName,
		scopedProjectId,
	});
	const executionNavigationGroup = useExecutionNavigationCommands();
	const projectNavigationGroup = useProjectNavigationCommands({
		lastQuery,
		activeNodeId,
		scopedProjectId,
	});
	const genericCommandGroup = useGenericCommands();
	const recentResourcesGroup = useRecentResources({
		scopedProjectId,
	});
	const chatHubCommandGroup = useChatHubCommands({
		lastQuery,
	});
	const instanceAiCommandGroup = useInstanceAiCommands({
		lastQuery,
	});
	const globalNodeSearchGroup = useGlobalNodeSearchCommands({
		lastQuery,
		activeNodeId,
		isWorkflowScoped,
		scopedProjectId,
	});

	const canvasViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		nodeCommandGroup,
		workflowCommandGroup,
		workflowNavigationGroup,
		globalNodeSearchGroup,
		instanceAiCommandGroup,
		genericCommandGroup,
	];

	const executionViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		executionCommandGroup,
		instanceAiCommandGroup,
		workflowNavigationGroup,
		globalNodeSearchGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const workflowsListViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		instanceAiCommandGroup,
		workflowNavigationGroup,
		globalNodeSearchGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const credentialsListViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		instanceAiCommandGroup,
		credentialNavigationGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
		globalNodeSearchGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const executionsListViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		instanceAiCommandGroup,
		workflowNavigationGroup,
		globalNodeSearchGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		genericCommandGroup,
	];

	const dataStoresListViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		instanceAiCommandGroup,
		dataTableNavigationGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
		globalNodeSearchGroup,
		credentialNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const evaluationViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		instanceAiCommandGroup,
		workflowNavigationGroup,
		globalNodeSearchGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const chatHubViewGroups: CommandGroup[] = [
		chatHubCommandGroup,
		recentResourcesGroup,
		instanceAiCommandGroup,
		genericCommandGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
		globalNodeSearchGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
	];

	const fallbackViewCommands: CommandGroup[] = [
		recentResourcesGroup,
		instanceAiCommandGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
		globalNodeSearchGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const activeCommandGroups = computed<CommandGroup[]>(() => {
		switch (router.currentRoute.value.name) {
			case VIEWS.WORKFLOW:
			case VIEWS.NEW_WORKFLOW:
				return canvasViewGroups;
			case VIEWS.EXECUTION_PREVIEW:
			case VIEWS.EXECUTION_DEBUG:
				return executionViewGroups;
			case VIEWS.WORKFLOWS:
			case VIEWS.PROJECTS_WORKFLOWS:
				return workflowsListViewGroups;
			case VIEWS.CREDENTIALS:
			case VIEWS.PROJECTS_CREDENTIALS:
				return credentialsListViewGroups;
			case VIEWS.EXECUTIONS:
			case VIEWS.PROJECTS_EXECUTIONS:
				return executionsListViewGroups;
			case PROJECT_DATA_TABLES:
			case DATA_TABLE_VIEW:
				return dataStoresListViewGroups;
			case VIEWS.EVALUATION:
			case VIEWS.EVALUATION_EDIT:
			case VIEWS.EVALUATION_RUNS_DETAIL:
				return evaluationViewGroups;
			case CHAT_VIEW:
			case CHAT_CONVERSATION_VIEW:
			case CHAT_PERSONAL_AGENTS_VIEW:
			case CHAT_WORKFLOW_AGENTS_VIEW:
				return chatHubViewGroups;
			default:
				return fallbackViewCommands;
		}
	});

	/**
	 * Node search results embed workflow and node ids in their item id to stay
	 * unique in the list. Collapse them to the section prefix so telemetry keeps a
	 * bounded set of `command_id` values and no resource ids leak into analytics.
	 */
	const telemetryCommandId = (id: string) =>
		id.startsWith(GLOBAL_NODE_SEARCH_COMMAND_ID) ? GLOBAL_NODE_SEARCH_COMMAND_ID : id;

	const trackCommand = (item: CommandBarItem, view: string, parentItem?: CommandBarItem) => {
		telemetry.track('User executed command bar command', {
			command_id: telemetryCommandId(item.id),
			command_section: item.section,
			view,
			parent_command_id: parentItem?.id,
		});
	};

	const wrapItemWithTelemetry = (item: CommandBarItem): CommandBarItem => {
		const wrappedItem: CommandBarItem = { ...item };
		const routeName = (router.currentRoute.value.name ?? '').toString();

		if (item.handler) {
			const originalHandler = item.handler;
			wrappedItem.handler = async () => {
				trackCommand(item, routeName);
				return await originalHandler();
			};
		}

		if (item.children) {
			wrappedItem.children = item.children.map((child) => {
				if (child.handler) {
					const originalChildHandler = child.handler;
					return {
						...child,
						handler: async () => {
							trackCommand(child, routeName, item);
							return await originalChildHandler();
						},
					};
				}
				return child;
			});
		}

		return wrappedItem;
	};

	const items = computed<CommandBarItem[]>(() => {
		const allItems = activeCommandGroups.value.flatMap((group) => group.commands.value);
		return allItems.map(wrapItemWithTelemetry);
	});

	const isLoading = computed(() => {
		return activeCommandGroups.value.some((group) => group.isLoading?.value === true);
	});

	function onCommandBarChange(query: string) {
		lastQuery.value = query;

		for (const group of activeCommandGroups.value) {
			if (group.handlers?.onCommandBarChange) {
				group.handlers.onCommandBarChange(query);
			}
		}
	}

	function onCommandBarNavigateTo(to: string | null) {
		for (const group of activeCommandGroups.value) {
			if (group.handlers?.onCommandBarNavigateTo) {
				group.handlers.onCommandBarNavigateTo(to);
			}
		}
	}

	async function initialize() {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();

		const initPromises = activeCommandGroups.value.map(async (group) => {
			if (group.initialize) {
				await group.initialize();
			}
		});

		await Promise.all(initPromises);
	}

	function clearContext() {
		isContextCleared.value = true;
	}

	/** Restore workflow scoping the next time the command bar opens. */
	function resetContext() {
		isContextCleared.value = false;
	}

	return {
		items,
		initialize,
		onCommandBarChange,
		onCommandBarNavigateTo,
		placeholder,
		context,
		contextIcon,
		contextClearLabel: i18n.baseText('commandBar.clearContext'),
		clearContext,
		resetContext,
		isLoading,
	};
}
