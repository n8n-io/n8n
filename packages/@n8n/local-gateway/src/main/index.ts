import { configure, logger } from '@n8n/computer-use/logger';
import { app, shell } from 'electron';
import * as path from 'node:path';

import { DaemonController } from './daemon-controller';
import { registerIpcHandlers } from './ipc-handlers';
import { showMainWindow, toggleMainWindow, notifyMainWindow } from './main-window';
import { parseOAuthCallback } from './oauth/oauth-callback';
import { OAuthFlow } from './oauth/oauth-flow';
import { TokenStore } from './oauth/token-store';
import { SettingsStore } from './settings-store';
import { createTray } from './tray';
import { APP_URL_SCHEME } from '../shared/constants';

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
			logger.info('n8n Assistant starting');

			const controller = new DaemonController();
			const oauthFlow = new OAuthFlow({
				store: new TokenStore(),
				openExternal: async (url) => {
					await shell.openExternal(url);
				},
			});

			const preloadPath = path.join(__dirname, 'preload.js');
			const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');

			async function disconnectGateway(): Promise<void> {
				await controller.disconnect();
			}

			registerIpcHandlers(controller, settingsStore, disconnectGateway, oauthFlow);

			controller.on('statusChanged', (snapshot) => {
				notifyMainWindow('statusChanged', snapshot);
			});

			oauthFlow.on('authStatusChanged', (status) => {
				notifyMainWindow('authStatusChanged', status);
				// The window auto-hid on blur when the system browser opened — bring it back so the
				// user sees the result (the signed-in view, or a sign-in error).
				if (status.state === 'signedIn' || status.state === 'error') {
					showMainWindow(preloadPath, rendererPath);
				}
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
				(trayBounds) => toggleMainWindow(preloadPath, rendererPath, trayBounds),
				() => {
					logger.info('n8n Assistant quitting');
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
			);

			// Cold start: handle an OAuth redirect passed in argv (Windows/Linux deep link).
			handleOAuthDeepLinkFromArgv(process.argv);

			// The window opens only from the tray — nothing to auto-open on launch.

			// macOS — `open-url`: the OS hands the running app the `n8n://callback?...` OAuth redirect.
			// Cold starts receive it in `process.argv` instead, handled above.
			app.on('open-url', (event, url) => {
				event.preventDefault();
				handleOAuthDeepLink(url);
			});

			// Windows / Linux — `second-instance`: the lock-holding process receives the second launch's
			// `argv`, which carries the OAuth redirect deep link the OS passed to it.
			app.on('second-instance', (_event, argv) => {
				handleOAuthDeepLinkFromArgv(argv);
			});
		})
		.catch((error: unknown) => {
			logger.error('Failed to initialize app', { error: String(error) });
			app.quit();
		});
}
