import { contextBridge, ipcRenderer } from 'electron';

import type {
	AppSettings,
	AuthStatus,
	CreateAssistantTaskResult,
	DesktopAssistantHistoryParams,
	DesktopAssistantHistoryResponse,
	DesktopAssistantRecommendationsRequest,
	DesktopAssistantRecommendationsResponse,
	DesktopAssistantTaskRequest,
	DesktopAssistantTasksResponse,
	DesktopAssistantTimeSaved,
	DetectedContext,
	ElectronApi,
	InstanceAiEvent,
	InstanceAiRichMessagesResponse,
	MacPermissionKind,
	MacPermissionStatus,
	PromoteAssistantThreadResult,
	RunTaskResult,
	ScreenshotAttachment,
	StatusSnapshot,
	WindowCaptureTarget,
} from '../shared/types';

const electronApi: ElectronApi = {
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

	getTasks: async (): Promise<DesktopAssistantTasksResponse> =>
		await (ipcRenderer.invoke('tasks:list') as Promise<DesktopAssistantTasksResponse>),

	runTask: async (workflowId: string): Promise<RunTaskResult> =>
		await (ipcRenderer.invoke('tasks:run', workflowId) as Promise<RunTaskResult>),

	createAssistantTask: async (
		body: DesktopAssistantTaskRequest,
	): Promise<CreateAssistantTaskResult> =>
		await (ipcRenderer.invoke('assistant:createTask', body) as Promise<CreateAssistantTaskResult>),

	promoteAssistantThread: async (
		threadId: string,
		name?: string,
		icon?: string,
	): Promise<PromoteAssistantThreadResult> =>
		await (ipcRenderer.invoke(
			'assistant:promote',
			threadId,
			name,
			icon,
		) as Promise<PromoteAssistantThreadResult>),

	openWorkflow: async (workflowId: string): Promise<void> => {
		await ipcRenderer.invoke('tasks:openWorkflow', workflowId);
	},

	getHistory: async (
		params?: DesktopAssistantHistoryParams,
	): Promise<DesktopAssistantHistoryResponse> =>
		await (ipcRenderer.invoke('history:list', params) as Promise<DesktopAssistantHistoryResponse>),

	openExecution: async (workflowId: string, executionId: string): Promise<void> => {
		await ipcRenderer.invoke('history:openExecution', workflowId, executionId);
	},

	getTimeSaved: async (): Promise<DesktopAssistantTimeSaved> =>
		await (ipcRenderer.invoke('insights:timeSaved') as Promise<DesktopAssistantTimeSaved>),

	onWindowActiveChanged: (onChangeCallback: (active: boolean) => void): (() => void) => {
		const handler = (_event: unknown, active: boolean) => onChangeCallback(active);
		ipcRenderer.on('windowActiveChanged', handler);
		return () => ipcRenderer.removeListener('windowActiveChanged', handler);
	},

	getThread: async (
		threadId: string,
		options?: { refresh?: boolean },
	): Promise<InstanceAiRichMessagesResponse> =>
		await (ipcRenderer.invoke(
			'thread:get',
			threadId,
			options,
		) as Promise<InstanceAiRichMessagesResponse>),

	listenToThread: async (threadId: string, lastEventId?: number): Promise<void> => {
		await ipcRenderer.invoke('thread:listen', threadId, lastEventId);
	},

	unlistenToThread: async (threadId: string): Promise<void> => {
		await ipcRenderer.invoke('thread:unlisten', threadId);
	},

	onThreadEvent: (
		onEventCallback: (threadId: string, event: InstanceAiEvent) => void,
	): (() => void) => {
		const handler = (_event: unknown, threadId: string, event: InstanceAiEvent) =>
			onEventCallback(threadId, event);
		ipcRenderer.on('threadEvent', handler);
		return () => ipcRenderer.removeListener('threadEvent', handler);
	},

	getContextOptions: async (): Promise<DetectedContext[]> =>
		await (ipcRenderer.invoke('context:list') as Promise<DetectedContext[]>),

	onContextChanged: (onChangeCallback: (contexts: DetectedContext[]) => void): (() => void) => {
		const handler = (_event: unknown, contexts: DetectedContext[]) => onChangeCallback(contexts);
		ipcRenderer.on('contextChanged', handler);
		return () => ipcRenderer.removeListener('contextChanged', handler);
	},

	captureScreenshot: async (target?: WindowCaptureTarget): Promise<ScreenshotAttachment> =>
		await (ipcRenderer.invoke(
			'context:captureScreenshot',
			target,
		) as Promise<ScreenshotAttachment>),

	getRecommendations: async (
		body: DesktopAssistantRecommendationsRequest,
	): Promise<DesktopAssistantRecommendationsResponse> =>
		await (ipcRenderer.invoke(
			'recommendations:get',
			body,
		) as Promise<DesktopAssistantRecommendationsResponse>),

	getMacPermissions: async (): Promise<MacPermissionStatus> =>
		await (ipcRenderer.invoke('permissions:get') as Promise<MacPermissionStatus>),

	openMacPermissionSettings: async (kind: MacPermissionKind): Promise<void> => {
		await ipcRenderer.invoke('permissions:openSettings', kind);
	},
};

contextBridge.exposeInMainWorld('electronAPI', electronApi);

declare global {
	interface Window {
		/** Bridge exposed by this preload — the shared `ElectronApi` contract. */
		electronAPI: ElectronApi;
	}
}
