import { createGlobalState, useLocalStorage } from '@vueuse/core';
import type { BaseTextKey } from '@n8n/i18n';
import { computed } from 'vue';

import { FAKE_MODEL_CONNECTIONS } from './fakeModelCatalog';
import type { ModelPickerConnection } from './modelPicker.utils';

/**
 * ponytail: prototype-only walkthrough scenarios. They swap the fake connections
 * the picker starts from, so a demo can begin with nothing connected or with
 * several providers. Remove this file when the picker reads real credentials.
 */
export type ModelPickerScenarioId = 'current' | 'empty' | 'connected';

export const MODEL_PICKER_SCENARIOS: Record<
	ModelPickerScenarioId,
	{
		labelKey: BaseTextKey;
		connections: ModelPickerConnection[];
		/** Shows the model selector the product ships today instead of the new picker. */
		currentPicker?: boolean;
	}
> = {
	current: {
		labelKey: 'agents.modelPicker.scenario.current',
		connections: [],
		currentPicker: true,
	},
	empty: {
		labelKey: 'agents.modelPicker.scenario.empty',
		connections: [],
	},
	connected: {
		labelKey: 'agents.modelPicker.scenario.connected',
		connections: FAKE_MODEL_CONNECTIONS,
	},
};

function isScenarioId(value: string): value is ModelPickerScenarioId {
	return value in MODEL_PICKER_SCENARIOS;
}

/** One state for the page, kept in local storage so a reload keeps the scenario. */
export const useModelPickerScenario = createGlobalState(() => {
	const stored = useLocalStorage<string>('N8N_AGENT_MODEL_PICKER_SCENARIO', 'connected');
	/** A demo key would fail the provider's check, so the walkthrough skips it by default. */
	const skipKeyCheck = useLocalStorage('N8N_AGENT_MODEL_PICKER_SKIP_KEY_CHECK', true);

	const scenario = computed<ModelPickerScenarioId>({
		get: () => (isScenarioId(stored.value) ? stored.value : 'connected'),
		set: (id) => {
			stored.value = id;
		},
	});

	/** The product's own selector, for showing the current design before the proposal. */
	const showsCurrentPicker = computed(
		() => MODEL_PICKER_SCENARIOS[scenario.value].currentPicker === true,
	);

	return { scenario, skipKeyCheck, showsCurrentPicker };
});
