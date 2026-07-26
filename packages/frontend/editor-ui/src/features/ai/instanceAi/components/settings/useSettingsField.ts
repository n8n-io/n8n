import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import type {
	InstanceAiAdminSettingsResponse,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiUserPreferencesResponse,
	InstanceAiUserPreferencesUpdateRequest,
} from '@n8n/api-types';

type StringField = keyof {
	[K in keyof InstanceAiAdminSettingsResponse as InstanceAiAdminSettingsResponse[K] extends string
		? K
		: never]: true;
};
type NumberField = keyof {
	[K in keyof InstanceAiAdminSettingsResponse as InstanceAiAdminSettingsResponse[K] extends number
		? K
		: never]: true;
};
type BoolField = keyof {
	[K in keyof InstanceAiAdminSettingsResponse as InstanceAiAdminSettingsResponse[K] extends boolean
		? K
		: never]: true;
};

type PreferenceStringField = keyof {
	[K in keyof InstanceAiUserPreferencesResponse as InstanceAiUserPreferencesResponse[K] extends string
		? K
		: never]: true;
};

export function useSettingsField() {
	const store = useInstanceAiSettingsStore();

	function getString(key: StringField & keyof InstanceAiAdminSettingsUpdateRequest): string {
		const draftVal = store.draft[key];
		if (draftVal !== undefined) return String(draftVal);
		return store.settings?.[key] ?? '';
	}

	function getNumber(key: NumberField & keyof InstanceAiAdminSettingsUpdateRequest): number {
		const draftVal = store.draft[key];
		if (draftVal !== undefined) return Number(draftVal);
		return store.settings?.[key] ?? 0;
	}

	function getBool(key: BoolField & keyof InstanceAiAdminSettingsUpdateRequest): boolean {
		const draftVal = store.draft[key];
		if (draftVal !== undefined) return Boolean(draftVal);
		const fromSettings = store.settings?.[key];
		if (fromSettings !== undefined) return Boolean(fromSettings);
		if (key === 'enabled') return true;
		return false;
	}

	function getPreferenceString(
		key: PreferenceStringField & keyof InstanceAiUserPreferencesUpdateRequest,
	): string {
		const draftVal = store.preferencesDraft[key];
		if (draftVal !== undefined) return String(draftVal);
		return store.preferences?.[key] ?? '';
	}

	return { store, getString, getNumber, getBool, getPreferenceString };
}
