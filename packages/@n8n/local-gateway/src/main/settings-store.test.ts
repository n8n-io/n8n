vi.mock('node:os', async () => {
	const actual = await vi.importActual<typeof nodeOs>('node:os');
	return {
		...actual,
		homedir: vi.fn((): string => '/mock/home'),
	};
});

vi.mock('electron', () => ({
	app: {
		getPath: vi.fn((name: string) => (name === 'userData' ? '/mock/userData' : `/mock/${name}`)),
	},
}));

vi.mock('@n8n/computer-use/logger', () => ({
	logger: {
		debug: vi.fn(),
		warn: vi.fn(),
	},
}));

// Explicit factory rather than an auto-mock: auto-mocking imports the real `electron-store`,
// which transitively loads the real `electron` runtime. The test drives the constructor via
// `MockStore.mockImplementation` below.
vi.mock('electron-store', () => ({
	default: vi.fn(),
}));

import { app } from 'electron';
import Store from 'electron-store';
import type * as nodeOs from 'node:os';
import * as path from 'node:path';
import type { MockedClass } from 'vitest';

import { SettingsStore } from './settings-store';

const MockStore = Store as MockedClass<typeof Store>;

describe('SettingsStore (Electron)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// `new Store(...)` in source: the implementation must be constructable, so use a
		// regular function rather than an arrow (Vitest does `new impl()`).
		MockStore.mockImplementation(function (opts?: { defaults?: Record<string, unknown> }) {
			const data: Record<string, unknown> = { ...(opts?.defaults ?? {}) };
			return {
				get: (key: string) => data[key],
				set: (key: string, val: unknown) => {
					data[key] = val;
				},
			} as unknown as InstanceType<typeof Store>;
		});
	});

	it('toGatewayConfig uses persisted allowedOrigins', () => {
		const store = new SettingsStore();
		store.set({
			allowedOrigins: ['https://tenant.example', 'https://*.app.n8n.cloud'],
		});
		const config = store.toGatewayConfig();
		expect(config.allowedOrigins).toEqual(['https://tenant.example', 'https://*.app.n8n.cloud']);
		expect(config.filesystem.dir).toBe('/mock/home');
	});

	it('toGatewayConfig falls back to default origins when list is empty after coercion', () => {
		const store = new SettingsStore();
		store.set({ allowedOrigins: [] });
		const config = store.toGatewayConfig();
		expect(config.allowedOrigins).toEqual(['https://*.app.n8n.cloud']);
	});

	it('maps capability toggles to gateway permissions', () => {
		const store = new SettingsStore();
		store.set({
			filesystemEnabled: false,
			shellEnabled: true,
			screenshotEnabled: false,
			mouseKeyboardEnabled: false,
			browserEnabled: false,
		});
		const config = store.toGatewayConfig();
		expect(config.permissions.filesystemRead).toBe('deny');
		expect(config.permissions.filesystemWrite).toBe('deny');
		expect(config.permissions.shell).toBe('ask');
		expect(config.permissions.computer).toBe('deny');
		expect(config.permissions.browser).toBe('deny');
	});

	it('getStorePath joins Electron userData with settings file name', () => {
		const store = new SettingsStore();
		expect(store.getStorePath()).toBe(path.join('/mock/userData', 'settings.json'));
		expect(app.getPath).toHaveBeenCalledWith('userData');
	});
});
