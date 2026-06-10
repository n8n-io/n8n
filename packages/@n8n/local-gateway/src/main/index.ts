import { configure, logger } from '@n8n/computer-use/logger';
import { app, shell } from 'electron';
import * as path from 'node:path';

import { DaemonController } from './daemon-controller';
import { InstanceApi } from './instance-api';
import { registerIpcHandlers } from './ipc-handlers';
import {
	showMainWindow,
	toggleMainWindow,
	notifyMainWindow,
	onMainWindowReset,
} from './main-window';
import { parseOAuthCallback } from './oauth/oauth-callback';
import { OAuthFlow } from './oauth/oauth-flow';
import { TokenStore } from './oauth/token-store';
import { SettingsStore } from './settings-store';
import { ThreadService } from './thread-service';
import { createTray } from './tray';
import { APP_URL_SCHEME } from '../shared/constants';
import type { AuthStatus } from '../shared/types';

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
			const openExternal = async (url: string) => {
				await shell.openExternal(url);
			};
			const oauthFlow = new OAuthFlow({
				store: new TokenStore(),
				openExternal,
			});
			const instanceApi = new InstanceApi(oauthFlow);
			const threadService = new ThreadService({
				oauthFlow,
				instanceApi,
				emit: (threadId, event) => notifyMainWindow('threadEvent', threadId, event),
			});
			// The renderer owns the listener refcounts; when it goes away (window closed,
			// reload) those are lost, so drop the SSE connections it asked for.
			onMainWindowReset(() => threadService.reset());

			const preloadPath = path.join(__dirname, 'preload.js');
			const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');

			async function disconnectGateway(): Promise<void> {
				await controller.disconnect();
			}

			/**
			 * Connect computer-use to the signed-in n8n instance. The token provider returns a valid
			 * (refreshed) OAuth access token, which the gateway client sends as `Authorization: Bearer`.
			 */
			async function connectGateway(instanceUrl: string): Promise<void> {
				const config = settingsStore.toGatewayConfig();
				await controller.connect(config, instanceUrl, async () => {
					const token = await oauthFlow.getValidAccessToken();
					if (!token) throw new Error('Not signed in to n8n');
					return token;
				});
			}

			/** Bring the gateway connection in line with the current auth state. */
			function syncGatewayConnection(status: AuthStatus): void {
				if (status.state === 'signedIn' && status.instanceUrl) {
					void connectGateway(status.instanceUrl).catch((error: unknown) => {
						logger.error('Gateway connect failed', {
							error: error instanceof Error ? error.message : String(error),
						});
					});
				} else if (status.state === 'signedOut') {
					void disconnectGateway().catch(() => {});
				}
			}

			registerIpcHandlers({
				controller,
				settingsStore,
				disconnectGateway,
				oauthFlow,
				instanceApi,
				threadService,
				openExternal,
			});

			controller.on('statusChanged', (snapshot) => {
				notifyMainWindow('statusChanged', snapshot);
			});

			oauthFlow.on('authStatusChanged', (status) => {
				notifyMainWindow('authStatusChanged', status);
				// Connect computer-use on sign-in; tear it down on sign-out.
				syncGatewayConnection(status);
				// Leaving the signed-in state invalidates thread streams and cached
				// messages — another user must never see them.
				if (status.state !== 'signedIn') threadService.reset();
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

			// Persisted session: reconnect the gateway on launch if already signed in.
			syncGatewayConnection(oauthFlow.getStatus());

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
