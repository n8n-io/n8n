import { configure, logger } from '@n8n/computer-use/logger';
import { ipcMain } from 'electron';

import type { DaemonController } from './daemon-controller';
import type { AppSettings, SettingsStore } from './settings-store';
import type { ConnectPayload } from '../shared/types';

export function registerIpcHandlers(
	controller: DaemonController,
	settingsStore: SettingsStore,
	connect: (payload: ConnectPayload) => Promise<void>,
	/** Clears persisted connection state and disconnects server-side (Electron app concern). */
	disconnectGateway: () => Promise<void>,
): void {
	ipcMain.handle('settings:get', (): AppSettings => {
		logger.debug('IPC settings:get');
		return settingsStore.get();
	});

	ipcMain.handle(
		'settings:set',
		async (_event, partial: Partial<AppSettings>): Promise<{ ok: boolean; error?: string }> => {
			logger.debug('IPC settings:set', { keys: Object.keys(partial) });
			try {
				settingsStore.set(partial);
				if (partial.logLevel !== undefined) {
					configure({ level: partial.logLevel });
					logger.info('Log level updated', { level: partial.logLevel });
				}
				const requiresReconnect = Object.keys(partial).some((key) => key !== 'logLevel');
				if (requiresReconnect && controller.isRunning()) {
					await controller.reconnect(settingsStore.toGatewayConfig());
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

	ipcMain.handle('gateway:connect', async (_event, payload: ConnectPayload) => {
		logger.debug('IPC gateway:connect', { url: payload.url });
		try {
			await connect(payload);
			return { ok: true };
		} catch (error) {
			const snapshot = controller.getSnapshot();
			const message =
				snapshot.lastError ?? (error instanceof Error ? error.message : String(error));
			logger.error('IPC gateway:connect failed', { error: message });
			return { ok: false, error: message };
		}
	});

	ipcMain.handle('gateway:disconnect', async (): Promise<{ ok: boolean }> => {
		logger.debug('IPC gateway:disconnect');
		await disconnectGateway();
		return { ok: true };
	});
}
