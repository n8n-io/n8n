import { useStorage as useStorageComposable } from '@vueuse/core';

export function useStorage(key: string) {
	const data = useStorageComposable(key, null, window.localStorage, { writeDefaults: false });

	if (data.value === 'undefined') {
		data.value = null;
	}

	return data;
}
