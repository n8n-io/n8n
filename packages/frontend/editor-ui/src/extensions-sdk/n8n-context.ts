import { useToast } from '@/composables/useToast';
import type { ElMessageBoxOptions } from 'element-plus';
import { useMessage } from '@/composables/useMessage';
import { ExtensionIframeManager, type IframeMessage } from './ExtensionPaneManager';

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
};

export const n8n = {
	extensionContext: n8nExtensionContext,
};
