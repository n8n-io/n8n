import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { VNode } from 'vue';

export type DialogAction = 'confirm' | 'cancel';
export type DialogMessage = string | VNode;

export interface AlertDialogOptions {
	title: string;
	message?: DialogMessage;
	actionLabel?: string;
	cancelLabel?: string;
	actionVariant?: 'solid' | 'destructive';
	showCancel?: boolean;
	showCloseButton?: boolean;
	closeOnClickModal?: boolean;
	customClass?: string;
}

export interface PromptDialogOptions extends AlertDialogOptions {
	inputValue?: string;
	inputPlaceholder?: string;
	inputValidator?: (value: string) => boolean | string;
	inputErrorMessage?: string;
}

export interface PromptDialogResult {
	value: string;
	action: DialogAction;
}

type DialogRequest =
	| {
			type: 'alert';
			options: AlertDialogOptions;
			resolve: (result: DialogAction) => void;
	  }
	| {
			type: 'prompt';
			options: PromptDialogOptions;
			resolve: (result: PromptDialogResult) => void;
	  };

export const useAlertDialogStore = defineStore(STORES.ALERT_DIALOG, () => {
	const isOpen = ref(false);
	const activeType = ref<'alert' | 'prompt' | null>(null);
	const title = ref('');
	const message = ref<DialogMessage | null>(null);
	const actionLabel = ref('Confirm');
	const cancelLabel = ref('Cancel');
	const actionVariant = ref<'solid' | 'destructive'>('solid');
	const showCancel = ref(true);
	const showCloseButton = ref(false);
	const disableOutsidePointerEvents = ref(true);
	const customClass = ref('');
	const promptValue = ref('');
	const promptPlaceholder = ref('');
	const inputError = ref('');
	const inputValidator = ref<PromptDialogOptions['inputValidator']>();
	const inputErrorMessage = ref<PromptDialogOptions['inputErrorMessage']>();

	const queue = ref<DialogRequest[]>([]);
	const activeRequest = ref<DialogRequest | null>(null);

	const enqueue = (request: DialogRequest) => {
		queue.value.push(request);
		if (!activeRequest.value) {
			openNext();
		}
	};

	const openAlert = (options: AlertDialogOptions) =>
		new Promise<DialogAction>((resolve) => {
			enqueue({ type: 'alert', options, resolve });
		});

	const openPrompt = (options: PromptDialogOptions) =>
		new Promise<PromptDialogResult>((resolve) => {
			enqueue({ type: 'prompt', options, resolve });
		});

	const openNext = () => {
		const next = queue.value.shift();
		if (!next) return;
		activeRequest.value = next;
		activeType.value = next.type;
		title.value = next.options.title;
		message.value = next.options.message ?? '';
		actionLabel.value = next.options.actionLabel ?? 'Confirm';
		cancelLabel.value = next.options.cancelLabel ?? 'Cancel';
		actionVariant.value = next.options.actionVariant ?? 'solid';
		showCancel.value = next.options.showCancel ?? true;
		showCloseButton.value = next.options.showCloseButton ?? false;
		disableOutsidePointerEvents.value = !(next.options.closeOnClickModal ?? false);
		customClass.value = next.options.customClass ?? '';

		if (next.type === 'prompt') {
			promptValue.value = next.options.inputValue ?? '';
			promptPlaceholder.value = next.options.inputPlaceholder ?? '';
			inputValidator.value = next.options.inputValidator;
			inputErrorMessage.value = next.options.inputErrorMessage;
			inputError.value = '';
		}

		isOpen.value = true;
	};

	const reset = () => {
		activeType.value = null;
		message.value = null;
		inputError.value = '';
		inputValidator.value = undefined;
		inputErrorMessage.value = undefined;
		customClass.value = '';
		promptValue.value = '';
		promptPlaceholder.value = '';
	};

	const closeAndContinue = () => {
		isOpen.value = false;
		activeRequest.value = null;
		reset();
		setTimeout(openNext, 0);
	};

	const confirm = () => {
		if (!activeRequest.value) return;
		if (activeRequest.value.type === 'prompt') {
			const validator = inputValidator.value;
			if (validator) {
				const validationResult = validator(promptValue.value);
				if (validationResult !== true) {
					inputError.value =
						typeof validationResult === 'string'
							? validationResult
							: (inputErrorMessage.value ?? '');
					return;
				}
			}
			activeRequest.value.resolve({ value: promptValue.value, action: 'confirm' });
			closeAndContinue();
			return;
		}

		activeRequest.value.resolve('confirm');
		closeAndContinue();
	};

	const cancel = () => {
		if (!activeRequest.value) return;
		if (activeRequest.value.type === 'prompt') {
			activeRequest.value.resolve({ value: '', action: 'cancel' });
			closeAndContinue();
			return;
		}
		activeRequest.value.resolve('cancel');
		closeAndContinue();
	};

	const updateOpen = (value: boolean) => {
		if (!value && isOpen.value) {
			cancel();
		}
	};

	const clearInputError = () => {
		inputError.value = '';
	};

	return {
		isOpen,
		activeType,
		title,
		message,
		actionLabel,
		cancelLabel,
		actionVariant,
		showCancel,
		showCloseButton,
		disableOutsidePointerEvents,
		customClass,
		promptValue,
		promptPlaceholder,
		inputError,
		clearInputError,
		openAlert,
		openPrompt,
		confirm,
		cancel,
		updateOpen,
	};
});
