import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { VIEWS } from '@/app/constants';
import { type CommandBarItem } from '@n8n/design-system/components/N8nCommandBar/types';
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
import type { CommandGroup } from '../types';
import { useI18n } from '@n8n/i18n';
import { PROJECT_DATA_TABLES, DATA_TABLE_VIEW } from '@/features/core/dataTable/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import {
	CHAT_CONVERSATION_VIEW,
	CHAT_PERSONAL_AGENTS_VIEW,
	CHAT_VIEW,
	CHAT_WORKFLOW_AGENTS_VIEW,
} from '@/features/ai/chatHub/constants';

export function useCommandBar() {
	const nodeTypesStore = useNodeTypesStore();
	const projectsStore = useProjectsStore();
	const workflowStore = useWorkflowsStore();
	const router = useRouter();
	const route = useRoute();
	const i18n = useI18n();
	const telemetry = useTelemetry();

	const placeholder = i18n.baseText('commandBar.placeholder');

	const activeNodeId = ref<string | null>(null);
	const lastQuery = ref('');

	const currentProjectName = computed(() => {
		const projectId = route.params.projectId || projectsStore.currentProjectId;

		if (projectId === projectsStore.personalProject?.id) {
			return 'Personal';
		}

		return projectsStore.myProjects.find((p) => p.id === projectId)?.name ?? 'Personal';
	});

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
	});
	const dataTableNavigationGroup = useDataTableNavigationCommands({
		lastQuery,
		activeNodeId,
		currentProjectName,
	});
	const credentialNavigationGroup = useCredentialNavigationCommands({
		lastQuery,
		activeNodeId,
		currentProjectName,
	});
	const executionNavigationGroup = useExecutionNavigationCommands();
	const projectNavigationGroup = useProjectNavigationCommands({
		lastQuery,
		activeNodeId,
	});
	const genericCommandGroup = useGenericCommands();
	const recentResourcesGroup = useRecentResources();
	const chatHubCommandGroup = useChatHubCommands({
		lastQuery,
	});

	const canvasViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		nodeCommandGroup,
		workflowCommandGroup,
		workflowNavigationGroup,
		genericCommandGroup,
	];

	const executionViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		executionCommandGroup,
		workflowNavigationGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const workflowsListViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		workflowNavigationGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const credentialsListViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		credentialNavigationGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const executionsListViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		workflowNavigationGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		genericCommandGroup,
	];

	const dataStoresListViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		dataTableNavigationGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
		credentialNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const evaluationViewGroups: CommandGroup[] = [
		recentResourcesGroup,
		workflowNavigationGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const chatHubViewGroups: CommandGroup[] = [
		chatHubCommandGroup,
		recentResourcesGroup,
		genericCommandGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
	];

	const fallbackViewCommands: CommandGroup[] = [
		recentResourcesGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
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

	const context = computed(() => {
		switch (router.currentRoute.value.name) {
			case VIEWS.WORKFLOW:
			case VIEWS.NEW_WORKFLOW:
				return workflowStore.workflow.name
					? i18n.baseText('commandBar.sections.workflow') + ' ⋅ ' + workflowStore.workflow.name
					: '';
			case VIEWS.EXECUTION_PREVIEW:
			case VIEWS.EXECUTION_DEBUG:
				return workflowStore.workflow.name
					? i18n.baseText('commandBar.sections.execution') + ' ⋅ ' + workflowStore.workflow.name
					: '';
			case VIEWS.EVALUATION:
			case VIEWS.EVALUATION_EDIT:
			case VIEWS.EVALUATION_RUNS_DETAIL:
				return workflowStore.workflow.name ? ' ⋅ ' + workflowStore.workflow.name : '';
			default:
				return '';
		}
	});

	const trackCommand = (item: CommandBarItem, view: string, parentItem?: CommandBarItem) => {
		telemetry.track('User executed command bar command', {
			command_id: item.id,
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

	return {
		items,
		initialize,
		onCommandBarChange,
		onCommandBarNavigateTo,
		placeholder,
		context,
		isLoading,
	};
}
