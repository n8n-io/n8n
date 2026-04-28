import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import { BINARY_MODE_SEPARATE, deepCopy } from 'n8n-workflow';
import type { IWorkflowSettings } from 'n8n-workflow';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type SettingsPayload = {
	settings: IWorkflowSettings;
};

export type SettingsChangeEvent = ChangeEvent<SettingsPayload>;

export const DEFAULT_SETTINGS = {
	executionOrder: 'v1',
	binaryMode: BINARY_MODE_SEPARATE,
} satisfies IWorkflowSettings;

export interface WorkflowDocumentSettingsDeps {
	syncWorkflowObject: (settings: IWorkflowSettings) => void;
}

export function useWorkflowDocumentSettings(deps: WorkflowDocumentSettingsDeps) {
	const settings = ref<IWorkflowSettings>({ ...DEFAULT_SETTINGS });

	const onSettingsChange = createEventHook<SettingsChangeEvent>();

	function applySettings(
		newSettings: IWorkflowSettings,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		settings.value = newSettings;
		deps.syncWorkflowObject(newSettings);
		void onSettingsChange.trigger({ action, payload: { settings: newSettings } });
	}

	function setSettings(newSettings: IWorkflowSettings) {
		applySettings({ ...DEFAULT_SETTINGS, ...newSettings });
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
