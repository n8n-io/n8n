import type { ElMessageBoxOptions } from 'element-ui/types/message-box';
import { Message, MessageBox } from 'element-ui';

export function useMessage() {
	async function alert(
		message: string,
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	) {
		const resolvedConfig = {
			...(config || (typeof configOrTitle === 'object' ? configOrTitle : {})),
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
		};

		if (typeof configOrTitle === 'string') {
			return MessageBox.alert(message, configOrTitle, resolvedConfig);
		}
		return MessageBox.alert(message, resolvedConfig);
	}

	async function confirm(
		message: string,
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	) {
		const resolvedConfig = {
			...(config || (typeof configOrTitle === 'object' ? configOrTitle : {})),
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
			distinguishCancelAndClose: true,
			showClose: config?.showClose || false,
			closeOnClickModal: false,
		};

		if (typeof configOrTitle === 'string') {
			return MessageBox.confirm(message, configOrTitle, resolvedConfig);
		}
		return MessageBox.confirm(message, resolvedConfig);
	}

	async function prompt(
		message: string,
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	) {
		const resolvedConfig = {
			...(config || (typeof configOrTitle === 'object' ? configOrTitle : {})),
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
		};

		if (typeof configOrTitle === 'string') {
			return MessageBox.prompt(message, configOrTitle, resolvedConfig);
		}
		return MessageBox.prompt(message, resolvedConfig);
	}

	return {
		alert,
		confirm,
		prompt,
		message: Message,
	};
}
