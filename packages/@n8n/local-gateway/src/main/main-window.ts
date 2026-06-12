import { app, BrowserWindow, nativeTheme } from 'electron';
import * as path from 'node:path';

/** The single main window. Closing it hides it; the app lives on in the tray and Dock. */
let mainWindow: BrowserWindow | null = null;

/** Once quitting starts, `close` must destroy the window instead of hiding it. */
let isQuitting = false;
app.on('before-quit', () => {
	isQuitting = true;
});

/**
 * Apply the branded Dock icon (unpackaged dev builds default to Electron's icon).
 * macOS drops a custom icon whenever the Dock entry is hidden, so this must be
 * re-applied after every `dock.show()`.
 */
export function applyDockIcon(): void {
	app.dock?.setIcon(path.join(app.getAppPath(), 'assets', 'icon.png'));
}

/**
 * Callbacks fired when the renderer's state is wiped — the window is closed or its
 * webContents navigates (reload). Lets main-process services drop per-renderer state
 * (e.g. thread SSE connections whose refcounts live in the renderer).
 */
const resetCallbacks = new Set<() => void>();

export function onMainWindowReset(onResetCallback: () => void): void {
	resetCallbacks.add(onResetCallback);
}

function fireMainWindowReset(): void {
	for (const onResetCallback of resetCallbacks) onResetCallback();
}

/**
 * The window's opaque background, matching the app surface for the active OS theme. Set at
 * creation so there's no white flash before the renderer paints (or while it tears down).
 * Electron reads the OS theme via `nativeTheme` (default `themeSource: 'system'`), the same
 * signal the renderer's `prefers-color-scheme` follows.
 */
function surfaceColor(): string {
	// Dark matches the app header surface (App.vue `.app` → --da-bg) so there's no seam/flash.
	return nativeTheme.shouldUseDarkColors ? '#212121' : '#ffffff';
}

const WINDOW_WIDTH = 630;
const WINDOW_HEIGHT = 640;

function createMainWindow(preloadPath: string, rendererPath: string): BrowserWindow {
	const window = new BrowserWindow({
		width: WINDOW_WIDTH,
		height: WINDOW_HEIGHT,
		show: false,
		// macOS: native traffic lights overlay the renderer's own dark title strip.
		// Other platforms keep the default native frame (working window controls).
		...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const } : {}),
		backgroundColor: surfaceColor(),
		resizable: false,
		maximizable: false,
		fullscreenable: false,
		roundedCorners: true,
		title: 'n8n Assistant',
		webPreferences: {
			preload: preloadPath,
			sandbox: true,
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	// Dev mode (`pnpm dev`) serves the renderer from a Vite dev server with HMR;
	// production loads the built bundle from disk over `file://`.
	// VITE_DEV_SERVER_URL is set by vite-plugin-electron when it spawns Electron.
	const devServerUrl = process.env.VITE_DEV_SERVER_URL;
	if (devServerUrl) {
		void window.loadURL(devServerUrl);
	} else {
		void window.loadFile(rendererPath);
	}

	// Tell the renderer when the window is actually on screen, so background polling
	// can pause while it's hidden. A visible-but-unfocused window stays active —
	// the user can still see it.
	const broadcastActive = (active: boolean) => {
		if (!window.isDestroyed()) window.webContents.send('windowActiveChanged', active);
	};
	window.on('show', () => broadcastActive(true));
	window.on('focus', () => broadcastActive(true));
	// The Dock icon mirrors window visibility: the app reads as "open" only while
	// its window is up; otherwise it recedes to the menu-bar tray.
	window.on('hide', () => {
		broadcastActive(false);
		app.dock?.hide();
	});

	// Closing the window keeps the app running in the tray/Dock.
	window.on('close', (event) => {
		if (isQuitting) return;
		event.preventDefault();
		window.hide();
	});
	window.on('closed', () => {
		mainWindow = null;
		fireMainWindowReset();
	});
	// Fires on reload (and harmlessly on the initial load, before any renderer state exists).
	window.webContents.on('did-navigate', () => fireMainWindowReset());

	return window;
}

function getMainWindow(preloadPath: string, rendererPath: string): BrowserWindow {
	if (!mainWindow || mainWindow.isDestroyed()) {
		mainWindow = createMainWindow(preloadPath, rendererPath);
	}
	return mainWindow;
}

/**
 * Reveal the window, restoring the Dock entry first. The order matters: a window
 * shown while the app is still an accessory (Dock hidden) is hidden again by macOS
 * as soon as the app deactivates — the popover behaviour this app moved away from.
 */
function revealWindow(window: BrowserWindow): void {
	if (app.dock && !app.dock.isVisible()) {
		void app.dock.show().then(() => {
			applyDockIcon();
			window.show();
		});
		return;
	}
	window.show();
}

/** Show the window. A new window opens centered; a hidden one reappears where the user left it. */
export function showMainWindow(preloadPath: string, rendererPath: string): void {
	revealWindow(getMainWindow(preloadPath, rendererPath));
}

/** Toggle the window from a tray click: surface it if buried, hide if focused, otherwise show. */
export function toggleMainWindow(preloadPath: string, rendererPath: string): void {
	const window = getMainWindow(preloadPath, rendererPath);
	if (window.isVisible() && !window.isFocused()) {
		window.focus();
		return;
	}
	if (window.isVisible()) {
		window.hide();
		return;
	}
	revealWindow(window);
}

/** Whether the window is focused — actually in front of the user right now. */
export function isMainWindowFocused(): boolean {
	return mainWindow !== null && !mainWindow.isDestroyed() && mainWindow.isFocused();
}

/** Send an IPC message to the renderer, if the window exists. */
export function notifyMainWindow(channel: string, ...args: unknown[]): void {
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send(channel, ...args);
	}
}
