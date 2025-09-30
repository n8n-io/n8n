import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { VIEWS } from '@/constants';
import { type CommandBarItem } from '@n8n/design-system/components/N8nCommandBar/types';
import { useNodeCommands } from './commandBar/useNodeCommands';
import { useWorkflowCommands } from './commandBar/useWorkflowCommands';
import { useWorkflowNavigationCommands } from './commandBar/useWorkflowNavigationCommands';
import { useTemplateCommands } from './commandBar/useTemplateCommands';
import { useCredentialCommands } from './commandBar/useCredentialCommands';
import { useBaseCommands } from './commandBar/useBaseCommands';
import { useDataTableNavigationCommands } from './commandBar/useDataTableNavigationCommands';
import type { CommandGroup } from './commandBar/types';

export function useCommandBar() {
	const nodeTypesStore = useNodeTypesStore();
	const router = useRouter();

	const activeNodeId = ref<string | null>(null);
	const lastQuery = ref('');

	const baseCommandGroup = useBaseCommands();
	const nodeCommandGroup = useNodeCommands();
	const workflowCommandGroup = useWorkflowCommands();
	const workflowNavigationGroup = useWorkflowNavigationCommands({
		lastQuery,
		activeNodeId,
	});
	const templateCommandGroup = useTemplateCommands();
	const credentialCommandGroup = useCredentialCommands();
	const dataTableNavigationGroup = useDataTableNavigationCommands({
		lastQuery,
		activeNodeId,
	});

	const canvasViewGroups: CommandGroup[] = [
		baseCommandGroup,
		nodeCommandGroup,
		workflowCommandGroup,
		credentialCommandGroup,
		templateCommandGroup,
	];

	const workflowsListViewGroups: CommandGroup[] = [
		baseCommandGroup,
		workflowNavigationGroup,
		dataTableNavigationGroup,
	];

	const activeCommandGroups = computed<CommandGroup[]>(() => {
		if (router.currentRoute.value.name === VIEWS.WORKFLOW) {
			return canvasViewGroups;
		} else if (
			router.currentRoute.value.name === VIEWS.WORKFLOWS ||
			router.currentRoute.value.name === VIEWS.PROJECTS_WORKFLOWS
		) {
			return workflowsListViewGroups;
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

	onMounted(async () => {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
	});

	return {
		items,
		onCommandBarChange,
		onCommandBarNavigateTo,
	};
}
