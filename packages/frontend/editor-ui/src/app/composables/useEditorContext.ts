import { computed, inject } from 'vue';

import { EditorDisabledFeaturesKey, type EditorFeature } from '@/app/constants/injectionKeys';
import { useSettingsStore } from '@/app/stores/settings.store';

/**
 * Per-editor host overrides for the current editor context.
 *
 * Editor hosts (e.g. the Instance AI artifact preview) scope their embedded
 * editor by providing `EditorDisabledFeaturesKey` — the capabilities the host
 * supersedes. This composable surfaces them as a uniform set of flags. When no
 * host provides the key, AI features fall back to their store values and the
 * canvas is editable (`readOnly` is `false`).
 */
export function useEditorContext() {
	const settings = useSettingsStore();
	const disabledFeatures = inject(EditorDisabledFeaturesKey, null);

	const isDisabled = (feature: EditorFeature): boolean =>
		disabledFeatures?.value?.[feature] === true;

	const enabledInStore = (feature: EditorFeature): boolean => {
		switch (feature) {
			case 'aiAssistant':
				return settings.isAiAssistantEnabled === true;
			case 'aiBuilder':
				return settings.isAiBuilderEnabled === true;
			case 'askAi':
				return settings.isAskAiEnabled === true;
			case 'editing':
				return true;
		}
	};

	const featureEnabled = (feature: EditorFeature) =>
		computed(() => enabledInStore(feature) && !isDisabled(feature));

	return {
		aiAssistant: featureEnabled('aiAssistant'),
		aiBuilder: featureEnabled('aiBuilder'),
		askAi: featureEnabled('askAi'),
		readOnly: computed(() => isDisabled('editing')),
	};
}
