import { computed, onScopeDispose, ref } from 'vue';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';

export const NODE_CREATOR_SHORTCUT_COACHMARK_KEY = 'node-creator-shortcut-coachmark';

export function useNodeCreatorShortcutCoachmark() {
	const workflowId = useInjectWorkflowId();
	const { isCalloutDismissed, dismissCallout } = useCalloutHelpers(workflowId);

	const isTabPressed = ref(false);

	const shouldShowCoachmark = computed(() => {
		return isTabPressed.value && !isCalloutDismissed(NODE_CREATOR_SHORTCUT_COACHMARK_KEY);
	});

	function onDeprecatedTabShortcut() {
		isTabPressed.value = true;
	}

	canvasEventBus.on('deprecated:tab-shortcut', onDeprecatedTabShortcut);

	onScopeDispose(() => {
		canvasEventBus.off('deprecated:tab-shortcut', onDeprecatedTabShortcut);
	});

	async function onDismissCoachmark() {
		isTabPressed.value = false;
		await dismissCallout(NODE_CREATOR_SHORTCUT_COACHMARK_KEY);
	}

	return {
		shouldShowCoachmark,
		onDismissCoachmark,
	};
}
