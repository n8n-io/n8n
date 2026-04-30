jest.mock('node:os', () => {
	/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- jest.requireActual is untyped */
	const actual = jest.requireActual('node:os');
	return {
		...actual,
		homedir: jest.fn((): string => '/mock/home'),
	};
	/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */
});

jest.mock('electron', () => ({
	app: {
		getPath: jest.fn((name: string) => (name === 'userData' ? '/mock/userData' : `/mock/${name}`)),
	},
}));

jest.mock('@n8n/computer-use/logger', () => ({
	logger: {
		debug: jest.fn(),
		warn: jest.fn(),
	},
}));

jest.mock('electron-store');

import { app } from 'electron';
import Store from 'electron-store';
import * as path from 'node:path';

import { SettingsStore } from './settings-store';

const MockStore = Store as jest.MockedClass<typeof Store>;

describe('SettingsStore (Electron)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		MockStore.mockImplementation((opts?: { defaults?: Record<string, unknown> }) => {
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
