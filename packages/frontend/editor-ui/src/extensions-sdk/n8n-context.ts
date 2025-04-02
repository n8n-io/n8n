import { useToast } from '@/composables/useToast';
import type { ElMessageBoxOptions } from 'element-plus';
import { useMessage } from '@/composables/useMessage';
import { ExtensionIframeManager } from './ExtensionPaneManager';

const extensionIFrameManager = new ExtensionIframeManager({
	watchStyleChanges: false,
});

export type N8nExtensionContext = {
	createViewPanel: (options: {
		id: string;
		name: string;
	}) => Promise<HTMLIFrameElement>;
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
	createViewPanel: async ({ id, name }) => {
		const extensionFrame = extensionIFrameManager.createSettingsExtensionIframe(id, name);
		await extensionIFrameManager.collectStyles();
		extensionIFrameManager.registerIframe(id, extensionFrame);
		return extensionFrame;
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
