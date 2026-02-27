import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import { deepCopy } from 'n8n-workflow';
import type { IWorkflowSettings } from 'n8n-workflow';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type SettingsPayload = {
	settings: IWorkflowSettings;
};

export type SettingsChangeEvent = ChangeEvent<SettingsPayload>;

export function useWorkflowDocumentSettings() {
	const settings = ref<IWorkflowSettings>({});

	const onSettingsChange = createEventHook<SettingsChangeEvent>();

	function applySettings(
		newSettings: IWorkflowSettings,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		settings.value = newSettings;
		void onSettingsChange.trigger({ action, payload: { settings: newSettings } });
	}

	function setSettings(newSettings: IWorkflowSettings) {
		applySettings(newSettings);
	}

	function getSettingsSnapshot(): IWorkflowSettings {
		return deepCopy(settings.value);
	}

	return {
		settings: readonly(settings),
		setSettings,
		getSettingsSnapshot,
		onSettingsChange: onSettingsChange.on,
	};
}
