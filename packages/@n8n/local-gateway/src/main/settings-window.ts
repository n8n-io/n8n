import { app, BrowserWindow } from 'electron';

let settingsWindow: BrowserWindow | null = null;

function revealSettingsWindow(windowRef: BrowserWindow): void {
	if (windowRef.isMinimized()) {
		windowRef.restore();
	}
	windowRef.show();
	app.focus({ steal: true });
	windowRef.focus();
}

export function openSettingsWindow(preloadPath: string, rendererPath: string): void {
	if (settingsWindow && !settingsWindow.isDestroyed()) {
		revealSettingsWindow(settingsWindow);
		return;
	}

	settingsWindow = new BrowserWindow({
		width: 520,
		height: 580,
		resizable: false,
		minimizable: false,
		maximizable: false,
		titleBarStyle: 'default',
		title: 'n8n Gateway Settings',
		webPreferences: {
			preload: preloadPath,
			sandbox: true,
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	void settingsWindow.loadFile(rendererPath).then(() => {
		if (settingsWindow && !settingsWindow.isDestroyed()) {
			revealSettingsWindow(settingsWindow);
		}
	});

	settingsWindow.on('closed', () => {
		settingsWindow = null;
	});
}

export function notifySettingsWindow(channel: string, ...args: unknown[]): void {
	if (settingsWindow && !settingsWindow.isDestroyed()) {
		settingsWindow.webContents.send(channel, ...args);
	}
}
