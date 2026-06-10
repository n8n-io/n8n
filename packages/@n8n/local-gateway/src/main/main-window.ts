import { BrowserWindow, nativeTheme, screen, type Rectangle } from 'electron';

/** The single, frameless main window. Behaves like a menubar popover anchored to the tray. */
let mainWindow: BrowserWindow | null = null;

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

const WINDOW_WIDTH = 420;
const WINDOW_HEIGHT = 640;
/** Gap between the tray icon and the window edge. */
const TRAY_GAP = 6;

function createMainWindow(preloadPath: string, rendererPath: string): BrowserWindow {
	const window = new BrowserWindow({
		width: WINDOW_WIDTH,
		height: WINDOW_HEIGHT,
		show: false,
		frame: false,
		backgroundColor: surfaceColor(),
		resizable: false,
		movable: false,
		maximizable: false,
		fullscreenable: false,
		skipTaskbar: true,
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
	// can pause while it's hidden. The renderer's own visibility/focus events are
	// unreliable for a frameless hide-on-blur window, so the main process is the
	// source of truth.
	const broadcastActive = (active: boolean) => {
		if (!window.isDestroyed()) window.webContents.send('windowActiveChanged', active);
	};
	window.on('show', () => broadcastActive(true));
	window.on('focus', () => broadcastActive(true));
	window.on('hide', () => broadcastActive(false));

	// Menubar behaviour: dismiss when the window loses focus (e.g. clicking elsewhere).
	window.on('blur', () => {
		broadcastActive(false);
		if (!window.webContents.isDevToolsOpened()) window.hide();
	});
	window.on('closed', () => {
		mainWindow = null;
	});

	return window;
}

function getMainWindow(preloadPath: string, rendererPath: string): BrowserWindow {
	if (!mainWindow || mainWindow.isDestroyed()) {
		mainWindow = createMainWindow(preloadPath, rendererPath);
	}
	return mainWindow;
}

/** Position the window centred under (macOS) or above (Win/Linux) the tray icon, clamped on-screen. */
function anchorToTray(window: BrowserWindow, trayBounds: Rectangle): void {
	const { workArea } = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
	const [width, height] = window.getSize();

	const centredX = Math.round(trayBounds.x + trayBounds.width / 2 - width / 2);
	const x = Math.max(workArea.x, Math.min(centredX, workArea.x + workArea.width - width));

	const unclampedY =
		process.platform === 'darwin'
			? Math.round(trayBounds.y + trayBounds.height + TRAY_GAP)
			: Math.round(trayBounds.y - height - TRAY_GAP);
	const y = Math.max(workArea.y, Math.min(unclampedY, workArea.y + workArea.height - height));

	window.setPosition(x, y, false);
}

/** Show the window, anchoring it to the tray when bounds are supplied. */
export function showMainWindow(
	preloadPath: string,
	rendererPath: string,
	trayBounds?: Rectangle,
): void {
	const window = getMainWindow(preloadPath, rendererPath);
	// Empty tray bounds (e.g. before the tray has laid out) → fall back to centering.
	if (trayBounds && trayBounds.width > 0) {
		anchorToTray(window, trayBounds);
	} else {
		window.center();
	}
	window.show();
}

/** Toggle the window from a tray click: hide if visible, otherwise anchor + show. */
export function toggleMainWindow(
	preloadPath: string,
	rendererPath: string,
	trayBounds: Rectangle,
): void {
	const window = getMainWindow(preloadPath, rendererPath);
	if (window.isVisible()) {
		window.hide();
		return;
	}
	anchorToTray(window, trayBounds);
	window.show();
}

/** Send an IPC message to the renderer, if the window exists. */
export function notifyMainWindow(channel: string, ...args: unknown[]): void {
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send(channel, ...args);
	}
}
