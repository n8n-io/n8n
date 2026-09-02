// Lives here rather than server-side so a renamed vendor attribute ships on the extension's
// cadence instead of waiting for an instance upgrade.

import { createLogger } from './logger';

const log = createLogger('document-prep');

const EVALUATE_TIMEOUT_MS = 5_000;

/**
 * Runs in the page context, once per document. Not covered: a field that only becomes eligible
 * via a later attribute change, a shadow root attached after its host was observed, and child
 * frames of a document that was already loaded when we attached.
 */
export function applyOptOutAttributes(): void {
	const groups: Array<{ selector: string; attributes: Array<[string, string]> }> = [
		{
			// 1Password honors this at <body> as a whole-page switch; the rest are per-field.
			selector: 'body',
			attributes: [['data-1p-ignore', '']],
		},
		{
			selector: 'input, textarea, select',
			attributes: [
				['data-1p-ignore', ''], // 1Password
				['data-lpignore', 'true'], // LastPass
				['data-bwignore', ''], // Bitwarden
				['data-protonpass-ignore', ''], // Proton Pass
				['data-form-type', 'other'], // Dashlane
			],
		},
		{
			selector: 'textarea, [contenteditable]:not([contenteditable="false"])',
			attributes: [
				['data-gramm', 'false'], // Grammarly
				['data-gramm_editor', 'false'], // Grammarly, legacy
				['data-enable-grammarly', 'false'], // Grammarly, current
				['data-lt-active', 'false'], // LanguageTool
			],
		},
	];

	function isElement(node: Node): node is Element {
		return node.nodeType === 1;
	}

	function isRegistry(value: unknown): value is WeakSet<Node> {
		return value instanceof WeakSet;
	}

	// Keyed by root, so a document nobody has observed yet still gets an observer.
	const REGISTRY = '__n8nExtensionOptOut';
	const existing: unknown = Reflect.get(window, REGISTRY);
	const observed = isRegistry(existing) ? existing : new WeakSet<Node>();
	if (!isRegistry(existing)) Reflect.set(window, REGISTRY, observed);

	function setAttrs(element: Element, attributes: Array<[string, string]>): void {
		for (const [name, value] of attributes) {
			if (!element.hasAttribute(name)) element.setAttribute(name, value);
		}
	}

	function mark(root: Document | ShadowRoot | Element): void {
		for (const { selector, attributes } of groups) {
			if (isElement(root) && root.matches(selector)) setAttrs(root, attributes);
			for (const element of root.querySelectorAll(selector)) setAttrs(element, attributes);
		}

		// Never reach into a frame from here: measured, it stops that frame's own run from marking
		// anything, and every frame runs this script itself.
		if (isElement(root)) descendShadow(root);
		for (const element of root.querySelectorAll('*')) descendShadow(element);
	}

	function descendShadow(element: Element): void {
		if (!element.shadowRoot) return;
		mark(element.shadowRoot);
		observe(element.shadowRoot);
	}

	function observe(root: Document | ShadowRoot): void {
		if (observed.has(root)) return;
		observed.add(root);
		const observer = new MutationObserver((records) => {
			for (const record of records) {
				for (const node of record.addedNodes) {
					if (isElement(node)) mark(node);
				}
			}
		});
		observer.observe(root, { childList: true, subtree: true });
	}

	mark(document);
	observe(document);
}

export const OPT_OUT_SCRIPT = `(${applyOptOutAttributes.toString()})()`;

export class DocumentPreparation {
	/** Covers every document the tab opens from now on, in every frame, plus the current one. */
	async applyToTab(chromeTabId: number): Promise<void> {
		const debuggee = { tabId: chromeTabId };
		try {
			await chrome.debugger.sendCommand(debuggee, 'Page.addScriptToEvaluateOnNewDocument', {
				source: OPT_OUT_SCRIPT,
			});
		} catch (e) {
			log.debug(`could not register for tab ${chromeTabId}:`, e);
		}

		// Bounded: awaited during attach, so a renderer blocked on a dialog must not stall it.
		let timer: ReturnType<typeof setTimeout> | undefined;
		const deadline = new Promise<void>((resolve) => {
			timer = setTimeout(() => {
				log.debug(`evaluate timed out for tab ${chromeTabId}`);
				resolve();
			}, EVALUATE_TIMEOUT_MS);
		});
		try {
			await Promise.race([this.markCurrentDocument(debuggee), deadline]);
		} finally {
			clearTimeout(timer);
		}
	}

	private async markCurrentDocument(debuggee: chrome.debugger.Debuggee): Promise<void> {
		try {
			const result = (await chrome.debugger.sendCommand(debuggee, 'Runtime.evaluate', {
				expression: OPT_OUT_SCRIPT,
				awaitPromise: false,
			})) as { exceptionDetails?: { text?: string } } | undefined;
			if (result?.exceptionDetails) {
				log.warn('page rejected the opt-out:', result.exceptionDetails.text);
			}
		} catch (e) {
			log.debug('evaluate failed:', e);
		}
	}
}
