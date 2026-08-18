import { createLogger } from '../logger';

const log = createLogger('extension-opt-out');

interface OptOutGroup {
	selector: string;
	attributes: Array<[string, string]>;
}

// Best-effort: there is no cross-vendor standard, and some vendors offer no opt-out at all.
const OPT_OUT_GROUPS: OptOutGroup[] = [
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

/**
 * Runs in the page context, re-invoked per delivery. As an init script the first pass lands
 * before the page has parsed any field; the observer then stamps each field as it is
 * inserted, ahead of an extension that collects fields on its own schedule.
 *
 * Accepted gap: a field that only becomes eligible through a later attribute change (an
 * element turned `contenteditable`) is never restamped. Observers cannot cross a shadow or
 * frame boundary, so each root found during a pass gets its own — a root created after the
 * last pass is only picked up by the next delivery.
 *
 * Node checks are by `nodeType`/`localName`, never `instanceof`: a same-origin frame's nodes
 * come from another realm, where this realm's `Element`/`HTMLIFrameElement` do not match.
 */
export function applyOptOutAttributes(groups: OptOutGroup[]): void {
	function isElement(node: Node): node is Element {
		return node.nodeType === 1;
	}

	function isFrame(element: Element): element is HTMLIFrameElement {
		return element.localName === 'iframe';
	}

	function isRegistry(value: unknown): value is WeakSet<Node> {
		return value instanceof WeakSet;
	}

	// Parked on `window` so repeat deliveries share it, keyed by root rather than a boolean so a
	// document nobody has observed yet still gets an observer. Locked down because the page can
	// otherwise pre-seed it and suppress the observer it is meant to be protected by.
	const REGISTRY = '__n8nExtensionOptOut';
	const existing: unknown = Reflect.get(window, REGISTRY);
	const observed = isRegistry(existing) ? existing : new WeakSet<Node>();
	if (!isRegistry(existing)) {
		try {
			Object.defineProperty(window, REGISTRY, { value: observed, configurable: false });
		} catch {
			// A non-configurable foreign value is already there; keep the local registry.
		}
	}

	function setAttrs(element: Element, attributes: Array<[string, string]>): void {
		for (const [name, value] of attributes) {
			if (!element.hasAttribute(name)) element.setAttribute(name, value);
		}
	}

	function crossBoundaries(element: Element): void {
		if (element.shadowRoot) {
			stamp(element.shadowRoot);
			observe(element.shadowRoot);
		}
		if (isFrame(element)) {
			try {
				// Cross-origin frames throw; they run this script themselves, so nothing is lost.
				const frameDocument = element.contentDocument;
				if (frameDocument) {
					stamp(frameDocument);
					observe(frameDocument);
				}
			} catch {
				// Cross-origin.
			}
		}
	}

	function stamp(root: Document | ShadowRoot | Element): void {
		for (const { selector, attributes } of groups) {
			if (isElement(root) && root.matches(selector)) setAttrs(root, attributes);
			for (const element of root.querySelectorAll(selector)) setAttrs(element, attributes);
		}

		if (isElement(root)) crossBoundaries(root);
		for (const element of root.querySelectorAll('*')) crossBoundaries(element);
	}

	function observe(root: Document | ShadowRoot): void {
		if (observed.has(root)) return;
		observed.add(root);
		const observer = new MutationObserver((records) => {
			for (const record of records) {
				for (const node of record.addedNodes) {
					if (isElement(node)) stamp(node);
				}
			}
		});
		observer.observe(root, { childList: true, subtree: true });
	}

	stamp(document);
	observe(document);
}

export const OPT_OUT_SCRIPT = `(${applyOptOutAttributes.toString()})(${JSON.stringify(
	OPT_OUT_GROUPS,
)})`;

/**
 * Delivers the opt-out through whichever mechanism the caller has — an init script for
 * documents not yet opened, or an evaluate for one that already exists. Never throws:
 * failing to opt out must not stop the operation that asked for it. Returns whether the
 * delivery landed, so a caller that relied on it can fall back.
 */
export async function applyExtensionOptOut(
	deliver: (script: string) => Promise<unknown>,
): Promise<boolean> {
	try {
		await deliver(OPT_OUT_SCRIPT);
		return true;
	} catch (error) {
		log.warn('extension opt-out failed', { error });
		return false;
	}
}
