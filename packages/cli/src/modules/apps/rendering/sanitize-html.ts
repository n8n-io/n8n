import xss from 'xss';

/** `data-*` hooks the editor needs to place its content editor into a layout preview. */
const GLOBAL_ATTRS = ['class', 'id', 'title', 'data-block-id', 'data-app-slot'];

/** Every element the `html` block may render, and the attributes each one keeps. */
const ALLOWED_TAGS: Record<string, string[]> = {
	a: [...GLOBAL_ATTRS, 'href', 'target', 'rel'],
	abbr: GLOBAL_ATTRS,
	article: GLOBAL_ATTRS,
	aside: GLOBAL_ATTRS,
	b: GLOBAL_ATTRS,
	blockquote: GLOBAL_ATTRS,
	br: GLOBAL_ATTRS,
	button: [...GLOBAL_ATTRS, 'type', 'disabled'],
	code: GLOBAL_ATTRS,
	dd: GLOBAL_ATTRS,
	div: GLOBAL_ATTRS,
	dl: GLOBAL_ATTRS,
	dt: GLOBAL_ATTRS,
	em: GLOBAL_ATTRS,
	footer: GLOBAL_ATTRS,
	h1: GLOBAL_ATTRS,
	h2: GLOBAL_ATTRS,
	h3: GLOBAL_ATTRS,
	h4: GLOBAL_ATTRS,
	h5: GLOBAL_ATTRS,
	h6: GLOBAL_ATTRS,
	header: GLOBAL_ATTRS,
	hr: GLOBAL_ATTRS,
	i: GLOBAL_ATTRS,
	img: [...GLOBAL_ATTRS, 'src', 'alt', 'width', 'height'],
	li: GLOBAL_ATTRS,
	main: GLOBAL_ATTRS,
	nav: GLOBAL_ATTRS,
	ol: GLOBAL_ATTRS,
	p: GLOBAL_ATTRS,
	pre: GLOBAL_ATTRS,
	section: GLOBAL_ATTRS,
	small: GLOBAL_ATTRS,
	span: GLOBAL_ATTRS,
	strong: GLOBAL_ATTRS,
	sub: GLOBAL_ATTRS,
	sup: GLOBAL_ATTRS,
	table: GLOBAL_ATTRS,
	tbody: GLOBAL_ATTRS,
	td: [...GLOBAL_ATTRS, 'colspan', 'rowspan'],
	tfoot: GLOBAL_ATTRS,
	th: [...GLOBAL_ATTRS, 'colspan', 'rowspan'],
	thead: GLOBAL_ATTRS,
	tr: GLOBAL_ATTRS,
	u: GLOBAL_ATTRS,
	ul: GLOBAL_ATTRS,
};

const ALLOWED_HREF_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

const isRelativePath = (value: string) =>
	value.startsWith('/') || value.startsWith('#') || value.startsWith('?');

const isAllowedHref = (value: string): boolean => {
	if (isRelativePath(value)) return true;
	try {
		return ALLOWED_HREF_PROTOCOLS.has(new URL(value).protocol);
	} catch {
		return false;
	}
};

const isAllowedSrc = (value: string): boolean => {
	try {
		return new URL(value).protocol === 'https:';
	} catch {
		return false;
	}
};

/** What the editor's inline toolbar can produce inside a text block: bold, italic, links, line breaks, inline code. */
const INLINE_TAGS: Record<string, string[]> = {
	a: ['href', 'target', 'rel'],
	b: [],
	strong: [],
	i: [],
	em: [],
	u: [],
	s: [],
	mark: [],
	code: [],
	br: [],
};

/**
 * Form controls the layout preview keeps, inert: no `action`, `formaction`
 * or handler attribute is listed, so nothing in the editor can submit or run.
 */
const LAYOUT_PREVIEW_TAGS: Record<string, string[]> = {
	...ALLOWED_TAGS,
	form: GLOBAL_ATTRS,
	label: [...GLOBAL_ATTRS, 'for'],
	input: [
		...GLOBAL_ATTRS,
		'type',
		'name',
		'value',
		'placeholder',
		'disabled',
		'checked',
		'required',
		'step',
	],
	select: [...GLOBAL_ATTRS, 'name', 'disabled', 'required', 'multiple'],
	option: [...GLOBAL_ATTRS, 'value', 'selected'],
	textarea: [...GLOBAL_ATTRS, 'name', 'placeholder', 'disabled', 'required', 'rows'],
};

const sanitize = (
	dirty: string,
	whiteList: Record<string, string[]>,
	stripBodyOf = ['script', 'style', 'iframe', 'form'],
): string =>
	xss(dirty, {
		whiteList,
		stripIgnoreTag: true,
		stripIgnoreTagBody: stripBodyOf,
		onTagAttr(_tag, name, value) {
			if (name === 'href') return isAllowedHref(value) ? undefined : '';
			if (name === 'src') return isAllowedSrc(value) ? undefined : '';
			return undefined;
		},
	});

/**
 * Sanitizes the `html` block's rendered output. `code` block output is never
 * routed through here — it is inserted as-is, by design.
 */
export const sanitizeHtml = (dirty: string): string => sanitize(dirty, ALLOWED_TAGS);

/**
 * Sanitizes a rendered layout for the editor's own origin, where it is inserted
 * with `v-html`: everything the `html` block may keep plus inert form controls.
 */
export const sanitizeLayoutPreviewHtml = (dirty: string): string =>
	sanitize(dirty, LAYOUT_PREVIEW_TAGS, ['script', 'style', 'iframe']);

/** Sanitizes the text of a `paragraph`, `header` or `list` block down to inline formatting. */
export const sanitizeInlineHtml = (dirty: string): string => sanitize(dirty, INLINE_TAGS);
