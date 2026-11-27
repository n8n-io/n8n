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

const LEAVE_CLEANUP_FALLBACK_MS = 600;

const activeMessageBoxCount = ref(0);
const escapeEventsWhileMessageBoxActive = new WeakSet<KeyboardEvent>();

/** Internal flag so open Reka dialogs pause pointer and outside-interaction handling behind a message box. */
export const hasActiveMessageBox = computed(() => activeMessageBoxCount.value > 0);

function recordEscapeWhileMessageBoxActive(event: KeyboardEvent) {
	if (event.key === 'Escape' && activeMessageBoxCount.value > 0) {
		escapeEventsWhileMessageBoxActive.add(event);
	}
}

function incrementActiveMessageBoxCount() {
	if (activeMessageBoxCount.value === 0 && typeof window !== 'undefined') {
		window.addEventListener('keydown', recordEscapeWhileMessageBoxActive, true);
	}
	activeMessageBoxCount.value += 1;
}

function decrementActiveMessageBoxCount() {
	if (activeMessageBoxCount.value === 0) return;
	activeMessageBoxCount.value -= 1;
	if (activeMessageBoxCount.value === 0 && typeof window !== 'undefined') {
		window.removeEventListener('keydown', recordEscapeWhileMessageBoxActive, true);
	}
}

/** True when Escape was pressed while a message box was active. */
export function isEscapeConsumedByMessageBox(event: KeyboardEvent): boolean {
	return hasActiveMessageBox.value || escapeEventsWhileMessageBoxActive.has(event);
}

function resolveAppendToTarget(appendTo: ElMessageBoxOptions['appendTo']): HTMLElement | null {
	if (typeof document === 'undefined') return null;
	if (typeof appendTo === 'string') {
		const target = document.querySelector(appendTo);
		if (target instanceof HTMLElement) return target;
	} else if (appendTo instanceof HTMLElement && appendTo.isConnected) {
		return appendTo;
	}
	return document.body;
}

function observeNodeRoots(observer: MutationObserver, node: Node) {
	let root: Node = node.getRootNode();
	observer.observe(root, { childList: true, subtree: true });
	while (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) {
		root = root.host.getRootNode();
		observer.observe(root, { childList: true, subtree: true });
	}
}

async function withModalLayer<T>(
	config: ElMessageBoxOptions,
	openMessageBox: (layerConfig: ElMessageBoxOptions) => Promise<T>,
): Promise<T> {
	const parent = resolveAppendToTarget(config.appendTo);
	if (!parent?.isConnected) {
		return await openMessageBox(config);
	}

	const host = document.createElement('div');
	parent.appendChild(host);

	const createScopeVNode = (trapped: boolean) =>
		h(
			FocusScope,
			{
				loop: trapped,
				trapped,
				style: {
					pointerEvents: trapped ? 'auto' : 'none',
					outline: 'none',
				},
				// Let ElMessageBox place initial focus on its confirm button or prompt input.
				onMountAutoFocus: (event: Event) => {
					event.preventDefault();
				},
				// Skip restoring focus when another message box is open or focus already moved elsewhere.
				onUnmountAutoFocus: (event: Event) => {
					const activeEl = document.activeElement;
					const focusMovedOutside =
						activeEl instanceof HTMLElement &&
						activeEl !== document.body &&
						!host.contains(activeEl);
					if (activeMessageBoxCount.value > 0 || focusMovedOutside) {
						event.preventDefault();
					}
				},
			},
			{ default: () => [] },
		);

	// Mount ElMessageBox inside a Reka FocusScope so parent N8nDialogs pause their
	// focus trap instead of pulling keyboard focus behind the message box.
	render(createScopeVNode(true), host);
	const layerEl = host.firstElementChild;
	const layerConfig: ElMessageBoxOptions =
		layerEl instanceof HTMLElement ? { ...config, appendTo: layerEl } : config;

	let activeReleased = false;
	let hostRemoved = false;
	let observer: MutationObserver | null = null;
	let leaveCleanupTimer: ReturnType<typeof setTimeout> | null = null;

	const releaseActiveState = () => {
		if (activeReleased) return;
		activeReleased = true;
		decrementActiveMessageBoxCount();
	};

	const teardownLayer = () => {
		releaseActiveState();
		if (hostRemoved) return;
		hostRemoved = true;
		if (leaveCleanupTimer !== null) {
			clearTimeout(leaveCleanupTimer);
			leaveCleanupTimer = null;
		}
		observer?.disconnect();
		observer = null;
		render(null, host);
		host.remove();
	};

	incrementActiveMessageBoxCount();
	try {
		const promise = openMessageBox(layerConfig);
		const targetEl = layerEl instanceof HTMLElement ? layerEl : host;
		if (!targetEl.isConnected) {
			teardownLayer();
		} else if (typeof MutationObserver !== 'undefined') {
			let hadLayerChild = layerEl instanceof HTMLElement && layerEl.childElementCount > 0;
			// Observe the containing root tree so detaching a caller-provided appendTo
			// container or removing the message box triggers cleanup.
			observer = new MutationObserver(() => {
				if (!targetEl.isConnected) {
					teardownLayer();
					return;
				}
				if (layerEl instanceof HTMLElement) {
					if (layerEl.childElementCount > 0) {
						hadLayerChild = true;
					} else if (hadLayerChild) {
						teardownLayer();
					}
				}
			});
			observeNodeRoots(observer, targetEl);
		}
		return await promise;
	} finally {
		releaseActiveState();
		const isLeaving =
			!hostRemoved &&
			layerEl instanceof HTMLElement &&
			layerEl.isConnected &&
			layerEl.firstElementChild?.classList.contains('fade-in-linear-leave-active') === true;
		if (isLeaving && observer) {
			// Let the Element Plus fade-out finish before detaching the host layer.
			render(createScopeVNode(false), host);
			leaveCleanupTimer = setTimeout(teardownLayer, LEAVE_CLEANUP_FALLBACK_MS);
		} else {
			teardownLayer();
		}
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
