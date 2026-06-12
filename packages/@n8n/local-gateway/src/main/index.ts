import { configure, logger } from '@n8n/computer-use/logger';
import { app, shell } from 'electron';
import * as path from 'node:path';

import { ContextDetector } from './context-detector';
import { DaemonController } from './daemon-controller';
import { InstanceApi } from './instance-api';
import { registerIpcHandlers } from './ipc-handlers';
import { openInstanceUi } from './local-instance/instance-ui';
import { LocalInstanceManager } from './local-instance/local-instance-manager';
import { LocalInstanceProcess } from './local-instance/local-instance-process';
import { LocalInstanceStore } from './local-instance/local-instance-store';
import { requestMacPermissions } from './mac-permissions';
import {
	showMainWindow,
	toggleMainWindow,
	notifyMainWindow,
	onMainWindowReset,
	isMainWindowVisible,
} from './main-window';
import { createPromptNotifier } from './notifications';
import { parseOAuthCallback } from './oauth/oauth-callback';
import { OAuthFlow } from './oauth/oauth-flow';
import { TokenStore } from './oauth/token-store';
import { PermissionBroker } from './permission-broker';
import { SettingsStore } from './settings-store';
import { ThreadService } from './thread-service';
import { createTray } from './tray';
import { APP_URL_SCHEME } from '../shared/constants';
import { LOCAL_N8N_ENABLED } from '../shared/features';
import type { AuthStatus } from '../shared/types';

// The local build is a distinct app: a different name gives it its own userData
// directory (settings, OAuth session, stores) and its own single-instance lock,
// so it never shares auth/settings with the regular build and the two can run
// side by side. Must run before the lock and before any store is created.
// Packaged builds already differ by electron-builder `productName`; only the
// unpackaged dev run (shared package name) needs the suffix here.
if (LOCAL_N8N_ENABLED && !app.isPackaged) {
	app.setName(`${app.getName()}-local`);
}

// Windows: required for proper taskbar/notification grouping
if (process.platform === 'win32') {
	app.setAppUserModelId(LOCAL_N8N_ENABLED ? 'io.n8n.gateway.local' : 'io.n8n.gateway');
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

			const preloadPath = path.join(__dirname, 'preload.js');
			const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');

			const promptNotifier = createPromptNotifier({
				isWindowVisible: isMainWindowVisible,
				showWindow: () => showMainWindow(preloadPath, rendererPath),
			});
			const permissionBroker = new PermissionBroker({
				pushRequested: (prompt) => notifyMainWindow('permissionPromptRequested', prompt),
				pushWithdrawn: (id) => notifyMainWindow('permissionPromptWithdrawn', id),
				onPrompt: (prompt) => promptNotifier.notifyLocalPrompt(prompt),
			});

			const controller = new DaemonController({
				confirmResourceAccess: async (resource) => await permissionBroker.request(resource),
			});
			// The gateway connection going away orphans any pending resource-access
			// prompts (their tool calls are gone) — deny and withdraw them.
			controller.on('statusChanged', (snapshot) => {
				if (snapshot.status !== 'connected') permissionBroker.clear();
			});
			const openExternal = async (url: string) => {
				await shell.openExternal(url);
			};
			const oauthFlow = new OAuthFlow({
				store: new TokenStore(),
				openExternal,
			});
			const instanceApi = new InstanceApi(oauthFlow);
			// Embedded local instance only exists in the local build variant
			// (BUNDLE_LOCAL_N8N); the remote-only build compiles it out entirely.
			const localInstanceManager = LOCAL_N8N_ENABLED
				? new LocalInstanceManager({
						instanceProcess: new LocalInstanceProcess(),
						store: new LocalInstanceStore(),
						oauthFlow,
						userDataDir: app.getPath('userData'),
					})
				: null;
			localInstanceManager?.on('statusChanged', (status) => {
				notifyMainWindow('localInstanceStatusChanged', status);
			});
			const threadService = new ThreadService({
				oauthFlow,
				instanceApi,
				emit: (threadId, event) => {
					notifyMainWindow('threadEvent', threadId, event);
					if (event.type === 'confirmation-request') {
						promptNotifier.notifyConfirmationRequest(event.payload);
					}
				},
			});
			// The renderer owns the listener refcounts; when it goes away (window closed,
			// reload) those are lost, so drop the SSE connections it asked for.
			onMainWindowReset(() => threadService.reset());

			const contextDetector = new ContextDetector();
			// Push freshly-detected context to the renderer so the composer's
			// "Looking at …" pill updates the moment the window opens.
			contextDetector.on('contextChanged', (context) => {
				notifyMainWindow('contextChanged', context);
			});

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
				contextDetector,
				localInstanceManager,
				permissionBroker,
				// Settings changes re-apply seamlessly: connect() replaces any current
				// connection, authenticated with a fresh OAuth token.
				reconnectGateway: () => syncGatewayConnection(oauthFlow.getStatus()),
				openExternal,
			});

			controller.on('statusChanged', (snapshot) => {
				notifyMainWindow('statusChanged', snapshot);
			});

			oauthFlow.on('authStatusChanged', (status) => {
				notifyMainWindow('authStatusChanged', status);
				// Connect computer-use on sign-in; tear it down on sign-out.
				syncGatewayConnection(status);
				// Signing out of the embedded instance also leaves local mode: stop the
				// child and don't auto-start it on the next launch.
				if (status.state === 'signedOut' && localInstanceManager?.isEnabled()) {
					void localInstanceManager.disable().catch(() => {});
				}
				// Leaving the signed-in state invalidates thread streams and cached
				// messages — another user must never see them.
				if (status.state !== 'signedIn') threadService.reset();
				// Ask for the macOS context-detection permissions upfront, once signed in.
				if (status.state === 'signedIn') {
					void requestMacPermissions();
				}
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
				(trayBounds) => {
					// Detect what the user is looking at *before* showing our window —
					// once it shows, it becomes the frontmost app. Detection must finish
					// before the show: get-windows is async, so a fire-and-forget call
					// would race the synchronous show and detect our own window instead.
					// Clicking a macOS menu-bar icon doesn't change the frontmost app, so
					// by the time this resolves the user's real previous app is still up.
					void (async () => {
						await contextDetector.refresh().catch(() => {});
						toggleMainWindow(preloadPath, rendererPath, trayBounds);
					})();
				},
				() => {
					logger.info('n8n Assistant quitting');
					void Promise.allSettled([
						controller.disconnect(),
						localInstanceManager?.stop() ?? Promise.resolve(),
					]).then((results) => {
						for (const result of results) {
							if (result.status === 'rejected') {
								logger.error('Cleanup failed during quit', {
									error: String(result.reason),
								});
							}
						}
						app.quit();
					});
				},
				// Open the connected instance's UI: an in-app webview for the local
				// instance, the browser for a remote one. Shown whenever signed in.
				() =>
					oauthFlow.getStatus().state === 'signedIn'
						? [
								{
									label: 'Open n8n',
									click: () => {
										void openInstanceUi({
											instanceUrl: oauthFlow.getStatus().instanceUrl,
											localManager: localInstanceManager,
											openExternal,
										}).catch((error: unknown) => {
											logger.error('Failed to open n8n UI', {
												error: error instanceof Error ? error.message : String(error),
											});
										});
									},
								},
								{ type: 'separator' as const },
							]
						: [],
			);

			// Cold start: handle an OAuth redirect passed in argv (Windows/Linux deep link).
			handleOAuthDeepLinkFromArgv(process.argv);

			// Persisted local mode: bring the embedded instance up first, then connect the
			// gateway — its token refresh needs the instance to be listening. Otherwise,
			// reconnect immediately if a (remote) session is already signed in.
			if (localInstanceManager?.isEnabled()) {
				void localInstanceManager.ensureRunningAndSignedIn().then(() => {
					syncGatewayConnection(oauthFlow.getStatus());
				});
			} else {
				syncGatewayConnection(oauthFlow.getStatus());
			}

			// The window opens only from the tray — nothing to auto-open on launch.

			// Safety net for quits that bypass the tray (e.g. logout, updater): never orphan the child.
			app.on('before-quit', () => {
				void localInstanceManager?.stop().catch(() => {});
			});

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
