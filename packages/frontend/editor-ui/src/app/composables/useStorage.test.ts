import { nextTick } from 'vue';
import { useStorage } from './useStorage';

describe('useStorage', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('should initialize with null if no value is stored in localStorage', () => {
		const key = 'test-key';
		const data = useStorage(key);

		expect(data.value).toBeNull();
	});

	it('should initialize with the stored value if it exists in localStorage', () => {
		const key = 'test-key';
		const value = 'test-value';
		localStorage.setItem(key, value);

		const data = useStorage(key);
		expect(data.value).toBe(value);
	});

	it('should update localStorage when the data ref is updated', async () => {
		const key = 'test-key';
		const value = 'test-value';
		const data = useStorage(key);

		data.value = value;
		await nextTick();

		expect(localStorage.getItem(key)).toBe(value);
	});

	it('should remove the key from localStorage when the data ref is set to null', async () => {
		const key = 'test-key';
		const value = 'test-value';
		localStorage.setItem(key, value);

		const data = useStorage(key);

		data.value = null;
		await nextTick();

		expect(localStorage.getItem(key)).toBeNull();
	});

	it('should fall back when localStorage access throws', () => {
		const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

		try {
			Object.defineProperty(globalThis, 'localStorage', {
				configurable: true,
				get() {
					throw new Error('blocked');
				},
			});

			const data = useStorage('test-key');
			expect(data.value).toBeNull();
		} finally {
			if (originalDescriptor) {
				Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
			}
		}
	});
});
