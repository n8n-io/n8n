import { computed, ref } from 'vue';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';

export const NODE_CREATOR_SHORTCUT_COACHMARK_KEY = 'node-creator-shortcut-coachmark';

export function useNodeCreatorShortcutCoachmark() {
	const { isCalloutDismissed, dismissCallout } = useCalloutHelpers();

	const isTabPressed = ref(false);

	const shouldShowCoachmark = computed(() => {
		return isTabPressed.value && !isCalloutDismissed(NODE_CREATOR_SHORTCUT_COACHMARK_KEY);
	});

	async function onDismissCoachmark() {
		isTabPressed.value = false;
		await dismissCallout(NODE_CREATOR_SHORTCUT_COACHMARK_KEY);
	}

	return {
		isTabPressed,
		shouldShowCoachmark,
		onDismissCoachmark,
	};
}
