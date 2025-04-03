import { useToast } from '@/composables/useToast';
import type { ElMessageBoxOptions } from 'element-plus';
import { useMessage } from '@/composables/useMessage';
import { ExtensionIframeManager, type IframeMessage } from './ExtensionPaneManager';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { WorkflowListResource } from '@/Interface';

const extensionIFrameManager = new ExtensionIframeManager({
	watchStyleChanges: false,
});

export type N8nExtensionContext = {
	createViewPanel: (options: {
		id: string;
		name: string;
		enableScripts?: boolean;
	}) => Promise<HTMLIFrameElement>;
	setPanelContent: (pane: HTMLIFrameElement, content: string) => void;
	appendPanelContent: (pane: HTMLIFrameElement, content: string) => void;
	setElementContent: (pane: HTMLIFrameElement, elementId: string, content: string) => void;
	showToast: (options: {
		message: string;
		type: 'success' | 'error' | 'info';
		duration?: number;
	}) => void;
	confirm: (
		message: ElMessageBoxOptions['message'],
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	) => Promise<string | undefined>;
	getWorkflows(): Promise<WorkflowListResource[]>;
};

const n8nExtensionContext: N8nExtensionContext = {
	createViewPanel: async ({ id, name, enableScripts }) => {
		const extensionFrame = extensionIFrameManager.createSettingsExtensionIframe(
			id,
			name,
			enableScripts,
		);
		await extensionIFrameManager.collectStyles();
		extensionIFrameManager.registerIframe(id, extensionFrame);

		return await new Promise<HTMLIFrameElement>((resolve) => {
			if (extensionIFrameManager.getReadyFrames().has(id)) {
				resolve(extensionFrame);
			} else {
				const checkReady = (event: MessageEvent) => {
					const data = event.data as IframeMessage;
					if (data.type === 'iframeReady' && data.frameId === id) {
						window.removeEventListener('message', checkReady);
						resolve(extensionFrame);
					}
				};
				window.addEventListener('message', checkReady);
			}
		});
	},
	setPanelContent: (pane, content) => {
		window.parent.postMessage(
			{
				type: 'setContent',
				frameId: pane.id,
				payload: content,
			},
			'*',
		);
	},
	setElementContent: (pane, elementId, content) => {
		window.parent.postMessage(
			{
				type: 'setElementContent',
				frameId: pane.id,
				elementId,
				payload: content,
			},
			'*',
		);
	},
	appendPanelContent: (pane, content) => {
		window.parent.postMessage(
			{
				type: 'appendContent',
				frameId: pane.id,
				payload: content,
			},
			'*',
		);
	},
	showToast: ({ message, type }) => {
		const toast = useToast();
		toast.showMessage({
			type,
			message,
		});
	},
	confirm: async (
		message: ElMessageBoxOptions['message'],
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	) => {
		const msg = useMessage();
		return await msg.confirm(message, configOrTitle, config);
	},
	getWorkflows: async () => {
		return await useWorkflowsStore().fetchWorkflowsPage(
			undefined,
			1,
			100,
			'updatedAt:desc',
			{},
			false,
		);
	},
};

export const n8n = {
	extensionContext: n8nExtensionContext,
};
