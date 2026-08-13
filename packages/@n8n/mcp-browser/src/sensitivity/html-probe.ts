/* istanbul ignore file -- serialized via Function.prototype.toString() for page-context eval. */

import type { HtmlProbeNode, HtmlProbeResult } from '../types';

interface RawHtmlProbeNode {
	kind: HtmlProbeNode['kind'];
	html?: unknown;
	url?: unknown;
	children?: unknown;
	errors?: unknown;
}

// Runs in the page context. Keep this as a collector only: no matching,
// scoring, or redaction here, so the security logic stays testable in Node.
export function serializeHtmlProbe(): HtmlProbeNode {
	function node(
		kind: HtmlProbeNode['kind'],
		root: Document | ShadowRoot,
		url?: string,
	): HtmlProbeNode {
		const children: HtmlProbeNode[] = [];
		const errors: string[] = [];
		const scope = root instanceof Document ? root : root;

		// outerHTML does not include open shadow roots, so collect them as
		// explicit child documents for host-side analysis.
		for (const element of Array.from(scope.querySelectorAll('*'))) {
			const shadowRoot = (element as HTMLElement).shadowRoot;
			if (shadowRoot) {
				try {
					children.push(node('shadow-root', shadowRoot, url));
				} catch (error) {
					errors.push(error instanceof Error ? error.message : String(error));
				}
			}
		}

		// Same-origin iframes are readable from page JS. Cross-origin frames throw
		// and are intentionally recorded as collection errors, not matched here.
		for (const frame of Array.from(scope.querySelectorAll('iframe'))) {
			try {
				if (frame.contentDocument?.documentElement) {
					children.push(node('iframe', frame.contentDocument, frame.src));
				}
			} catch (error) {
				errors.push(error instanceof Error ? error.message : String(error));
			}
		}

		return {
			kind,
			html: serializeHtml(root),
			url,
			children,
			errors,
		};
	}

	function serializeHtml(root: Document | ShadowRoot): string {
		if (root.nodeType === root.DOCUMENT_NODE) {
			const source = (root as Document).documentElement;
			if (!source) return '';
			const clone = source.cloneNode(true) as Element;
			copyFormValues(source, clone);
			return clone.outerHTML;
		}
		// ShadowRoot has no outerHTML; serialize its children instead of the host.
		return Array.from(root.childNodes)
			.map((child) => {
				if (child instanceof Element) {
					const clone = child.cloneNode(true) as Element;
					copyFormValues(child, clone);
					return clone.outerHTML;
				}
				return child.textContent ?? '';
			})
			.join('');
	}

	function copyFormValues(sourceRoot: ParentNode, cloneRoot: ParentNode): void {
		const sourceControls = Array.from(sourceRoot.querySelectorAll('input, textarea'));
		const cloneControls = Array.from(cloneRoot.querySelectorAll('input, textarea'));
		for (const [index, source] of sourceControls.entries()) {
			const clone = cloneControls[index];
			if (!clone) continue;
			if (source instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
				clone.setAttribute('value', source.value);
			}
			if (source instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement) {
				clone.textContent = source.value;
			}
		}
	}

	return node('document', document, document.location.href);
}

// Adapter implementations pass this fixed collector script to page.evaluate /
// agent-browser eval. It only returns HTML bundles; host-side code owns all
// matching, scoring, and redaction decisions.
export const HTML_PROBE_SCRIPT = `(${serializeHtmlProbe.toString()})()`;

function parseNode(raw: unknown): HtmlProbeNode | undefined {
	if (!raw || typeof raw !== 'object') return undefined;
	const input = raw as RawHtmlProbeNode;
	const kind =
		input.kind === 'document' || input.kind === 'iframe' || input.kind === 'shadow-root'
			? input.kind
			: 'document';
	return {
		kind,
		html: typeof input.html === 'string' ? input.html : '',
		url: typeof input.url === 'string' ? input.url : undefined,
		children: Array.isArray(input.children)
			? input.children.flatMap((child) => {
					const parsed = parseNode(child);
					return parsed ? [parsed] : [];
				})
			: [],
		errors: Array.isArray(input.errors)
			? input.errors.filter((e): e is string => typeof e === 'string')
			: [],
	};
}

export function parseHtmlProbeResult(raw: unknown): HtmlProbeResult {
	const root = parseNode(raw);
	if (!root) return { ok: false, error: 'HTML probe returned malformed data' };
	return { ok: true, root };
}
