vi.mock('electron', () => ({
	safeStorage: {
		isEncryptionAvailable: vi.fn((): boolean => false),
	},
}));

// Explicit factory rather than an auto-mock: auto-mocking imports the real `electron-store`,
// which transitively loads the real `electron` runtime.
vi.mock('electron-store', () => ({
	default: vi.fn(),
}));

import Store from 'electron-store';
import type { MockedClass } from 'vitest';

import { TokenStore } from './token-store';

const MockStore = Store as MockedClass<typeof Store>;

describe('TokenStore', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// `new Store(...)` in source: the implementation must be constructable, so use a
		// regular function rather than an arrow (Vitest does `new impl()`).
		MockStore.mockImplementation(function () {
			const data: Record<string, unknown> = {};
			return {
				get: (key: string) => data[key],
				set: (key: string, val: unknown) => {
					data[key] = val;
				},
				delete: (key: string) => {
					delete data[key];
				},
			} as unknown as InstanceType<typeof Store>;
		});
	});

	it('round-trips lastInstanceUrl', () => {
		const store = new TokenStore();
		expect(store.getLastInstanceUrl()).toBeNull();

		store.setLastInstanceUrl('https://workspace.app.n8n.cloud');
		expect(store.getLastInstanceUrl()).toBe('https://workspace.app.n8n.cloud');
	});

	it('keeps lastInstanceUrl when the session is cleared', () => {
		const store = new TokenStore();
		store.setSession({ instanceUrl: 'https://workspace.app.n8n.cloud', accessToken: 'token' });
		store.setLastInstanceUrl('https://workspace.app.n8n.cloud');

		store.clearSession();

		expect(store.getSession()).toBeNull();
		expect(store.getLastInstanceUrl()).toBe('https://workspace.app.n8n.cloud');
	});
});
