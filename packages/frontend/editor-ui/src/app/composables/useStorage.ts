import { useStorage as useStorageComposable } from '@vueuse/core';
import type { Ref } from 'vue';

const fallbackStorage: Storage = {
	length: 0,
	clear: () => {},
	getItem: () => null,
	key: () => null,
	removeItem: () => {},
	setItem: () => {},
};

function getSafeStorage(): Storage {
	const storage = globalThis.localStorage;
	if (
		storage &&
		typeof storage.getItem === 'function' &&
		typeof storage.setItem === 'function' &&
		typeof storage.removeItem === 'function'
	) {
		return storage;
	}

	return fallbackStorage;
}

export function useStorage(key: string): Ref<string | null> {
	const data = useStorageComposable(key, null, getSafeStorage(), { writeDefaults: false });

	// bug in 1.15.1
	if (data.value === 'undefined') {
		data.value = null;
	}

	return data;
}
