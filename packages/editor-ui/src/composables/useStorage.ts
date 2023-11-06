import { useStorage as useStorageComposable } from '@vueuse/core';
import type { Ref } from 'vue';

export function useStorage(key: string): Ref<string | null> {
	const data = useStorageComposable(key, null, window.localStorage, { writeDefaults: false });

	if (data.value === 'undefined') {
		data.value = null;
	}

	return data;
}
