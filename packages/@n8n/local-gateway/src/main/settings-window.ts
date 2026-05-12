import { BrowserWindow } from 'electron';

let settingsWindow: BrowserWindow | null = null;

export function openSettingsWindow(preloadPath: string, rendererPath: string): void {
	if (settingsWindow && !settingsWindow.isDestroyed()) {
		settingsWindow.focus();
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

	void settingsWindow.loadFile(rendererPath);

	settingsWindow.on('closed', () => {
		settingsWindow = null;
	});
}

export function notifySettingsWindow(channel: string, ...args: unknown[]): void {
	if (settingsWindow && !settingsWindow.isDestroyed()) {
		settingsWindow.webContents.send(channel, ...args);
	}
}
