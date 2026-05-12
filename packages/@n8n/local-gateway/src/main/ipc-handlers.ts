import { configure, logger } from '@n8n/computer-use/logger';
import { ipcMain } from 'electron';

import type { DaemonController } from './daemon-controller';
import type { AppSettings, SettingsStore } from './settings-store';

export function registerIpcHandlers(
	controller: DaemonController,
	settingsStore: SettingsStore,
	restartDaemon: () => void,
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
				const requiresRestart = Object.keys(partial).some((k) => k !== 'logLevel');
				if (requiresRestart) {
					restartDaemon();
				}
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

	ipcMain.handle('daemon:start', (): { ok: boolean } => {
		logger.debug('IPC daemon:start');
		restartDaemon();
		return { ok: true };
	});

	ipcMain.handle('daemon:stop', async (): Promise<{ ok: boolean }> => {
		logger.debug('IPC daemon:stop');
		await controller.stop();
		return { ok: true };
	});
}
