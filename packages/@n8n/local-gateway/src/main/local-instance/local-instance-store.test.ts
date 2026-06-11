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

import { LocalInstanceStore } from './local-instance-store';

const MockStore = Store as MockedClass<typeof Store>;

describe('LocalInstanceStore', () => {
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

	it('round-trips credentials', () => {
		const store = new LocalInstanceStore();
		expect(store.getCredentials()).toBeNull();

		store.setCredentials({ email: 'owner@n8n.local', password: 'A1secret-password' });
		expect(store.getCredentials()).toEqual({
			email: 'owner@n8n.local',
			password: 'A1secret-password',
		});
	});

	it('defaults to disabled and persists the enabled flag', () => {
		const store = new LocalInstanceStore();
		expect(store.isEnabled()).toBe(false);

		store.setEnabled(true);
		expect(store.isEnabled()).toBe(true);
	});

	it('keeps credentials when local mode is disabled', () => {
		const store = new LocalInstanceStore();
		store.setCredentials({ email: 'owner@n8n.local', password: 'A1secret-password' });
		store.setEnabled(true);

		store.setEnabled(false);

		expect(store.isEnabled()).toBe(false);
		expect(store.getCredentials()).not.toBeNull();
	});
});
