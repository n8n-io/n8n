import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useProjectsStore } from '@/stores/projects.store';
import { COMMAND_BAR_EXPERIMENT, VIEWS } from '@/constants';
import { type CommandBarItem } from '@n8n/design-system/components/N8nCommandBar/types';
import { useNodeCommands } from './commandBar/useNodeCommands';
import { useWorkflowCommands } from './commandBar/useWorkflowCommands';
import { useWorkflowNavigationCommands } from './commandBar/useWorkflowNavigationCommands';
import { useTemplateCommands } from './commandBar/useTemplateCommands';
import { useBaseCommands } from './commandBar/useBaseCommands';
import { useDataTableNavigationCommands } from './commandBar/useDataTableNavigationCommands';
import { useCredentialNavigationCommands } from './commandBar/useCredentialNavigationCommands';
import { useExecutionNavigationCommands } from './commandBar/useExecutionNavigationCommands';
import { useProjectNavigationCommands } from './commandBar/useProjectNavigationCommands';
import type { CommandGroup } from './commandBar/types';
import { usePostHog } from '@/stores/posthog.store';
import { useI18n } from '@n8n/i18n';
import { PROJECT_DATA_STORES, DATA_STORE_VIEW } from '@/features/dataStore/constants';

export function useCommandBar() {
	const nodeTypesStore = useNodeTypesStore();
	const projectsStore = useProjectsStore();
	const router = useRouter();
	const route = useRoute();
	const postHog = usePostHog();
	const i18n = useI18n();

	const placeholder = i18n.baseText('commandBar.placeholder');

	const isEnabled = computed(() =>
		postHog.isVariantEnabled(COMMAND_BAR_EXPERIMENT.name, COMMAND_BAR_EXPERIMENT.variant),
	);

	const activeNodeId = ref<string | null>(null);
	const lastQuery = ref('');

	const personalProjectId = computed(() => {
		return projectsStore.myProjects.find((p) => p.type === 'personal')?.id;
	});

	const currentProjectName = computed(() => {
		if (!route.params.projectId || route.params.projectId === personalProjectId.value) {
			return 'Personal';
		}
		return (
			projectsStore.myProjects.find((p) => p.id === route.params.projectId)?.name ?? 'Personal'
		);
	});

	const baseCommandGroup = useBaseCommands();
	const nodeCommandGroup = useNodeCommands();
	const workflowCommandGroup = useWorkflowCommands();
	const workflowNavigationGroup = useWorkflowNavigationCommands({
		lastQuery,
		activeNodeId,
		currentProjectName,
	});
	const templateCommandGroup = useTemplateCommands();
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

	const canvasViewGroups: CommandGroup[] = [
		baseCommandGroup,
		nodeCommandGroup,
		workflowCommandGroup,
		templateCommandGroup,
		workflowNavigationGroup,
	];

	const workflowsListViewGroups: CommandGroup[] = [
		workflowNavigationGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		baseCommandGroup,
	];

	const credentialsListViewGroups: CommandGroup[] = [
		credentialNavigationGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		baseCommandGroup,
	];

	const executionsListViewGroups: CommandGroup[] = [
		workflowNavigationGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		baseCommandGroup,
	];

	const dataStoresListViewGroups: CommandGroup[] = [
		dataTableNavigationGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
		credentialNavigationGroup,
		executionNavigationGroup,
		baseCommandGroup,
	];

	const activeCommandGroups = computed<CommandGroup[]>(() => {
		switch (router.currentRoute.value.name) {
			case VIEWS.WORKFLOW:
			case VIEWS.NEW_WORKFLOW:
				return canvasViewGroups;
			case VIEWS.WORKFLOWS:
			case VIEWS.PROJECTS_WORKFLOWS:
				return workflowsListViewGroups;
			case VIEWS.CREDENTIALS:
			case VIEWS.PROJECTS_CREDENTIALS:
				return credentialsListViewGroups;
			case VIEWS.EXECUTIONS:
			case VIEWS.PROJECTS_EXECUTIONS:
				return executionsListViewGroups;
			case PROJECT_DATA_STORES:
			case DATA_STORE_VIEW:
				return dataStoresListViewGroups;
			default:
				return [baseCommandGroup];
		}
	});

	const context = computed(() => {
		switch (router.currentRoute.value.name) {
			case VIEWS.WORKFLOW:
				return 'workflow todo';
			case VIEWS.WORKFLOWS:
			case VIEWS.PROJECTS_WORKFLOWS:
				return i18n.baseText('commandBar.sections.workflows');
			case VIEWS.CREDENTIALS:
			case VIEWS.PROJECTS_CREDENTIALS:
				return i18n.baseText('commandBar.sections.credentials');
			case VIEWS.EXECUTIONS:
			case VIEWS.PROJECTS_EXECUTIONS:
				return i18n.baseText('commandBar.sections.executions');
			case PROJECT_DATA_STORES:
			case DATA_STORE_VIEW:
				return i18n.baseText('commandBar.sections.dataTables');
			default:
				return '';
		}
	});

	const items = computed<CommandBarItem[]>(() => {
		return activeCommandGroups.value.flatMap((group) => group.commands.value);
	});

	const isLoading = computed(() => {
		return activeCommandGroups.value.some((group) => group.isLoading?.value === true);
	});

	function onCommandBarChange(query: string) {
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
	}

	return {
		isEnabled,
		items,
		initialize,
		onCommandBarChange,
		onCommandBarNavigateTo,
		placeholder,
		context,
		isLoading,
	};
}
