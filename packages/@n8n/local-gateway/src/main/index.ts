import { configure, logger } from '@n8n/computer-use/logger';
import { app, shell } from 'electron';
import * as path from 'node:path';

import { assertConnectOriginAllowed } from './connect-origin';
import {
	deepLinkProtocolsInArgv,
	parseConnectPayload,
	parseConnectPayloadFromArgv,
} from './connect-payload';
import { DaemonController } from './daemon-controller';
import { registerIpcHandlers } from './ipc-handlers';
import { parseOAuthCallback } from './oauth/oauth-callback';
import { OAuthFlow } from './oauth/oauth-flow';
import { TokenStore } from './oauth/token-store';
import { SettingsStore } from './settings-store';
import { openSettingsWindow, notifySettingsWindow } from './settings-window';
import { createTray } from './tray';
import { APP_URL_SCHEME } from '../shared/constants';
import type { ConnectPayload } from '../shared/types';

// Windows: required for proper taskbar/notification grouping
if (process.platform === 'win32') {
	app.setAppUserModelId('io.n8n.gateway');
}

if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	app.on('window-all-closed', () => {
		// Intentionally do nothing: this is a tray-only app that stays alive
		// even when all BrowserWindows are closed.
	});

	app
		.whenReady()
		.then(() => {
			if (process.platform === 'darwin') {
				app.dock?.hide();
			}

			// Register our custom scheme so the OS routes `<scheme>://…` deep links (OAuth redirect) here.
			app.setAsDefaultProtocolClient(APP_URL_SCHEME);

			const settingsStore = new SettingsStore();
			configure({ level: settingsStore.get().logLevel });
			logger.info('n8n Gateway starting');

			const controller = new DaemonController();
			const oauthFlow = new OAuthFlow({
				store: new TokenStore(),
				openExternal: async (url) => {
					await shell.openExternal(url);
				},
			});

			const preloadPath = path.join(__dirname, 'preload.js');
			const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');

			async function connect(payload: ConnectPayload): Promise<void> {
				const settings = settingsStore.get();
				assertConnectOriginAllowed(payload.url, settings.allowedOrigins);
				const config = settingsStore.toGatewayConfig(settings);
				const token = payload.apiKey?.trim();
				if (!token || token.length === 0) {
					throw new Error(
						'Missing gateway token in deeplink. Connect from n8n using the computer-use link.',
					);
				}
				await controller.connect(config, payload.url, token);
			}

			async function disconnectGateway(): Promise<void> {
				await controller.disconnect();
			}

			function handleConnectPayload(payload: ConnectPayload): void {
				logger.info('Handling deep-link connection payload', { url: payload.url });
				void connect(payload).catch((error: unknown) => {
					logger.error('Deep-link connection failed', {
						error: error instanceof Error ? error.message : String(error),
					});
					openSettingsWindow(preloadPath, rendererPath);
				});
			}

			registerIpcHandlers(controller, settingsStore, disconnectGateway, oauthFlow);

			controller.on('statusChanged', (snapshot) => {
				notifySettingsWindow('statusChanged', snapshot);
			});

			oauthFlow.on('authStatusChanged', (status) => {
				notifySettingsWindow('authStatusChanged', status);
			});

			/** Route an OAuth redirect deep link to the flow. Returns true if it was one. */
			function handleOAuthDeepLink(url: string): boolean {
				const oauthCallback = parseOAuthCallback(url);
				if (!oauthCallback) return false;
				logger.info('Handling OAuth callback deep link');
				void oauthFlow.handleCallback(oauthCallback);
				return true;
			}

			function handleOAuthDeepLinkFromArgv(argv: string[]): boolean {
				return argv.some((arg) => handleOAuthDeepLink(arg));
			}

			createTray(
				controller,
				() => openSettingsWindow(preloadPath, rendererPath),
				() => {
					logger.info('n8n Gateway quitting');
					void controller
						.disconnect()
						.catch((error: unknown) => {
							logger.error('Disconnect failed during quit', {
								error: error instanceof Error ? error.message : String(error),
							});
						})
						.finally(() => {
							app.quit();
						});
				},
				() => {
					void disconnectGateway();
				},
			);

			if (!handleOAuthDeepLinkFromArgv(process.argv)) {
				const payloadFromArgs = parseConnectPayloadFromArgv(process.argv);
				if (payloadFromArgs) {
					handleConnectPayload(payloadFromArgs);
				} else if (deepLinkProtocolsInArgv(process.argv)) {
					logger.warn(
						'Deep link present in argv but payload invalid (e.g. missing token); skipping startup connect',
					);
				}
			}

			// macOS — `open-url`: Fires when the OS hands the app a `n8n://…` URL (browser, another app,
			// or “Open” from Finder). Runs for a process that is already running and also after launch when the app
			// was opened via the protocol; cold starts may still receive the URL in `process.argv` — we parse that
			// above so both paths are covered.
			app.on('open-url', (event, url) => {
				event.preventDefault();
				if (handleOAuthDeepLink(url)) return;
				const payload = parseConnectPayload(url);
				if (!payload) return;
				handleConnectPayload(payload);
			});

			// Windows / Linux — `second-instance`: Fires on the **first** (lock-holding) process when the user starts
			// the app again while it is already running. The second process exits immediately (`requestSingleInstanceLock`
			// failed); this event receives that second process’s `argv`, which often includes the deeplink the OS
			// passed to the new launch, so we connect from here instead of argv-only startup parsing.
			app.on('second-instance', (_event, argv) => {
				if (handleOAuthDeepLinkFromArgv(argv)) return;
				const payload = parseConnectPayloadFromArgv(argv);
				if (!payload) return;
				handleConnectPayload(payload);
			});
		})
		.catch((error: unknown) => {
			logger.error('Failed to initialize app', { error: String(error) });
			app.quit();
		});
}
