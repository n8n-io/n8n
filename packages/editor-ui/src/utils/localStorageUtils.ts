export function setLocalStorageValue(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch (error) {}
}

export function removeLocalStorageValue(key: string): void {
	try {
		localStorage.removeItem(key);
	} catch (error) {}
}

export function getLocalStorageValue(key: string): string | null {
	try {
		const value = localStorage.getItem(key);
		if (value === 'undefined') {
			// bug in 1.15.1
			throw new Error('Value is "undefined"');
		}

		return value;
	} catch (error) {
		removeLocalStorageValue(key);
		return null;
	}
}