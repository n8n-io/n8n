import { InstanceAiConfirmRequestDto } from '@n8n/api-types';
import { configure, logger } from '@n8n/computer-use/logger';
import { RESOURCE_DECISION_KEYS, type ResourceDecision } from '@n8n/computer-use/tools/types';
import { ipcMain } from 'electron';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { ContextDetector } from './context-detector';
import type { DaemonController } from './daemon-controller';
import { InstanceApiError, type InstanceApi } from './instance-api';
import { getMacPermissionStatus, openMacPermissionSettings } from './mac-permissions';
import type { PromptNotifier } from './notifications';
import type { OAuthFlow } from './oauth/oauth-flow';
import type { PermissionBroker } from './permission-broker';
import type { AppSettings, SettingsStore } from './settings-store';
import type { ThreadService } from './thread-service';
import type {
	AuthStatus,
	ConfirmThreadResult,
	CreateAssistantTaskResult,
	CreateChatThreadResult,
	DesktopAssistantApplyEditsRequest,
	DesktopAssistantApplyEditsResponse,
	DesktopAssistantHistoryParams,
	DesktopAssistantHistoryResponse,
	DesktopAssistantRecommendationsRequest,
	DesktopAssistantRecommendationsResponse,
	DesktopAssistantTaskDetailResponse,
	DesktopAssistantTaskRequest,
	DesktopAssistantTasksResponse,
	DesktopAssistantTimeSaved,
	DetectedContext,
	InstanceAiRichMessagesResponse,
	LocalPermissionPromptRequest,
	MacPermissionKind,
	MacPermissionStatus,
	PromoteAssistantThreadResult,
	RunTaskResult,
	ScreenshotAttachment,
	WindowCaptureTarget,
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
	permissionBroker: PermissionBroker;
	promptNotifier: PromptNotifier;
	/**
	 * Re-establishes the gateway connection with the current settings (no-op when
	 * signed out). Fire-and-forget — failures surface via daemon status events.
	 */
	reconnectGateway: () => void;
	/** Opens a URL in the user's default browser (e.g. shell.openExternal). */
	openExternal: (url: string) => Promise<void>;
}

/** Human-readable message for an error caught at the IPC boundary. */
function ipcErrorMessage(error: unknown): string {
	return error instanceof InstanceApiError || error instanceof Error
		? error.message
		: String(error);
}

/** Where forwarded attachments are written for inspection — next to the log file. */
const ATTACHMENT_INSPECT_DIR = join(homedir(), '.n8n-local-gateway', 'attachments');

/** Monotonic suffix so successive submits don't overwrite each other within a session. */
let attachmentInspectSeq = 0;

/**
 * Write a forwarded attachment to disk so it can be opened/inspected, returning
 * a `file://` URL. Best-effort: on any failure it just returns `undefined` and
 * logging continues. Inspection aid while the UI flow is stubbed.
 */
function persistAttachmentForInspection(
	attachment: ScreenshotAttachment | { data: string; fileName: string },
): string | undefined {
	try {
		mkdirSync(ATTACHMENT_INSPECT_DIR, { recursive: true });
		attachmentInspectSeq += 1;
		const filePath = join(ATTACHMENT_INSPECT_DIR, `${attachmentInspectSeq}-${attachment.fileName}`);
		writeFileSync(filePath, Buffer.from(attachment.data, 'base64'));
		return pathToFileURL(filePath).href;
	} catch (error) {
		logger.debug('Failed to persist attachment for inspection', {
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}

/**
 * A log-safe view of a task request: the full structured context the desktop
 * detected, but with attachments reduced to `{ fileName, mimeType, bytes, fileUrl }`
 * so a multi-MB base64 screenshot never lands in the logs — `fileUrl` points at
 * the on-disk copy so the screenshot can be opened. Handy for inspecting what
 * "Looking at …" actually forwarded while the UI flow is stubbed.
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
				fileUrl: persistAttachmentForInspection(attachment),
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
	permissionBroker,
	promptNotifier,
	reconnectGateway,
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
				// Everything except logLevel (applied in-process above) feeds the gateway
				// config, which is only read at connect time — reconnect to apply it.
				if (Object.keys(partial).some((key) => key !== 'logLevel')) {
					reconnectGateway();
				}
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
			const message = ipcErrorMessage(error);
			logger.error('IPC tasks:run failed', { workflowId, error: message });
			return { ok: false, error: message };
		}
	});

	ipcMain.handle(
		'assistant:createTask',
		async (_event, body: DesktopAssistantTaskRequest): Promise<CreateAssistantTaskResult> => {
			// `info` so it shows without enabling debug, and a summary rather than the
			// raw body — screenshot attachments are multi-MB base64 we never want in logs.
			logger.info('IPC assistant:createTask', summarizeTaskRequest(body));
			try {
				const { threadId, runId } = await instanceApi.triggerTask(body);
				return { ok: true, threadId, runId };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error('IPC assistant:createTask failed', { error: message });
				return { ok: false, error: message };
			}
		},
	);

	ipcMain.handle('assistant:createChatThread', async (): Promise<CreateChatThreadResult> => {
		logger.debug('IPC assistant:createChatThread');
		try {
			const { threadId } = await instanceApi.createChatThread();
			return { ok: true, threadId };
		} catch (error) {
			const message = ipcErrorMessage(error);
			logger.error('IPC assistant:createChatThread failed', { error: message });
			return { ok: false, error: message };
		}
	});

	ipcMain.handle(
		'assistant:promote',
		async (
			_event,
			threadId: string,
			name?: string,
			icon?: string,
		): Promise<PromoteAssistantThreadResult> => {
			logger.debug('IPC assistant:promote', { threadId });
			try {
				const result = await instanceApi.promoteThread(threadId, name, icon);
				return {
					ok: true,
					status: result.status,
					runId: result.status === 'building' ? result.runId : undefined,
					workflowId: result.status === 'done' ? result.workflowId : undefined,
				};
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error('IPC assistant:promote failed', { threadId, error: message });
				return { ok: false, error: message };
			}
		},
	);

	ipcMain.handle('tasks:openWorkflow', async (_event, workflowId: string): Promise<void> => {
		logger.debug('IPC tasks:openWorkflow', { workflowId });
		const url = instanceApi.workflowUrl(workflowId);
		if (url) await openExternal(url);
	});

	ipcMain.handle(
		'tasks:detail',
		async (_event, workflowId: string): Promise<DesktopAssistantTaskDetailResponse> => {
			logger.debug('IPC tasks:detail', { workflowId });
			return await instanceApi.getTaskDetail(workflowId);
		},
	);

	ipcMain.handle(
		'tasks:applyEdits',
		async (
			_event,
			workflowId: string,
			body: DesktopAssistantApplyEditsRequest,
		): Promise<DesktopAssistantApplyEditsResponse> => {
			logger.debug('IPC tasks:applyEdits', { workflowId, changes: body.changes.length });
			return await instanceApi.applyTaskEdits(workflowId, body);
		},
	);

	ipcMain.handle(
		'tasks:delete',
		async (_event, workflowId: string): Promise<{ ok: boolean; error?: string }> => {
			logger.debug('IPC tasks:delete', { workflowId });
			try {
				await instanceApi.archiveWorkflow(workflowId);
				return { ok: true };
			} catch (error) {
				const message = ipcErrorMessage(error);
				logger.error('IPC tasks:delete failed', { workflowId, error: message });
				return { ok: false, error: message };
			}
		},
	);

	ipcMain.handle('tasks:openWorkflowSetup', async (_event, workflowId: string): Promise<void> => {
		logger.debug('IPC tasks:openWorkflowSetup', { workflowId });
		const url = instanceApi.workflowSetupUrl(workflowId);
		if (url) await openExternal(url);
	});

	ipcMain.handle('assistant:openThread', async (_event, threadId: string): Promise<void> => {
		logger.debug('IPC assistant:openThread', { threadId });
		const url = instanceApi.threadUrl(threadId);
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

	ipcMain.handle(
		'thread:post',
		async (_event, threadId: string, message: string): Promise<{ runId: string }> => {
			logger.debug('IPC thread:post', { threadId });
			return await threadService.postMessage(threadId, message);
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

	ipcMain.handle(
		'thread:confirm',
		async (
			_event,
			threadId: string,
			requestId: string,
			body: unknown,
		): Promise<ConfirmThreadResult> => {
			logger.debug('IPC thread:confirm', { threadId, requestId });
			const parsed = InstanceAiConfirmRequestDto.safeParse(body);
			if (!parsed.success) {
				return { ok: false, error: 'Invalid confirmation body' };
			}
			try {
				await threadService.confirm(threadId, requestId, parsed.data);
				return { ok: true };
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				logger.error('IPC thread:confirm failed', { threadId, requestId, error: message });
				return {
					ok: false,
					status: error instanceof InstanceApiError ? error.status : undefined,
					error: message,
				};
			}
		},
	);

	ipcMain.handle('notifications:taskResult', (_event, title: string, body: string): void => {
		logger.debug('IPC notifications:taskResult', { title });
		promptNotifier.notifyTaskResult(String(title), String(body));
	});

	ipcMain.handle('permissionPrompt:list', (): LocalPermissionPromptRequest[] => {
		logger.debug('IPC permissionPrompt:list');
		return permissionBroker.list();
	});

	ipcMain.handle(
		'permissionPrompt:respond',
		(_event, id: string, decision: ResourceDecision): { ok: boolean } => {
			logger.debug('IPC permissionPrompt:respond', { id, decision });
			if (!RESOURCE_DECISION_KEYS.includes(decision)) return { ok: false };
			return { ok: permissionBroker.respond(id, decision) };
		},
	);

	ipcMain.handle('context:list', (): DetectedContext[] => {
		const options = contextDetector.getOptions();
		logger.debug('IPC context:list', { count: options.length });
		return options;
	});

	ipcMain.handle(
		'context:captureScreenshot',
		async (_event, target?: WindowCaptureTarget): Promise<ScreenshotAttachment> => {
			logger.debug('IPC context:captureScreenshot', { app: target?.app });
			return await contextDetector.captureScreenshot(target);
		},
	);

	ipcMain.handle(
		'recommendations:get',
		async (
			_event,
			body: DesktopAssistantRecommendationsRequest,
		): Promise<DesktopAssistantRecommendationsResponse> => {
			logger.debug('IPC recommendations:get', { kind: body.context?.kind });
			return await instanceApi.getRecommendations(body);
		},
	);

	ipcMain.handle('permissions:get', async (): Promise<MacPermissionStatus> => {
		logger.debug('IPC permissions:get');
		return await getMacPermissionStatus();
	});

	ipcMain.handle(
		'permissions:openSettings',
		async (_event, kind: MacPermissionKind): Promise<void> => {
			logger.debug('IPC permissions:openSettings', { kind });
			await openMacPermissionSettings(kind);
		},
	);
}
