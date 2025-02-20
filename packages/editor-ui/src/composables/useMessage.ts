import type { ElMessageBoxOptions, Action, MessageBoxInputData } from 'element-plus';
import { ElMessageBox as MessageBox } from 'element-plus';
import { sanitizeIfString } from '@/utils/htmlUtils';

export type MessageBoxConfirmResult = 'confirm' | 'cancel';

export function useMessage() {
	const handleCancelOrClose = (e: Action | Error): Action => {
		if (e instanceof Error) throw e;

		return e;
	};

	const handleCancelOrClosePrompt = (e: Error | Action): MessageBoxInputData => {
		if (e instanceof Error) throw e;

		return { value: '', action: e };
	};

	async function alert(
		message: ElMessageBoxOptions['message'],
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	) {
		const resolvedConfig = {
			...(config ?? (typeof configOrTitle === 'object' ? configOrTitle : {})),
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
			dangerouslyUseHTMLString: true,
		};

		if (typeof configOrTitle === 'string') {
			return await MessageBox.alert(sanitizeIfString(message), configOrTitle, resolvedConfig).catch(
				handleCancelOrClose,
			);
		}
		return await MessageBox.alert(sanitizeIfString(message), resolvedConfig).catch(
			handleCancelOrClose,
		);
	}

	async function confirm(
		message: ElMessageBoxOptions['message'],
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	) {
		const resolvedConfig = {
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
			distinguishCancelAndClose: true,
			showClose: config?.showClose ?? false,
			closeOnClickModal: false,
			dangerouslyUseHTMLString: true,
			...(config ?? (typeof configOrTitle === 'object' ? configOrTitle : {})),
		};

		if (typeof configOrTitle === 'string') {
			return await MessageBox.confirm(
				sanitizeIfString(message),
				sanitizeIfString(configOrTitle),
				resolvedConfig,
			).catch(handleCancelOrClose);
		}

		return await MessageBox.confirm(sanitizeIfString(message), resolvedConfig).catch(
			handleCancelOrClose,
		);
	}

	async function prompt(
		message: ElMessageBoxOptions['message'],
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	) {
		const resolvedConfig = {
			...(config ?? (typeof configOrTitle === 'object' ? configOrTitle : {})),
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
			dangerouslyUseHTMLString: true,
		};

		if (typeof configOrTitle === 'string') {
			return await MessageBox.prompt(
				sanitizeIfString(message),
				sanitizeIfString(configOrTitle),
				resolvedConfig,
			).catch(handleCancelOrClosePrompt);
		}
		return await MessageBox.prompt(sanitizeIfString(message), resolvedConfig).catch(
			handleCancelOrClosePrompt,
		);
	}

	return {
		alert,
		confirm,
		prompt,
		message: MessageBox,
	};
}
