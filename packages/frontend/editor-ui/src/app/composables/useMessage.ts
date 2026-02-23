import { sanitizeIfString } from '@/app/utils/htmlUtils';
import { useAlertDialogStore } from '@/app/stores/alertDialog.store';
import { isVNode } from 'vue';
import type {
	DialogAction,
	DialogMessage,
	PromptDialogResult,
} from '@/app/stores/alertDialog.store';

export type MessageBoxConfirmResult = DialogAction;
export type MessageBoxInputData = PromptDialogResult;

export interface MessageBoxOptions {
	title?: string;
	confirmButtonText?: string;
	cancelButtonText?: string;
	showClose?: boolean;
	closeOnClickModal?: boolean;
	customClass?: string;
	type?: 'success' | 'info' | 'warning' | 'error';
	danger?: boolean;
}

export interface MessageBoxPromptOptions extends MessageBoxOptions {
	inputValue?: string;
	inputPlaceholder?: string;
	inputValidator?: (value: string) => boolean | string;
	inputErrorMessage?: string;
}

export function useMessage() {
	const alertDialogStore = useAlertDialogStore();

	const resolveMessage = (value: unknown): DialogMessage => {
		if (isVNode(value)) return value;
		if (value == null) return '';
		if (typeof value === 'string') return sanitizeIfString(value);
		return sanitizeIfString(String(value));
	};

	const resolveTitle = (value: unknown, fallback: string) =>
		typeof value === 'string' ? sanitizeIfString(value) : fallback;

	const resolveVariant = (options?: MessageBoxOptions) =>
		options?.danger || options?.type === 'warning' || options?.type === 'error'
			? 'destructive'
			: 'solid';

	async function alert(
		message: unknown,
		configOrTitle?: string | MessageBoxOptions,
		config?: MessageBoxOptions,
	) {
		const resolvedConfig = config ?? (typeof configOrTitle === 'object' ? configOrTitle : {});
		const title = resolveTitle(
			typeof configOrTitle === 'string' ? configOrTitle : resolvedConfig?.title,
			'Notice',
		);

		return await alertDialogStore.openAlert({
			title,
			message: resolveMessage(message),
			actionLabel: resolvedConfig?.confirmButtonText ?? 'OK',
			cancelLabel: resolvedConfig?.cancelButtonText ?? 'Cancel',
			showCancel: false,
			actionVariant: resolveVariant(resolvedConfig),
			showCloseButton: resolvedConfig?.showClose ?? false,
			closeOnClickModal: resolvedConfig?.closeOnClickModal,
			customClass: resolvedConfig?.customClass,
		});
	}

	async function confirm(
		message: unknown,
		configOrTitle?: string | MessageBoxOptions,
		config?: MessageBoxOptions,
	) {
		const resolvedConfig = config ?? (typeof configOrTitle === 'object' ? configOrTitle : {});
		const title = resolveTitle(
			typeof configOrTitle === 'string' ? configOrTitle : resolvedConfig?.title,
			'Confirm',
		);
		const showCancel = resolvedConfig?.cancelButtonText !== '';

		return await alertDialogStore.openAlert({
			title,
			message: resolveMessage(message),
			actionLabel: resolvedConfig?.confirmButtonText ?? 'Confirm',
			cancelLabel: resolvedConfig?.cancelButtonText ?? 'Cancel',
			showCancel,
			actionVariant: resolveVariant(resolvedConfig),
			showCloseButton: resolvedConfig?.showClose ?? false,
			closeOnClickModal: resolvedConfig?.closeOnClickModal,
			customClass: resolvedConfig?.customClass,
		});
	}

	async function prompt(
		message: unknown,
		configOrTitle?: string | MessageBoxPromptOptions,
		config?: MessageBoxPromptOptions,
	) {
		const resolvedConfig = config ?? (typeof configOrTitle === 'object' ? configOrTitle : {});
		const title = resolveTitle(
			typeof configOrTitle === 'string' ? configOrTitle : resolvedConfig?.title,
			'Enter value',
		);
		const showCancel = resolvedConfig?.cancelButtonText !== '';

		return await alertDialogStore.openPrompt({
			title,
			message: resolveMessage(message),
			actionLabel: resolvedConfig?.confirmButtonText ?? 'Confirm',
			cancelLabel: resolvedConfig?.cancelButtonText ?? 'Cancel',
			showCancel,
			actionVariant: resolveVariant(resolvedConfig),
			showCloseButton: resolvedConfig?.showClose ?? false,
			closeOnClickModal: resolvedConfig?.closeOnClickModal,
			customClass: resolvedConfig?.customClass,
			inputValue: resolvedConfig?.inputValue,
			inputPlaceholder: resolvedConfig?.inputPlaceholder,
			inputValidator: resolvedConfig?.inputValidator,
			inputErrorMessage: resolvedConfig?.inputErrorMessage,
		});
	}

	return {
		alert,
		confirm,
		prompt,
	};
}
