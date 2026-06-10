import { configure, logger } from '@n8n/computer-use/logger';
import { ipcMain } from 'electron';

import type { ContextDetector } from './context-detector';
import type { DaemonController } from './daemon-controller';
import { InstanceApiError, type InstanceApi } from './instance-api';
import type { OAuthFlow } from './oauth/oauth-flow';
import type { AppSettings, SettingsStore } from './settings-store';
import type { ThreadService } from './thread-service';
import type {
	AuthStatus,
	DesktopAssistantHistoryParams,
	DesktopAssistantHistoryResponse,
	DesktopAssistantTaskRequest,
	DesktopAssistantTaskResponse,
	DesktopAssistantTasksResponse,
	DesktopAssistantTimeSaved,
	DetectedContext,
	InstanceAiRichMessagesResponse,
	RunTaskResult,
	ScreenshotAttachment,
} from '../shared/types';

export interface IpcHandlerDeps {
	controller: DaemonController;
	settingsStore: SettingsStore;
	/** Tears down the local gateway connection (Electron app). */
	disconnectGateway: () => Promise<void>;
	oauthFlow: OAuthFlow;
	instanceApi: InstanceApi;
	threadService: ThreadService;
	contextDetector: ContextDetector;
	/** Opens a URL in the user's default browser (e.g. shell.openExternal). */
	openExternal: (url: string) => Promise<void>;
}

/**
 * A log-safe view of a task request: the full structured context the desktop
 * detected, but with attachments reduced to `{ fileName, mimeType, bytes }` so a
 * multi-MB base64 screenshot never lands in the logs. Handy for inspecting what
 * "Looking at …" actually forwarded while the UI flow is still stubbed.
 */
function summarizeTaskRequest(body: DesktopAssistantTaskRequest): Record<string, unknown> {
	const context = body.context;
	return {
		prompt: body.prompt,
		context: context && {
			kind: context.kind,
			app: context.app,
			windowTitle: context.windowTitle,
			url: context.url,
			path: context.path,
			selectedTextChars: context.selectedText?.length,
			attachments: context.attachments?.map((attachment) => ({
				fileName: attachment.fileName,
				mimeType: attachment.mimeType,
				// base64 inflates ~4/3; this is the approximate decoded size.
				bytes: Math.round((attachment.data.length * 3) / 4),
			})),
		},
	};
}

export function registerIpcHandlers({
	controller,
	settingsStore,
	disconnectGateway,
	oauthFlow,
	instanceApi,
	threadService,
	contextDetector,
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

	ipcMain.handle(
		'history:list',
		async (
			_event,
			params?: DesktopAssistantHistoryParams,
		): Promise<DesktopAssistantHistoryResponse> => {
			logger.debug('IPC history:list', { ...params });
			return await instanceApi.getHistory(params);
		},
	);

	ipcMain.handle(
		'history:openExecution',
		async (_event, workflowId: string, executionId: string): Promise<void> => {
			logger.debug('IPC history:openExecution', { workflowId, executionId });
			const url = instanceApi.executionUrl(workflowId, executionId);
			if (url) await openExternal(url);
		},
	);

	ipcMain.handle('insights:timeSaved', async (): Promise<DesktopAssistantTimeSaved> => {
		logger.debug('IPC insights:timeSaved');
		return await instanceApi.getTimeSaved();
	});

	ipcMain.handle(
		'thread:get',
		async (
			_event,
			threadId: string,
			options?: { refresh?: boolean },
		): Promise<InstanceAiRichMessagesResponse> => {
			logger.debug('IPC thread:get', { threadId, ...options });
			return await threadService.getMessages(threadId, options);
		},
	);

	ipcMain.handle('thread:listen', (_event, threadId: string, lastEventId?: number): void => {
		logger.debug('IPC thread:listen', { threadId, lastEventId });
		threadService.listen(threadId, lastEventId);
	});

	ipcMain.handle('thread:unlisten', (_event, threadId: string): void => {
		logger.debug('IPC thread:unlisten', { threadId });
		threadService.unlisten(threadId);
	});

	ipcMain.handle('context:get', (): DetectedContext => {
		const context = contextDetector.getCurrent();
		logger.debug('IPC context:get', { context });
		return context;
	});

	ipcMain.handle('context:captureScreenshot', async (): Promise<ScreenshotAttachment> => {
		logger.debug('IPC context:captureScreenshot');
		return await contextDetector.captureScreenshot();
	});

	ipcMain.handle(
		'tasks:trigger',
		async (_event, body: DesktopAssistantTaskRequest): Promise<DesktopAssistantTaskResponse> => {
			// `info` so it shows without enabling debug, and a summary rather than the
			// raw body — screenshot attachments are multi-MB base64 we never want in logs.
			logger.info('Triggering one-shot task', summarizeTaskRequest(body));
			return await instanceApi.triggerTask(body);
		},
	);
}
