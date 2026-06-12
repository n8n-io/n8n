import { BrowserWindow, session } from 'electron';

import { LOCAL_INSTANCE_URL } from './local-instance-config';
import type { LocalInstanceManager } from './local-instance-manager';

/** Dedicated session so the injected auth cookie never mixes with the renderer's state. */
const UI_SESSION_PARTITION = 'local-n8n-ui';

export interface OpenInstanceUiDeps {
	/** The signed-in instance URL (from the OAuth flow), or null when signed out. */
	instanceUrl: string | null;
	/** Present only in the local build variant; used to mint the embedded-instance cookie. */
	localManager: LocalInstanceManager | null;
	/** Opens a URL in the user's default browser (e.g. shell.openExternal). */
	openExternal: (url: string) => Promise<void>;
}

/**
 * Open the connected instance's web UI. The embedded local instance opens in an
 * in-app webview, pre-authenticated by injecting the owner's auth cookie (no manual
 * login). A remote instance opens in the user's browser, where they keep their own
 * session — we never hold its credentials to inject.
 */
export async function openInstanceUi(deps: OpenInstanceUiDeps): Promise<void> {
	const { instanceUrl, localManager, openExternal } = deps;
	if (!instanceUrl) throw new Error('Not signed in to an n8n instance');

	if (instanceUrl === LOCAL_INSTANCE_URL && localManager) {
		await openLocalWebview(localManager);
		return;
	}

	await openExternal(instanceUrl);
}

/** In-app window onto the embedded instance, authenticated via an injected cookie. */
async function openLocalWebview(manager: LocalInstanceManager): Promise<void> {
	const cookiePair = await manager.getUiAuthCookie();
	const separatorIndex = cookiePair.indexOf('=');
	if (separatorIndex <= 0) {
		throw new Error('Malformed auth cookie');
	}

	const uiSession = session.fromPartition(UI_SESSION_PARTITION);
	await uiSession.cookies.set({
		url: LOCAL_INSTANCE_URL,
		name: cookiePair.slice(0, separatorIndex),
		value: cookiePair.slice(separatorIndex + 1),
		httpOnly: true,
		sameSite: 'lax',
	});

	const window = new BrowserWindow({
		width: 1280,
		height: 860,
		title: 'n8n (local)',
		webPreferences: { partition: UI_SESSION_PARTITION },
	});
	await window.loadURL(LOCAL_INSTANCE_URL);
}
