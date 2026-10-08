import { computed, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/app/constants';
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
	const { isSimple } = useExperienceMode();
	const { simpleDefaultProjectId } = useLastUsedProject();

	// The same editor route as "New workflow" in the sidebar + menu, in the same tab. The
	// workflow goes to the project in which Simple mode starts new chats.
	async function addWorkflow() {
		await router.push({
			name: VIEWS.NEW_WORKFLOW,
			query: { projectId: simpleDefaultProjectId() },
		});
	}

	const addWorkflowItem = computed<InputMenuItem>(() => ({
		id: ADD_WORKFLOW_ITEM_ID,
		label: i18n.baseText('workflows.add'),
		icon: { type: 'icon', value: 'workflow' },
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
