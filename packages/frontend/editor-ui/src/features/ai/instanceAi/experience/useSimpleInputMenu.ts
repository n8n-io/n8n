import { computed, type ComputedRef, type Ref } from 'vue';
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

/** The full composer + menu and the number of its lost connections. */
type FullInputMenu = {
	menuItems: Readonly<Ref<InputMenuItem[]>>;
	disconnectedConnectionCount: Readonly<Ref<number>>;
};

type VisibleInputMenu<T extends FullInputMenu> = Omit<T, keyof FullInputMenu> & {
	menuItems: ComputedRef<InputMenuItem[]>;
	disconnectedConnectionCount: ComputedRef<number>;
};

/**
 * Trims the composer + menu to four items in Simple mode. Power mode and the flag off
 * keep the full menu and its attention count. The other fields of `menu` stay as they are.
 */
export function useSimpleInputMenu<T extends FullInputMenu>(menu: T): VisibleInputMenu<T> {
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

	// The same label as in the sidebar + menu, so that one action has one name.
	const addWorkflowItem = computed<InputMenuItem>(() => ({
		id: ADD_WORKFLOW_ITEM_ID,
		label: i18n.baseText('projects.menu.create.workflow'),
		icon: { type: 'icon', value: 'workflow' },
		disabled: addWorkflowProjectId() === undefined,
		data: { action: addWorkflow },
	}));

	const menuItems = computed(() =>
		isSimple.value
			? simpleMenuItems(menu.menuItems.value, addWorkflowItem.value)
			: menu.menuItems.value,
	);

	// A hidden item must not make the + button ask for attention.
	const disconnectedConnectionCount = computed(() =>
		isSimple.value
			? countDisconnectedItems(menuItems.value)
			: menu.disconnectedConnectionCount.value,
	);

	return { ...menu, menuItems, disconnectedConnectionCount };
}
