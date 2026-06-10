import { configure, logger } from '@n8n/computer-use/logger';
import { ipcMain } from 'electron';

import type { DaemonController } from './daemon-controller';
import { InstanceApiError, type InstanceApi } from './instance-api';
import type { OAuthFlow } from './oauth/oauth-flow';
import type { AppSettings, SettingsStore } from './settings-store';
import type { AuthStatus, DesktopAssistantTasksResponse, RunTaskResult } from '../shared/types';

export interface IpcHandlerDeps {
	controller: DaemonController;
	settingsStore: SettingsStore;
	/** Tears down the local gateway connection (Electron app). */
	disconnectGateway: () => Promise<void>;
	oauthFlow: OAuthFlow;
	instanceApi: InstanceApi;
	/** Opens a URL in the user's default browser (e.g. shell.openExternal). */
	openExternal: (url: string) => Promise<void>;
}

export function registerIpcHandlers({
	controller,
	settingsStore,
	disconnectGateway,
	oauthFlow,
	instanceApi,
	openExternal,
}: IpcHandlerDeps): void {
	ipcMain.handle(
		'oauth:signIn',
		async (_event, instanceUrl: string): Promise<{ ok: boolean; error?: string }> => {
			logger.debug('IPC oauth:signIn', { instanceUrl });
			try {
				await oauthFlow.signIn(instanceUrl);
				return { ok: true };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return { ok: false, error: message };
			}
		},
	);

	ipcMain.handle('oauth:getStatus', (): AuthStatus => {
		logger.debug('IPC oauth:getStatus');
		return oauthFlow.getStatus();
	});

	ipcMain.handle('oauth:signOut', (): { ok: boolean } => {
		logger.debug('IPC oauth:signOut');
		oauthFlow.signOut();
		return { ok: true };
	});

	ipcMain.handle('settings:get', (): AppSettings => {
		logger.debug('IPC settings:get');
		return settingsStore.get();
	});

	ipcMain.handle(
		'settings:set',
		(_event, partial: Partial<AppSettings>): { ok: boolean; error?: string } => {
			logger.debug('IPC settings:set', { keys: Object.keys(partial) });
			try {
				settingsStore.set(partial);
				if (partial.logLevel !== undefined) {
					configure({ level: partial.logLevel });
					logger.info('Log level updated', { level: partial.logLevel });
				}
				// Changing tool/capability toggles does not hot-reload an active connection; disconnect and connect again if needed.
				return { ok: true };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error('IPC settings:set failed', { error: message });
				return { ok: false, error: message };
			}
		},
	);

	ipcMain.handle('daemon:status', () => {
		logger.debug('IPC daemon:status');
		return controller.getSnapshot();
	});

	ipcMain.handle('gateway:disconnect', async (): Promise<{ ok: boolean }> => {
		logger.debug('IPC gateway:disconnect');
		await disconnectGateway();
		return { ok: true };
	});

	ipcMain.handle('tasks:list', async (): Promise<DesktopAssistantTasksResponse> => {
		logger.debug('IPC tasks:list');
		return await instanceApi.getTasks();
	});

	ipcMain.handle('tasks:run', async (_event, workflowId: string): Promise<RunTaskResult> => {
		logger.debug('IPC tasks:run', { workflowId });
		try {
			const { executionId } = await instanceApi.runWorkflow(workflowId);
			return { ok: true, executionId };
		} catch (error) {
			const message =
				error instanceof InstanceApiError || error instanceof Error ? error.message : String(error);
			logger.error('IPC tasks:run failed', { workflowId, error: message });
			return { ok: false, error: message };
		}
	});

	ipcMain.handle('tasks:openWorkflow', async (_event, workflowId: string): Promise<void> => {
		logger.debug('IPC tasks:openWorkflow', { workflowId });
		const url = instanceApi.workflowUrl(workflowId);
		if (url) await openExternal(url);
	});
}
