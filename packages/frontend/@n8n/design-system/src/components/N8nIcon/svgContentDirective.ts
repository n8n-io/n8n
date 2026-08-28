import type { Directive } from 'vue';

/**
 * Custom directive that safely renders SVG child elements from a body string.
 *
 * Parses the body via DOMParser (no script execution) and imports only the
 * resulting child nodes into the host `<svg>` element. This avoids Vue's
 * `v-html` directive while keeping the same visual result.
 *
 * Usage: `<svg v-svg-content="bodyString" />`
 */
export const vSvgContent: Directive<SVGElement, string | null | undefined> = {
	mounted(el, { value }) {
		if (value) setSvgChildren(el, value);
	},
	updated(el, { value, oldValue }) {
		if (value !== oldValue) setSvgChildren(el, value ?? null);
	},
};

function setSvgChildren(el: SVGElement, body: string | null): void {
	while (el.firstChild) el.removeChild(el.firstChild);
	if (!body) return;

	const doc = new DOMParser().parseFromString(
		`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`,
		'image/svg+xml',
	);

	if (doc.querySelector('parsererror')) return;

	const ownerDoc = el.ownerDocument;
	for (const child of Array.from(doc.documentElement.childNodes)) {
		el.appendChild(ownerDoc.importNode(child, true));
	}
}
