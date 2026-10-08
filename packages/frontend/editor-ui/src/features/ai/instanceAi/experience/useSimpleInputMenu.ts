import { computed, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { getResourcePermissions } from '@n8n/permissions';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import type { InputMenuItem } from '../composables/useInstanceAiInputMenuItems';
import { ADD_WORKFLOW_ITEM_ID, countDisconnectedItems, simpleMenuItems } from './simpleMenu';
import { useExperienceMode } from './useExperienceMode';
import { useLastUsedProject } from './useLastUsedProject';

/**
 * Trims the composer + menu to four items in Simple mode. Power mode and the flag off
 * keep the full menu and its attention count.
 */
export function useSimpleInputMenu(
	menuItems: Readonly<Ref<InputMenuItem[]>>,
	disconnectedCount: Readonly<Ref<number>>,
) {
	const i18n = useI18n();
	const router = useRouter();
	const projectsStore = useProjectsStore();
	const sourceControlStore = useSourceControlStore();
	const { isSimple } = useExperienceMode();
	const { simpleDefaultProjectId } = useLastUsedProject();

	/**
	 * The project in which Simple mode starts new work, when the user can create a workflow
	 * there. The rule is the same as for "New workflow" in the sidebar + menu: no new workflow
	 * on a protected branch or without `workflow:create` in the project.
	 */
	function addWorkflowProjectId(): string | undefined {
		if (sourceControlStore.preferences.branchReadOnly) return undefined;
		const projectId = simpleDefaultProjectId();
		if (!projectId) return undefined;
		const project = [projectsStore.personalProject, ...projectsStore.myProjects].find(
			(candidate) => candidate?.id === projectId,
		);
		return getResourcePermissions(project?.scopes).workflow.create === true ? projectId : undefined;
	}

	// The same editor route as "New workflow" in the sidebar + menu, in the same tab.
	async function addWorkflow() {
		// Read the project again: the last-used project or the rights can change after the
		// menu was built.
		const projectId = addWorkflowProjectId();
		if (!projectId) return;
		await router.push({ name: VIEWS.NEW_WORKFLOW, query: { projectId } });
	}

	const addWorkflowItem = computed<InputMenuItem>(() => ({
		id: ADD_WORKFLOW_ITEM_ID,
		label: i18n.baseText('workflows.add'),
		icon: { type: 'icon', value: 'workflow' },
		disabled: addWorkflowProjectId() === undefined,
		data: { action: addWorkflow },
	}));

	const visibleMenuItems = computed(() =>
		isSimple.value ? simpleMenuItems(menuItems.value, addWorkflowItem.value) : menuItems.value,
	);

	// A hidden item must not make the + button ask for attention.
	const visibleDisconnectedCount = computed(() =>
		isSimple.value ? countDisconnectedItems(visibleMenuItems.value) : disconnectedCount.value,
	);

	return { menuItems: visibleMenuItems, disconnectedConnectionCount: visibleDisconnectedCount };
}
