import { useLocalStorage } from '@vueuse/core';

const STORAGE_KEY = 'n8n.prototype.groupParams';

// Module-level singleton so every card + editor shares one reactive map.
// PROTOTYPE: param edits live here only — they are never written back to the
// real node parameters.
const overrides = useLocalStorage<Record<string, Record<string, string>>>(STORAGE_KEY, {});

export function usePrototypeGroupParams() {
	function getOverride(groupId: string, paramId: string): string | undefined {
		return overrides.value[groupId]?.[paramId];
	}

	function setValue(groupId: string, paramId: string, value: string) {
		overrides.value = {
			...overrides.value,
			[groupId]: { ...overrides.value[groupId], [paramId]: value },
		};
	}

	return { getOverride, setValue };
}
