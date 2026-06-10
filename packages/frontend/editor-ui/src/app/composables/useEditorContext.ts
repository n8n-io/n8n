import { computed, inject } from 'vue';

import { EditorEnabledFeaturesKey, type EditorFeature } from '@/app/constants/injectionKeys';
import { useSettingsStore } from '@/app/stores/settings.store';

/**
 * Per-editor host overrides for the current editor context.
 *
 * Editor hosts (e.g. the Instance AI artifact preview) scope their embedded
 * editor by providing `EditorEnabledFeaturesKey` — the capabilities the host
 * supersedes. AI features can only be restricted: an explicit `false` turns one
 * off, while omitted (or `true`) features fall back to their store values.
 * `readOnly` is a direct flag — `true` forces the canvas read-only. When no host
 * provides the key, AI features fall back to their store values and the canvas
 * is editable (`readOnly` is `false`).
 */
export function useEditorContext() {
	const settings = useSettingsStore();
	const enabledFeatures = inject(EditorEnabledFeaturesKey, null);

	// A host can only restrict: an explicit `false` supersedes the feature;
	// omitted (or `true`) falls back to the store gating below.
	const isEnabledByHost = (feature: EditorFeature): boolean =>
		enabledFeatures?.value?.[feature] !== false;

	const enabledInStore = (feature: EditorFeature): boolean => {
		switch (feature) {
			case 'aiAssistant':
				return settings.isAiAssistantEnabled === true;
			case 'aiBuilder':
				return settings.isAiBuilderEnabled === true;
			case 'askAi':
				return settings.isAskAiEnabled === true;
		}
	};

	const featureEnabled = (feature: EditorFeature) =>
		computed(() => enabledInStore(feature) && isEnabledByHost(feature));

	return {
		aiAssistant: featureEnabled('aiAssistant'),
		aiBuilder: featureEnabled('aiBuilder'),
		askAi: featureEnabled('askAi'),
		readOnly: computed(() => enabledFeatures?.value?.readOnly === true),
	};
}
