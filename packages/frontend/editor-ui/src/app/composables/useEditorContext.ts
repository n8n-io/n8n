import { computed, inject } from 'vue';

import { EditorEnabledFeaturesKey, type EditorFeature } from '@/app/constants/injectionKeys';
import { useSettingsStore } from '@/app/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';

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
 * `executionSuccessToasts` / `executionErrorToasts` are direct flags too — each
 * `true` (the default) shows that class of execution result toast; an explicit
 * `false` from the host suppresses it.
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
			case 'instanceAi':
				// Mirrors useInstanceAiAvailable() (the feature-layer gate) with
				// app-layer primitives so this base composable imports no feature:
				// the module is active, an admin hasn't disabled it, and the user
				// may message Instance AI.
				return (
					settings.isModuleActive('instance-ai') &&
					settings.moduleSettings['instance-ai']?.enabled !== false &&
					hasPermission(['rbac'], { rbac: { scope: 'instanceAi:message' } })
				);
		}
	};

	const featureEnabled = (feature: EditorFeature) =>
		computed(() => enabledInStore(feature) && isEnabledByHost(feature));

	return {
		aiAssistant: featureEnabled('aiAssistant'),
		aiBuilder: featureEnabled('aiBuilder'),
		askAi: featureEnabled('askAi'),
		instanceAi: featureEnabled('instanceAi'),
		readOnly: computed(() => enabledFeatures?.value?.readOnly === true),
		expandGroups: computed(() => enabledFeatures?.value?.expandGroups),
		executionButtonType: computed(() => enabledFeatures?.value?.executionButtonType ?? 'primary'),
		executionSuccessToasts: computed(
			() => enabledFeatures?.value?.executionSuccessToasts !== false,
		),
		executionErrorToasts: computed(() => enabledFeatures?.value?.executionErrorToasts !== false),
	};
}
