import { contextBridge, ipcRenderer } from 'electron';

import type { AppSettings } from './settings-store';
import type { StatusSnapshot } from './daemon-controller';

contextBridge.exposeInMainWorld('electronAPI', {
	getSettings: (): Promise<AppSettings> =>
		ipcRenderer.invoke('settings:get') as Promise<AppSettings>,

	setSettings: (partial: Partial<AppSettings>): Promise<{ ok: boolean; error?: string }> =>
		ipcRenderer.invoke('settings:set', partial) as Promise<{ ok: boolean; error?: string }>,

	getDaemonStatus: (): Promise<StatusSnapshot> =>
		ipcRenderer.invoke('daemon:status') as Promise<StatusSnapshot>,

	startDaemon: (): Promise<{ ok: boolean }> =>
		ipcRenderer.invoke('daemon:start') as Promise<{ ok: boolean }>,

	stopDaemon: (): Promise<{ ok: boolean }> =>
		ipcRenderer.invoke('daemon:stop') as Promise<{ ok: boolean }>,

	onStatusChanged: (callback: (snapshot: StatusSnapshot) => void): void => {
		ipcRenderer.on('status-changed', (_event, snapshot: StatusSnapshot) => callback(snapshot));
	},
});
