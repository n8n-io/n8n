import { contextBridge, ipcRenderer } from 'electron';

import type { AppSettings, AuthStatus, StatusSnapshot } from '../shared/types';

const electronApi = {
	signIn: async (instanceUrl: string): Promise<{ ok: boolean; error?: string }> =>
		await (ipcRenderer.invoke('oauth:signIn', instanceUrl) as Promise<{
			ok: boolean;
			error?: string;
		}>),

	getAuthStatus: async (): Promise<AuthStatus> =>
		await (ipcRenderer.invoke('oauth:getStatus') as Promise<AuthStatus>),

	signOut: async (): Promise<{ ok: boolean }> =>
		await (ipcRenderer.invoke('oauth:signOut') as Promise<{ ok: boolean }>),

	onAuthStatusChanged: (onChangeCallback: (status: AuthStatus) => void): void => {
		ipcRenderer.on('authStatusChanged', (_event, status: AuthStatus) => onChangeCallback(status));
	},

	getSettings: async (): Promise<AppSettings> =>
		await (ipcRenderer.invoke('settings:get') as Promise<AppSettings>),

	setSettings: async (partial: Partial<AppSettings>): Promise<{ ok: boolean; error?: string }> =>
		await (ipcRenderer.invoke('settings:set', partial) as Promise<{ ok: boolean; error?: string }>),

	getDaemonStatus: async (): Promise<StatusSnapshot> =>
		await (ipcRenderer.invoke('daemon:status') as Promise<StatusSnapshot>),

	disconnectGateway: async (): Promise<{ ok: boolean }> =>
		await (ipcRenderer.invoke('gateway:disconnect') as Promise<{ ok: boolean }>),

	onStatusChanged: (onChangeCallback: (snapshot: StatusSnapshot) => void): void => {
		ipcRenderer.on('statusChanged', (_event, snapshot: StatusSnapshot) =>
			onChangeCallback(snapshot),
		);
	},
};

contextBridge.exposeInMainWorld('electronAPI', electronApi);

declare global {
	interface Window {
		/** Bridge exposed by this preload — typed from `electronApi`, never hand-maintained. */
		electronAPI: typeof electronApi;
	}
}
