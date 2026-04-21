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
	let storage: Storage | undefined;
	try {
		storage = globalThis.localStorage;
	} catch {
		return fallbackStorage;
	}

	if (
		!storage ||
		typeof storage.getItem !== 'function' ||
		typeof storage.setItem !== 'function' ||
		typeof storage.removeItem !== 'function'
	) {
		return fallbackStorage;
	}

	// In private-browsing mode (Safari, Firefox) localStorage exists and has
	// the right methods, but setItem throws QuotaExceededError. Probe once so
	// callers never see a storage that appears valid but throws on write.
	try {
		const probe = '__n8n_storage_probe__';
		storage.setItem(probe, '1');
		storage.removeItem(probe);
	} catch {
		return fallbackStorage;
	}

	return storage;
}

export function useStorage(key: string): Ref<string | null> {
	const data = useStorageComposable(key, null, getSafeStorage(), { writeDefaults: false });

	// bug in 1.15.1
	if (data.value === 'undefined') {
		data.value = null;
	}

	return data;
}
