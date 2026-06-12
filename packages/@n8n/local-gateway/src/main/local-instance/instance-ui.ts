import { BrowserWindow, session } from 'electron';

import { LOCAL_INSTANCE_URL } from './local-instance-config';
import type { LocalInstanceManager } from './local-instance-manager';

/** Dedicated session so the injected auth cookie never mixes with the renderer's state. */
const UI_SESSION_PARTITION = 'local-n8n-ui';

/**
 * Open the embedded instance's web UI in an app window, pre-authenticated by
 * injecting the owner's auth cookie into the window's session — no manual login.
 */
export async function openLocalInstanceUi(manager: LocalInstanceManager): Promise<void> {
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
