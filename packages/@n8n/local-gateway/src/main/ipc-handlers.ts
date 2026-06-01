import { configure, logger } from '@n8n/computer-use/logger';
import { ipcMain } from 'electron';

import type { DaemonController } from './daemon-controller';
import type { AppSettings, SettingsStore } from './settings-store';

export function registerIpcHandlers(
	controller: DaemonController,
	settingsStore: SettingsStore,
	/** Tears down the local gateway connection (Electron app). */
	disconnectGateway: () => Promise<void>,
): void {
	ipcMain.handle('settings:get', (): AppSettings => {
		logger.debug('IPC settings:get');
		return settingsStore.get();
	});

	ipcMain.handle(
		'settings:set',
		(_event, partial: Partial<AppSettings>): { ok: boolean; error?: string } => {
			logger.debug('IPC settings:set', { keys: Object.keys(partial) });
			try {
				settingsStore.set(partial);
				if (partial.logLevel !== undefined) {
					configure({ level: partial.logLevel });
					logger.info('Log level updated', { level: partial.logLevel });
				}
				// Changing tool/capability toggles does not hot-reload an active connection; disconnect and connect again if needed.
				return { ok: true };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error('IPC settings:set failed', { error: message });
				return { ok: false, error: message };
			}
		},
	);

	ipcMain.handle('daemon:status', () => {
		logger.debug('IPC daemon:status');
		return controller.getSnapshot();
	});

	ipcMain.handle('gateway:disconnect', async (): Promise<{ ok: boolean }> => {
		logger.debug('IPC gateway:disconnect');
		await disconnectGateway();
		return { ok: true };
	});
}
