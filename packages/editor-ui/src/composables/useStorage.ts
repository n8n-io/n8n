import { ref, watchEffect } from 'vue';

export function useStorage(key: string) {
	const data = ref<null | string>(null);

	function updateLocalStorage(value: string | null) {
		try {
			if (value === null) {
				localStorage.removeItem(key);
			} else {
				localStorage.setItem(key, value);
			}
		} catch (e) {
			console.log(`Failed to write to localStorage for key: ${key}`);
		}
	}

	// initialize
	try {
		const storedValue = localStorage.getItem(key);
		// bug in 1.15.1 where it returns 'undefined' as a string
		if (storedValue !== null && storedValue !== 'undefined') {
			data.value = storedValue;
		}
	} catch (e) {
		console.log(`Failed to read from localStorage for key ${key}`);
	}

	// Watch the ref and update localStorage whenever it changes
	watchEffect(() => updateLocalStorage(data.value));

	return data;
}
