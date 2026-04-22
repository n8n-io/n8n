import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import { BINARY_MODE_SEPARATE, deepCopy } from 'n8n-workflow';
import type { IWorkflowSettings } from 'n8n-workflow';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';
import { useWorkflowsStore } from '../workflows.store';

export type SettingsPayload = {
	settings: IWorkflowSettings;
};

export type SettingsChangeEvent = ChangeEvent<SettingsPayload>;

export const DEFAULT_SETTINGS = {
	executionOrder: 'v1',
	binaryMode: BINARY_MODE_SEPARATE,
} satisfies IWorkflowSettings;

export function useWorkflowDocumentSettings() {
	const settings = ref<IWorkflowSettings>({ ...DEFAULT_SETTINGS });
	const workflowsStore = useWorkflowsStore();

	const onSettingsChange = createEventHook<SettingsChangeEvent>();

	function applySettings(
		newSettings: IWorkflowSettings,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		settings.value = newSettings;
		void onSettingsChange.trigger({ action, payload: { settings: newSettings } });
	}

	function setSettings(newSettings: IWorkflowSettings) {
		applySettings({ ...DEFAULT_SETTINGS, ...newSettings });
		workflowsStore.workflowObject.setSettings(newSettings); // TODO: delegates to workflows store for now
	}

	function mergeSettings(partialSettings: Partial<IWorkflowSettings>) {
		applySettings({ ...settings.value, ...partialSettings });
	}

	function getSettingsSnapshot(): IWorkflowSettings {
		return deepCopy(settings.value);
	}

	return {
		settings: readonly(settings),
		setSettings,
		mergeSettings,
		getSettingsSnapshot,
		onSettingsChange: onSettingsChange.on,
	};
}
