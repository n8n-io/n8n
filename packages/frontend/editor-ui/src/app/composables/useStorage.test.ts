import { nextTick } from 'vue';
import { useStorage } from './useStorage';

let storageState: Record<string, string> = {};

const localStorageMock: Storage = {
	get length() {
		return Object.keys(storageState).length;
	},
	clear: vi.fn(() => {
		storageState = {};
	}),
	getItem: vi.fn((key: string) => storageState[key] ?? null),
	key: vi.fn((index: number) => Object.keys(storageState)[index] ?? null),
	removeItem: vi.fn((key: string) => {
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete storageState[key];
	}),
	setItem: vi.fn((key: string, value: string) => {
		storageState[key] = value;
	}),
};

describe('useStorage', () => {
	beforeEach(() => {
		storageState = {};
		vi.stubGlobal('localStorage', localStorageMock);
		localStorageMock.setItem.mockReset();
		localStorageMock.removeItem.mockReset();
		localStorageMock.clear.mockReset();
		localStorageMock.getItem.mockClear();
		localStorageMock.key.mockClear();
		localStorage.clear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
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

	it('should fall back when localStorage setItem throws (private-browsing mode)', () => {
		const throwingStorage: Storage = {
			...localStorageMock,
			setItem: vi.fn(() => {
				throw new DOMException('QuotaExceededError');
			}),
		};
		vi.stubGlobal('localStorage', throwingStorage);

		const data = useStorage('test-key');
		expect(data.value).toBeNull();
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
