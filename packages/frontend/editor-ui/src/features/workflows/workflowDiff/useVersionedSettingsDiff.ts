import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import isEqual from 'lodash/isEqual';
import {
	pickVersionedSettings,
	type IWorkflowSettings,
	type VersionedWorkflowSettingKey,
	type VersionedWorkflowSettings,
} from 'n8n-workflow';
import { getObjectKeys } from '@/app/utils/typesUtils';
import type { SettingsChange } from './useWorkflowDiffUI';

type VersionedSettingDisplay = {
	/** Returns false to hide the setting, for example when its feature is off. */
	isEnabled: () => boolean;
	format: (settings: Required<VersionedWorkflowSettings>) => string;
};

/**
 * Compares the version-scoped settings of two workflows. A missing value is equal to
 * the default value.
 */
export function useVersionedSettingsDiff() {
	const i18n = useI18n();
	const settingsStore = useSettingsStore();

	// Lists every version-scoped setting, so a new one without an entry does not compile.
	const display: Record<VersionedWorkflowSettingKey, VersionedSettingDisplay> = {
		engineType: {
			isEnabled: () => settingsStore.isEngineV2Enabled,
			format: ({ engineType }) =>
				i18n.baseText('generic.engine', { interpolate: { engine: engineType } }),
		},
	};

	return (
		sourceSettings?: IWorkflowSettings | null,
		targetSettings?: IWorkflowSettings | null,
	): SettingsChange[] => {
		const source = pickVersionedSettings(sourceSettings);
		const target = pickVersionedSettings(targetSettings);

		return getObjectKeys(display)
			.filter((key) => display[key].isEnabled() && !isEqual(source[key], target[key]))
			.map((key) => ({
				name: key,
				before: display[key].format(source),
				after: display[key].format(target),
			}));
	};
}
