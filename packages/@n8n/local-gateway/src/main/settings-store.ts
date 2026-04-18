import type { GatewayConfig } from '@n8n/computer-use/config';
import { logger } from '@n8n/computer-use/logger';
import { app } from 'electron';
import Store from 'electron-store';
import * as os from 'node:os';
import * as path from 'node:path';

import type { AppSettings } from '../shared/types';

export type { AppSettings };

const DEFAULTS: AppSettings = {
	port: 7655,
	filesystemDir: os.homedir(),
	filesystemEnabled: true,
	shellEnabled: false, // disabled by default for security
	screenshotEnabled: true,
	mouseKeyboardEnabled: true,
	browserEnabled: true,
	allowedOrigins: [],
	logLevel: 'info',
};

/** Full shape of what's persisted — includes internal state not exposed as AppSettings. */
interface StoredData extends AppSettings {
	lastConnectedUrl: string | null;
}

export class SettingsStore {
	private readonly store: Store<StoredData>;

	constructor() {
		this.store = new Store<StoredData>({
			name: 'settings',
			defaults: { ...DEFAULTS, lastConnectedUrl: null },
		});
	}

	get(): AppSettings {
		return {
			port: this.store.get('port'),
			filesystemDir: this.store.get('filesystemDir'),
			filesystemEnabled: this.store.get('filesystemEnabled'),
			shellEnabled: this.store.get('shellEnabled'),
			screenshotEnabled: this.store.get('screenshotEnabled'),
			mouseKeyboardEnabled: this.store.get('mouseKeyboardEnabled'),
			browserEnabled: this.store.get('browserEnabled'),
			allowedOrigins: this.store.get('allowedOrigins'),
			logLevel: this.store.get('logLevel'),
		};
	}

	set(partial: Partial<AppSettings>): void {
		for (const [key, value] of Object.entries(partial) as Array<
			[keyof AppSettings, AppSettings[keyof AppSettings]]
		>) {
			this.store.set(key, value);
		}
		logger.debug('Settings updated', { changes: partial });
	}

	getLastConnectedUrl(): string | null {
		return this.store.get('lastConnectedUrl');
	}

	setLastConnectedUrl(url: string | null): void {
		this.store.set('lastConnectedUrl', url);
		logger.debug('Last connected URL updated', { url });
	}

	toGatewayConfig(): GatewayConfig {
		const s = this.get();
		return {
			logLevel: s.logLevel,
			port: s.port,
			allowedOrigins: s.allowedOrigins,
			filesystem: { dir: s.filesystemDir },
			computer: { shell: { timeout: 30_000 } },
			browser: {
				defaultBrowser: 'chrome',
			},
			permissions: {
				filesystemRead: s.filesystemEnabled ? 'allow' : 'deny',
				filesystemWrite: s.filesystemEnabled ? 'ask' : 'deny',
				shell: s.shellEnabled ? 'ask' : 'deny',
				computer: s.screenshotEnabled || s.mouseKeyboardEnabled ? 'ask' : 'deny',
				browser: s.browserEnabled ? 'ask' : 'deny',
			},
			permissionConfirmation: 'instance',
		};
	}

	getStorePath(): string {
		return path.join(app.getPath('userData'), 'settings.json');
	}
}
