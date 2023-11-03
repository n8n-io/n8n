import {
	setLocalStorageValue,
	removeLocalStorageValue,
	getLocalStorageValue,
} from '../localStorageUtils';

describe('localStorageUtils', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should set a value in local storage', () => {
		setLocalStorageValue('testKey', 'testValue');
		expect(localStorage.getItem('testKey')).toBe('testValue');
	});

	it('should remove a value from local storage', () => {
		localStorage.setItem('testKey', 'testValue');
		removeLocalStorageValue('testKey');
		expect(localStorage.getItem('testKey')).toBeNull();
	});

	it('should get a value from local storage', () => {
		localStorage.setItem('testKey', 'testValue');
		const value = getLocalStorageValue('testKey');
		expect(value).toBe('testValue');
	});

	it('should handle errors for local storage getItem', () => {
		vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
			throw new Error('test');
		});
		const value = getLocalStorageValue('testKey');
		expect(value).toBeNull();
	});

	it('should return null if value is not in local storage', () => {
		const value = getLocalStorageValue('testKey');
		expect(value).toBeNull();
	});

	it('should remove the key and return null if value is "undefined"', () => {
		localStorage.setItem('testKey', 'undefined');
		const value = getLocalStorageValue('testKey');
		expect(value).toBeNull();
		expect(localStorage.getItem('testKey')).toBeNull();
	});
});
