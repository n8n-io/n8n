import type { ElMessageBoxOptions } from 'element-plus';
import { ElMessageBox as MessageBox } from 'element-plus';

export type MessageBoxConfirmResult = 'confirm' | 'cancel';

export function useMessage() {
	const handleCancelOrClose = (e: unknown) => {
		if (e instanceof Error) throw e;
		else return e;
	};

	async function alert(
		message: ElMessageBoxOptions['message'],
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	) {
		const resolvedConfig = {
			...(config || (typeof configOrTitle === 'object' ? configOrTitle : {})),
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
		};

		if (typeof configOrTitle === 'string') {
			return await MessageBox.alert(message, configOrTitle, resolvedConfig).catch(
				handleCancelOrClose,
			);
		}
		return await MessageBox.alert(message, resolvedConfig).catch(handleCancelOrClose);
	}

	async function confirm(
		message: ElMessageBoxOptions['message'],
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	): Promise<MessageBoxConfirmResult> {
		const resolvedConfig = {
			...(config || (typeof configOrTitle === 'object' ? configOrTitle : {})),
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
			distinguishCancelAndClose: true,
			showClose: config?.showClose || false,
			closeOnClickModal: false,
		};

		if (typeof configOrTitle === 'string') {
			return await (MessageBox.confirm(message, configOrTitle, resolvedConfig).catch(
				handleCancelOrClose,
			) as unknown as Promise<MessageBoxConfirmResult>);
		}
		return await (MessageBox.confirm(message, resolvedConfig).catch(
			handleCancelOrClose,
		) as unknown as Promise<MessageBoxConfirmResult>);
	}

	async function prompt(
		message: ElMessageBoxOptions['message'],
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	) {
		const resolvedConfig = {
			...(config || (typeof configOrTitle === 'object' ? configOrTitle : {})),
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
		};

		if (typeof configOrTitle === 'string') {
			return await MessageBox.prompt(message, configOrTitle, resolvedConfig).catch(
				handleCancelOrClose,
			);
		}
		return await MessageBox.prompt(message, resolvedConfig).catch(handleCancelOrClose);
	}

	return {
		alert,
		confirm,
		prompt,
		message: MessageBox,
	};
}
