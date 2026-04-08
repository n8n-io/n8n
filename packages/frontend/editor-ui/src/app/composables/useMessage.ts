import type { ElMessageBoxOptions, Action, MessageBoxInputData } from 'element-plus';
import { ElMessageBox as MessageBox } from 'element-plus';
import { h } from 'vue';
import { sanitizeIfString } from '@/app/utils/htmlUtils';
import { N8nCheckbox } from '@n8n/design-system';

export type MessageBoxConfirmResult = 'confirm' | 'cancel';

type AdditionalConfirmOptions = {
	confirmationCheckboxMessage?: ElMessageBoxOptions['message'];
};

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
		config?: ElMessageBoxOptions & AdditionalConfirmOptions,
	) {
		let content = sanitizeIfString(message);
		let confirmedCheckbox = true;
		const { confirmationCheckboxMessage, ...remainingConfig } = config ?? {};
		const resolvedConfig: ElMessageBoxOptions = {
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
			distinguishCancelAndClose: true,
			showClose: config?.showClose ?? false,
			closeOnClickModal: false,
			dangerouslyUseHTMLString: true,
			beforeClose: (action, _instance, done) => {
				if (action !== 'confirm' || confirmedCheckbox) {
					done();
				}
			},
			...(config ? remainingConfig : typeof configOrTitle === 'object' ? configOrTitle : {}),
		};

		if (confirmationCheckboxMessage) {
			confirmedCheckbox = false;
			resolvedConfig.customClass = [resolvedConfig.customClass, 'with-confirmation-checkbox'].join(
				' ',
			);
			content = h('div', [
				h(
					'div',
					{
						class: 'el-message-box__message__structured',
					},
					content,
				),
				h(
					N8nCheckbox,
					{
						'onUpdate:modelValue': (checked: boolean) => {
							confirmedCheckbox = checked;
						},
						required: true,
					},
					{
						label: () => h('span', sanitizeIfString(confirmationCheckboxMessage)),
					},
				),
			]);
		}

		if (typeof configOrTitle === 'string') {
			return await MessageBox.confirm(
				content,
				sanitizeIfString(configOrTitle),
				resolvedConfig,
			).catch(handleCancelOrClose);
		}

		return await MessageBox.confirm(content, resolvedConfig).catch(handleCancelOrClose);
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
