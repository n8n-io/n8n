import * as path from 'node:path';

import { app, dialog } from 'electron';

import { configure, logger } from '@n8n/fs-proxy/logger';

import { DaemonController } from './daemon-controller';
import { SettingsStore } from './settings-store';
import { createTray } from './tray';
import { openSettingsWindow, notifySettingsWindow } from './settings-window';
import { registerIpcHandlers } from './ipc-handlers';

// Windows: required for proper taskbar/notification grouping
if (process.platform === 'win32') {
	app.setAppUserModelId('io.n8n.gateway');
}

// Keep the process running even when all windows are closed (tray-only app).
// Returning false from the handler is not possible via the Electron API directly;
// instead we simply never quit — the tray manages app lifetime.
app.on('window-all-closed', () => {
	// Intentionally do nothing: this is a tray-only app that stays alive
	// even when all BrowserWindows are closed.
});

app
	.whenReady()
	.then(() => {
		// macOS: hide from Dock (tray-only app)
		if (process.platform === 'darwin') {
			app.dock?.hide();
		}

		const settingsStore = new SettingsStore();
		configure({ level: settingsStore.get().logLevel });
		logger.info('n8n Gateway starting');

		const controller = new DaemonController();

		const preloadPath = path.join(__dirname, 'preload.js');
		const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');

		function confirmConnect(url: string): Promise<boolean> {
			const lastUrl = settingsStore.getLastConnectedUrl();
			if (lastUrl !== null && lastUrl === url) {
				logger.info('Auto-approving connection from known URL', { url });
				return Promise.resolve(true);
			}
			const result = dialog.showMessageBoxSync({
				type: 'question',
				buttons: ['Allow', 'Reject'],
				defaultId: 0,
				cancelId: 1,
				title: 'n8n Connection Request',
				message: `Allow n8n to connect?\n\n${url}`,
				detail: 'Confirm only if you initiated this connection from n8n.',
			});
			return Promise.resolve(result === 0);
		}

		function restartDaemon(): void {
			logger.info('Restarting daemon');
			const config = settingsStore.toGatewayConfig();
			void controller
				.stop()
				.then(() => {
					controller.start(config, confirmConnect);
				})
				.catch((err: unknown) => {
					logger.error('Failed to restart daemon', { error: String(err) });
				});
		}

		registerIpcHandlers(controller, settingsStore, restartDaemon);

		// Propagate status changes to the settings window (if open) and persist connection URL
		controller.on('status-changed', (snapshot) => {
			notifySettingsWindow('status-changed', snapshot);
			if (snapshot.status === 'connected' && snapshot.connectedUrl) {
				settingsStore.setLastConnectedUrl(snapshot.connectedUrl);
			}
		});

		function onDisconnect(): void {
			settingsStore.setLastConnectedUrl(null);
			void controller.disconnectClient();
		}

		createTray(
			controller,
			() => openSettingsWindow(preloadPath, rendererPath),
			restartDaemon,
			() => {
				logger.info('n8n Gateway quitting');
				void controller.stop().then(() => {
					app.quit();
				});
			},
			onDisconnect,
		);

		// Auto-start the daemon on launch
		controller.start(settingsStore.toGatewayConfig(), confirmConnect);
	})
	.catch((error: unknown) => {
		logger.error('Failed to initialize app', { error: String(error) });
		app.quit();
	});
