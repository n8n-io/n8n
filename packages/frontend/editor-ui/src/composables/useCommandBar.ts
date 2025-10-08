import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useProjectsStore } from '@/stores/projects.store';
import { COMMAND_BAR_EXPERIMENT, VIEWS } from '@/constants';
import { type CommandBarItem } from '@n8n/design-system/components/N8nCommandBar/types';
import { useNodeCommands } from './commandBar/useNodeCommands';
import { useWorkflowCommands } from './commandBar/useWorkflowCommands';
import { useWorkflowNavigationCommands } from './commandBar/useWorkflowNavigationCommands';
import { useDataTableNavigationCommands } from './commandBar/useDataTableNavigationCommands';
import { useCredentialNavigationCommands } from './commandBar/useCredentialNavigationCommands';
import { useExecutionNavigationCommands } from './commandBar/useExecutionNavigationCommands';
import { useProjectNavigationCommands } from './commandBar/useProjectNavigationCommands';
import { useExecutionCommands } from './commandBar/useExecutionCommands';
import { useEvaluationCommands } from './commandBar/useEvaluationCommands';
import { useGenericCommands } from './commandBar/useGenericCommands';
import type { CommandGroup } from './commandBar/types';
import { usePostHog } from '@/stores/posthog.store';
import { useI18n } from '@n8n/i18n';
import { PROJECT_DATA_TABLES, DATA_TABLE_VIEW } from '@/features/dataTable/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';

export function useCommandBar() {
	const nodeTypesStore = useNodeTypesStore();
	const projectsStore = useProjectsStore();
	const workflowStore = useWorkflowsStore();
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
	const evaluationCommandGroup = useEvaluationCommands();
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

	const canvasViewGroups: CommandGroup[] = [
		nodeCommandGroup,
		workflowCommandGroup,
		workflowNavigationGroup,
		genericCommandGroup,
	];

	const executionViewGroups: CommandGroup[] = [
		executionCommandGroup,
		workflowNavigationGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const workflowsListViewGroups: CommandGroup[] = [
		workflowNavigationGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const credentialsListViewGroups: CommandGroup[] = [
		credentialNavigationGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const executionsListViewGroups: CommandGroup[] = [
		workflowNavigationGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		genericCommandGroup,
	];

	const dataStoresListViewGroups: CommandGroup[] = [
		dataTableNavigationGroup,
		projectNavigationGroup,
		workflowNavigationGroup,
		credentialNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const evaluationViewGroups: CommandGroup[] = [
		evaluationCommandGroup,
		workflowNavigationGroup,
		projectNavigationGroup,
		credentialNavigationGroup,
		dataTableNavigationGroup,
		executionNavigationGroup,
		genericCommandGroup,
	];

	const fallbackViewCommands: CommandGroup[] = [
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
					: i18n.baseText('commandBar.sections.workflow');
			case VIEWS.EXECUTION_PREVIEW:
			case VIEWS.EXECUTION_DEBUG:
				return workflowStore.workflow.name
					? i18n.baseText('commandBar.sections.execution') + ' ⋅ ' + workflowStore.workflow.name
					: i18n.baseText('commandBar.sections.execution');
			case VIEWS.WORKFLOWS:
			case VIEWS.PROJECTS_WORKFLOWS:
				return i18n.baseText('commandBar.sections.workflows');
			case VIEWS.CREDENTIALS:
			case VIEWS.PROJECTS_CREDENTIALS:
				return i18n.baseText('commandBar.sections.credentials');
			case VIEWS.EXECUTIONS:
			case VIEWS.PROJECTS_EXECUTIONS:
				return i18n.baseText('commandBar.sections.executions');
			case PROJECT_DATA_TABLES:
			case DATA_TABLE_VIEW:
				return i18n.baseText('commandBar.sections.dataTables');
			case VIEWS.EVALUATION:
			case VIEWS.EVALUATION_EDIT:
			case VIEWS.EVALUATION_RUNS_DETAIL:
				return workflowStore.workflow.name
					? i18n.baseText('commandBar.sections.evaluation') + ' ⋅ ' + workflowStore.workflow.name
					: i18n.baseText('commandBar.sections.evaluation');
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
