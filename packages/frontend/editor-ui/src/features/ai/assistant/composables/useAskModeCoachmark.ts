import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import { BUILDER_ENABLED_VIEWS } from '../constants';
import type { VIEWS } from '@/app/constants';

export const ASK_MODE_COACHMARK_KEY = 'ask-mode-coachmark';

export function useAskModeCoachmark() {
	const chatPanelStore = useChatPanelStore();
	const builderStore = useBuilderStore();
	const settingsStore = useSettingsStore();
	const route = useRoute();
	const { isCalloutDismissed, dismissCallout } = useCalloutHelpers();

	const isBuildMode = computed(() => chatPanelStore.isBuilderModeActive);

	// Show toggle only when both modes are available in current view
	const canToggleModes = computed(() => {
		const currentRoute = route?.name;
		return (
			settingsStore.isAiAssistantEnabled &&
			builderStore.isAIBuilderEnabled &&
			currentRoute &&
			BUILDER_ENABLED_VIEWS.includes(currentRoute as VIEWS)
		);
	});

	// Show coachmark when:
	// - Panel is open in Ask mode
	// - Not opened via error/credential helpers
	// - User hasn't dismissed it yet
	// - Toggle is visible (both modes available)
	const shouldShowCoachmark = computed(() => {
		return Boolean(
			chatPanelStore.isOpen &&
				!isBuildMode.value &&
				chatPanelStore.openSource !== 'helper' &&
				canToggleModes.value &&
				!isCalloutDismissed(ASK_MODE_COACHMARK_KEY),
		);
	});

	async function onDismissCoachmark() {
		await dismissCallout(ASK_MODE_COACHMARK_KEY);
	}

	return {
		isBuildMode,
		canToggleModes,
		shouldShowCoachmark,
		onDismissCoachmark,
	};
}
