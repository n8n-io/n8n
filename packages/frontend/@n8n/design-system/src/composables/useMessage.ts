import { sanitizeIfString } from '@n8n/frontend-utils/htmlUtils';
import type { ElMessageBoxOptions, Action, MessageBoxInputData } from 'element-plus';
import { ElMessageBox as MessageBox } from 'element-plus';
import { computed, h, ref, render } from 'vue';

import { FocusScope } from '../components/FocusScope';
import N8nCheckbox from '../v2/components/Checkbox/Checkbox.vue';

export type MessageBoxConfirmResult = 'confirm' | 'cancel';

type AdditionalConfirmOptions = {
	confirmationCheckboxMessage?: ElMessageBoxOptions['message'];
};

const activeMessageBoxCount = ref(0);

/** Internal flag so open Reka dialogs pause pointer and Escape handling behind a message box. */
export const hasActiveMessageBox = computed(() => activeMessageBoxCount.value > 0);

function resolveAppendToTarget(appendTo: ElMessageBoxOptions['appendTo']): HTMLElement | null {
	if (typeof document === 'undefined') return null;
	if (typeof appendTo === 'string') {
		const target = document.querySelector(appendTo);
		if (target instanceof HTMLElement) return target;
	} else if (appendTo instanceof HTMLElement) {
		return appendTo;
	}
	return document.body;
}

async function withModalLayer<T>(
	config: ElMessageBoxOptions,
	openMessageBox: (layerConfig: ElMessageBoxOptions) => Promise<T>,
): Promise<T> {
	const parent = resolveAppendToTarget(config.appendTo);
	if (!parent) {
		return await openMessageBox(config);
	}

	const host = document.createElement('div');
	parent.appendChild(host);

	// Mount ElMessageBox inside a Reka FocusScope so parent N8nDialogs pause their
	// focus trap instead of pulling keyboard focus behind the message box.
	const scopeVNode = h(
		FocusScope,
		{
			loop: true,
			trapped: true,
			style: {
				pointerEvents: 'auto',
				outline: 'none',
			},
			// Let ElMessageBox place initial focus on its confirm button or prompt input.
			onMountAutoFocus: (event: Event) => {
				event.preventDefault();
			},
		},
		{ default: () => [] },
	);

	render(scopeVNode, host);
	const layerEl = host.firstElementChild;
	const layerConfig: ElMessageBoxOptions =
		layerEl instanceof HTMLElement ? { ...config, appendTo: layerEl } : config;

	let cleaned = false;
	let observer: MutationObserver | null = null;
	const cleanup = () => {
		if (cleaned) return;
		cleaned = true;
		observer?.disconnect();
		observer = null;
		activeMessageBoxCount.value = Math.max(0, activeMessageBoxCount.value - 1);
		render(null, host);
		host.remove();
	};

	activeMessageBoxCount.value += 1;
	try {
		const promise = openMessageBox(layerConfig);
		if (
			layerEl instanceof HTMLElement &&
			layerEl.childElementCount > 0 &&
			typeof MutationObserver !== 'undefined'
		) {
			observer = new MutationObserver(() => {
				if (layerEl.childElementCount === 0) {
					cleanup();
				}
			});
			observer.observe(layerEl, { childList: true });
		}
		return await promise;
	} finally {
		cleanup();
	}
}

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
		const resolvedConfig: ElMessageBoxOptions = {
			...(config ?? (typeof configOrTitle === 'object' ? configOrTitle : {})),
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
			dangerouslyUseHTMLString: true,
		};

		return await withModalLayer(resolvedConfig, async (layerConfig) => {
			const result =
				typeof configOrTitle === 'string'
					? MessageBox.alert(sanitizeIfString(message), configOrTitle, layerConfig)
					: MessageBox.alert(sanitizeIfString(message), layerConfig);
			return await result.catch(handleCancelOrClose);
		});
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

		return await withModalLayer(resolvedConfig, async (layerConfig) => {
			const result =
				typeof configOrTitle === 'string'
					? MessageBox.confirm(content, sanitizeIfString(configOrTitle), layerConfig)
					: MessageBox.confirm(content, layerConfig);
			return await result.catch(handleCancelOrClose);
		});
	}

	async function prompt(
		message: ElMessageBoxOptions['message'],
		configOrTitle?: string | ElMessageBoxOptions,
		config?: ElMessageBoxOptions,
	) {
		const resolvedConfig: ElMessageBoxOptions = {
			...(config ?? (typeof configOrTitle === 'object' ? configOrTitle : {})),
			cancelButtonClass: 'btn--cancel',
			confirmButtonClass: 'btn--confirm',
			dangerouslyUseHTMLString: true,
		};

		return await withModalLayer(resolvedConfig, async (layerConfig) => {
			const result =
				typeof configOrTitle === 'string'
					? MessageBox.prompt(
							sanitizeIfString(message),
							sanitizeIfString(configOrTitle),
							layerConfig,
						)
					: MessageBox.prompt(sanitizeIfString(message), layerConfig);
			return await result.catch(handleCancelOrClosePrompt);
		});
	}

	return {
		alert,
		confirm,
		prompt,
		message: MessageBox,
	};
}
