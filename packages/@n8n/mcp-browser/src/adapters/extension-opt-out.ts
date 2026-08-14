import { createLogger } from '../logger';

const log = createLogger('extension-opt-out');

interface OptOutGroup {
	selector: string;
	attributes: Array<[string, string]>;
}

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

// Runs in the page context.
export function applyOptOutAttributes(groups: OptOutGroup[]): void {
	function apply(root: Document | ShadowRoot): void {
		for (const { selector, attributes } of groups) {
			for (const element of Array.from(root.querySelectorAll(selector))) {
				for (const [name, value] of attributes) {
					if (!element.hasAttribute(name)) element.setAttribute(name, value);
				}
			}
		}

		for (const element of Array.from(root.querySelectorAll('*'))) {
			const shadowRoot = (element as HTMLElement).shadowRoot;
			if (shadowRoot) apply(shadowRoot);
		}

		for (const frame of Array.from(root.querySelectorAll('iframe'))) {
			try {
				const frameDocument = frame.contentDocument;
				if (frameDocument) apply(frameDocument);
			} catch {
				// Cross-origin frame — not reachable from page JS.
			}
		}
	}

	apply(document);
}

export const OPT_OUT_SCRIPT = `(${applyOptOutAttributes.toString()})(${JSON.stringify(
	OPT_OUT_GROUPS,
)})`;

/** Page-wide, not per-element: agent-browser refs are not addressable from page JS. */
export async function applyExtensionOptOut(
	evaluate: (script: string) => Promise<unknown>,
): Promise<void> {
	try {
		await evaluate(OPT_OUT_SCRIPT);
	} catch (error) {
		log.warn('extension opt-out failed', { error });
	}
}
