import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useCalloutHelpers } from '@/app/composables/useCalloutHelpers';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import { BUILDER_ENABLED_VIEWS } from '../constants';
import type { VIEWS } from '@/app/constants';

export const ASK_MODE_COACHMARK_KEY = 'ask-mode-coachmark';

const isBuilderEnabledView = (name: unknown): name is VIEWS =>
	typeof name === 'string' && (BUILDER_ENABLED_VIEWS as readonly string[]).includes(name);

export function useAskModeCoachmark() {
	const chatPanelStore = useChatPanelStore();
	const builderStore = useBuilderStore();
	const settingsStore = useSettingsStore();
	const route = useRoute();
	const { isCalloutDismissed, dismissCallout } = useCalloutHelpers();
	const { check } = useEnvFeatureFlag();

	const isBuildMode = computed(() => chatPanelStore.isBuilderModeActive);

	const isMergeAskBuildEnabled = computed(
		() =>
			check.value('MERGE_ASK_BUILD') &&
			settingsStore.isAiAssistantEnabled &&
			builderStore.isAIBuilderEnabled,
	);

	// Show toggle only when both modes are available in current view
	const canToggleModes = computed(() => {
		if (isMergeAskBuildEnabled.value) return false;
		return (
			settingsStore.isAiAssistantEnabled &&
			builderStore.isAIBuilderEnabled &&
			isBuilderEnabledView(route?.name)
		);
	});

	// Show coachmark when:
	// - Panel is open in Ask mode
	// - showCoachmark flag is true (false when switching via switcher)
	// - User hasn't dismissed it yet
	// - Toggle is visible (both modes available)
	const shouldShowCoachmark = computed(() => {
		return Boolean(
			chatPanelStore.isOpen &&
				!isBuildMode.value &&
				chatPanelStore.showCoachmark &&
				canToggleModes.value &&
				!isCalloutDismissed(ASK_MODE_COACHMARK_KEY),
		);
	});

	async function onDismissCoachmark() {
		await dismissCallout(ASK_MODE_COACHMARK_KEY);
	}

	return {
		isBuildMode,
		isMergeAskBuildEnabled,
		canToggleModes,
		shouldShowCoachmark,
		onDismissCoachmark,
	};
}
