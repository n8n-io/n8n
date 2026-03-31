import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import type {
	InstanceAiAdminSettingsResponse,
	InstanceAiAdminSettingsUpdateRequest,
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
		return store.settings?.[key] ?? false;
	}

	return { store, getString, getNumber, getBool };
}
