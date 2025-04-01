import { useToast } from '@/composables/useToast';
import type { ElMessageBoxOptions } from 'element-plus';
import { SETTINGS_EXTENSIONS_CONTAINER_ID } from '@/constants';
import { useMessage } from '@/composables/useMessage';

export type N8nExtensionContext = {
	createViewPanel: (options: {
		id: string;
		name: string;
	}) => HTMLIFrameElement;
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
	createViewPanel: ({ id, name }) => {
		const settingsExtensionContainer = document.getElementById(SETTINGS_EXTENSIONS_CONTAINER_ID);
		if (!settingsExtensionContainer) {
			throw new Error(
				`Settings extension container with id "${SETTINGS_EXTENSIONS_CONTAINER_ID}" not found`,
			);
		}
		const extensionIFrame = document.createElement('iframe');
		extensionIFrame.id = id;
		settingsExtensionContainer.appendChild(extensionIFrame);

		return extensionIFrame;
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
