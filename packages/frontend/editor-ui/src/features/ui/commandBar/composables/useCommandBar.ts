import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useProjectsStore } from '@/features/projects/projects.store';
import { COMMAND_BAR_EXPERIMENT, VIEWS } from '@/constants';
import { type CommandBarItem } from '@n8n/design-system/components/N8nCommandBar/types';
import { useNodeCommands } from './useNodeCommands';
import { useWorkflowCommands } from './useWorkflowCommands';
import { useWorkflowNavigationCommands } from './useWorkflowNavigationCommands';
import { useTemplateCommands } from './useTemplateCommands';
import { useBaseCommands } from './useBaseCommands';
import { useDataTableNavigationCommands } from './useDataTableNavigationCommands';
import { useCredentialNavigationCommands } from './useCredentialNavigationCommands';
import type { CommandGroup } from '../commandBar.types';
import { usePostHog } from '@/stores/posthog.store';

export function useCommandBar() {
	const nodeTypesStore = useNodeTypesStore();
	const projectsStore = useProjectsStore();
	const router = useRouter();
	const route = useRoute();
	const postHog = usePostHog();

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

	const canvasViewGroups: CommandGroup[] = [
		baseCommandGroup,
		nodeCommandGroup,
		workflowCommandGroup,
		templateCommandGroup,
	];

	const workflowsListViewGroups: CommandGroup[] = [
		baseCommandGroup,
		workflowNavigationGroup,
		dataTableNavigationGroup,
	];

	const credentialsListViewGroups: CommandGroup[] = [
		credentialNavigationGroup,
		workflowNavigationGroup,
		dataTableNavigationGroup,
		baseCommandGroup,
	];

	const activeCommandGroups = computed<CommandGroup[]>(() => {
		if (router.currentRoute.value.name === VIEWS.WORKFLOW) {
			return canvasViewGroups;
		} else if (
			router.currentRoute.value.name === VIEWS.WORKFLOWS ||
			router.currentRoute.value.name === VIEWS.PROJECTS_WORKFLOWS
		) {
			return workflowsListViewGroups;
		} else if (
			router.currentRoute.value.name === VIEWS.CREDENTIALS ||
			router.currentRoute.value.name === VIEWS.PROJECTS_CREDENTIALS
		) {
			return credentialsListViewGroups;
		}
		return [baseCommandGroup];
	});

	const items = computed<CommandBarItem[]>(() => {
		return activeCommandGroups.value.flatMap((group) => group.commands.value);
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
	};
}
