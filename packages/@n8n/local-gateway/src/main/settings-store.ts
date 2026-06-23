import type { GatewayConfig } from '@n8n/computer-use/config';
import { logger } from '@n8n/computer-use/logger';
import { app } from 'electron';
import Store from 'electron-store';
import * as os from 'node:os';
import * as path from 'node:path';

import type { AppSettings } from '../shared/types';

export type { AppSettings };

const DEFAULTS: AppSettings = {
	allowedOrigins: ['https://*.app.n8n.cloud'],
	filesystemDir: os.homedir(),
	filesystemEnabled: true,
	shellEnabled: false, // disabled by default for security
	screenshotEnabled: true,
	mouseKeyboardEnabled: true,
	browserEnabled: true,
	logLevel: 'info',
};

export class SettingsStore {
	private readonly store: Store<AppSettings>;

	constructor() {
		this.store = new Store<AppSettings>({
			name: 'settings',
			defaults: DEFAULTS,
		});
	}

	get(): AppSettings {
		return {
			allowedOrigins: this.store.get('allowedOrigins'),
			filesystemDir: this.store.get('filesystemDir'),
			filesystemEnabled: this.store.get('filesystemEnabled'),
			shellEnabled: this.store.get('shellEnabled'),
			screenshotEnabled: this.store.get('screenshotEnabled'),
			mouseKeyboardEnabled: this.store.get('mouseKeyboardEnabled'),
			browserEnabled: this.store.get('browserEnabled'),
			logLevel: this.store.get('logLevel'),
		};
	}

	set(partial: Partial<AppSettings>): void {
		for (const [key, value] of Object.entries(partial) as Array<
			[keyof AppSettings, AppSettings[keyof AppSettings]]
		>) {
			if (value !== undefined) {
				this.store.set(key, value);
			}
		}
		logger.debug('Settings updated', { changes: partial });
	}

	toGatewayConfig(preset?: AppSettings): GatewayConfig {
		const s = preset ?? this.get();
		const origins =
			Array.isArray(s.allowedOrigins) && s.allowedOrigins.length > 0
				? s.allowedOrigins
				: DEFAULTS.allowedOrigins;
		return {
			logLevel: s.logLevel,
			allowedOrigins: origins,
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
