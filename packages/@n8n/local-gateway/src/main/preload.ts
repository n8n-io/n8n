import { contextBridge, ipcRenderer } from 'electron';

import type { AppSettings, ConnectPayload, StatusSnapshot } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
	getSettings: async (): Promise<AppSettings> =>
		await (ipcRenderer.invoke('settings:get') as Promise<AppSettings>),

	setSettings: async (partial: Partial<AppSettings>): Promise<{ ok: boolean; error?: string }> =>
		await (ipcRenderer.invoke('settings:set', partial) as Promise<{ ok: boolean; error?: string }>),

	getDaemonStatus: async (): Promise<StatusSnapshot> =>
		await (ipcRenderer.invoke('daemon:status') as Promise<StatusSnapshot>),

	connectGateway: async (payload: ConnectPayload): Promise<{ ok: boolean; error?: string }> =>
		await (ipcRenderer.invoke('gateway:connect', payload) as Promise<{
			ok: boolean;
			error?: string;
		}>),

	disconnectGateway: async (): Promise<{ ok: boolean }> =>
		await (ipcRenderer.invoke('gateway:disconnect') as Promise<{ ok: boolean }>),

	onStatusChanged: (onChangeCallback: (snapshot: StatusSnapshot) => void): void => {
		ipcRenderer.on('statusChanged', (_event, snapshot: StatusSnapshot) =>
			onChangeCallback(snapshot),
		);
	},

	onFocusGatewayToken: (onFocusCallback: () => void): void => {
		ipcRenderer.on('focusGatewayToken', () => onFocusCallback());
	},
});
