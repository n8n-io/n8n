import { configure, logger } from '@n8n/computer-use/logger';
import { app } from 'electron';
import * as path from 'node:path';

import { DaemonController } from './daemon-controller';
import { registerIpcHandlers } from './ipc-handlers';
import { SettingsStore } from './settings-store';
import { openSettingsWindow, notifySettingsWindow } from './settings-window';
import { createTray } from './tray';
import type { ConnectPayload } from '../shared/types';

const DEEP_LINK_PROTOCOL = 'n8n-gateway';

function parseConnectPayload(value: string): ConnectPayload | null {
	let parsed: URL;
	try {
		parsed = new URL(value);
	} catch {
		return null;
	}

	if (parsed.protocol !== `${DEEP_LINK_PROTOCOL}:`) return null;
	if (parsed.hostname !== 'connect') return null;

	const url = parsed.searchParams.get('url') ?? '';
	const rawToken = parsed.searchParams.get('token');
	const apiKey = rawToken === null || rawToken.trim().length === 0 ? undefined : rawToken.trim();
	if (!url) return null;
	try {
		new URL(url);
	} catch {
		return null;
	}

	return { url, apiKey };
}

function parseConnectPayloadFromArgv(argv: string[]): ConnectPayload | null {
	for (const arg of argv) {
		const payload = parseConnectPayload(arg);
		if (payload) return payload;
	}
	return null;
}

// Windows: required for proper taskbar/notification grouping
if (process.platform === 'win32') {
	app.setAppUserModelId('io.n8n.gateway');
}

// ensure only one instance of the app can run at once
if (!app.requestSingleInstanceLock()) {
	app.quit();
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
		app.setAsDefaultProtocolClient(DEEP_LINK_PROTOCOL);

		const settingsStore = new SettingsStore();
		configure({ level: settingsStore.get().logLevel });
		logger.info('n8n Gateway starting');

		const controller = new DaemonController();

		const preloadPath = path.join(__dirname, 'preload.js');
		const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');

		async function connect(payload: ConnectPayload): Promise<void> {
			const config = settingsStore.toGatewayConfig();
			const inlineKey = payload.apiKey?.trim();
			const reconnectKey = settingsStore.getReconnectKey() ?? undefined;
			const effectiveKey = inlineKey && inlineKey.length > 0 ? inlineKey : reconnectKey;
			if (!effectiveKey) {
				throw new Error('No saved session key. Use a fresh token from n8n to connect.');
			}
			const result = await controller.connect(config, payload.url, effectiveKey);
			const settingsPatch = {
				instanceUrl: payload.url,
			};
			settingsStore.set(settingsPatch);
			settingsStore.setReconnectKey(result.apiKey);
		}

		async function reconnectStoredCredentials(): Promise<boolean> {
			const settings = settingsStore.get();
			const reconnectKey = settingsStore.getReconnectKey();
			if (!settings.instanceUrl || !reconnectKey) return false;
			try {
				await connect({
					url: settings.instanceUrl,
					apiKey: reconnectKey,
				});
				return true;
			} catch (error) {
				logger.warn('Initial reconnect failed', {
					error: error instanceof Error ? error.message : String(error),
				});
				return false;
			}
		}

		function scheduleFocusGatewayToken(): void {
			setTimeout(() => {
				notifySettingsWindow('focusGatewayToken');
			}, 50);
		}

		function openSettingsForTokenEntry(): void {
			openSettingsWindow(preloadPath, rendererPath);
			scheduleFocusGatewayToken();
		}

		async function disconnectGateway(): Promise<void> {
			settingsStore.setLastConnectedUrl(null);
			settingsStore.setReconnectKey(null);
			await controller.disconnect();
		}

		function handleConnectPayload(payload: ConnectPayload): void {
			logger.info('Handling deep-link connection payload', { url: payload.url });
			void connect(payload).catch((error: unknown) => {
				logger.error('Deep-link connection failed', {
					error: error instanceof Error ? error.message : String(error),
				});
				openSettingsForTokenEntry();
			});
		}

		registerIpcHandlers(controller, settingsStore, connect, disconnectGateway);

		// Propagate status changes to the settings window (if open) and persist connection URL
		controller.on('statusChanged', (snapshot) => {
			notifySettingsWindow('statusChanged', snapshot);
			if (snapshot.status === 'connected' && snapshot.connectedUrl) {
				settingsStore.setLastConnectedUrl(snapshot.connectedUrl);
			}
		});

		createTray(
			controller,
			() => openSettingsWindow(preloadPath, rendererPath),
			() => {
				const reconnectKey = settingsStore.getReconnectKey();
				if (!reconnectKey) {
					openSettingsForTokenEntry();
					return;
				}
				void reconnectStoredCredentials().then((connected) => {
					if (!connected) openSettingsForTokenEntry();
				});
			},
			() => {
				logger.info('n8n Gateway quitting');
				void controller.disconnect().then(() => {
					app.quit();
				});
			},
			() => {
				void disconnectGateway();
			},
		);

		const payloadFromArgs = parseConnectPayloadFromArgv(process.argv);
		if (payloadFromArgs) {
			handleConnectPayload(payloadFromArgs);
		} else {
			void reconnectStoredCredentials();
		}

		app.on('open-url', (event, url) => {
			event.preventDefault();
			const payload = parseConnectPayload(url);
			if (!payload) return;
			handleConnectPayload(payload);
		});

		app.on('second-instance', (_event, argv) => {
			const payload = parseConnectPayloadFromArgv(argv);
			if (!payload) return;
			handleConnectPayload(payload);
		});
	})
	.catch((error: unknown) => {
		logger.error('Failed to initialize app', { error: String(error) });
		app.quit();
	});
