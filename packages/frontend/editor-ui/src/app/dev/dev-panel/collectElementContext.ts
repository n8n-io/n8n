const INSPECTOR_ATTR = 'data-v-inspector';
const OUTER_HTML_MAX = 500;
const DOM_PATH_MAX_DEPTH = 6;
const SUMMARY_TEXT_MAX = 60;
const CSS_MODULE_HASH_RE = /^_(.+)_[a-z0-9]+_\d+$/;

function normalizeClassName(name: string): string {
	const match = CSS_MODULE_HASH_RE.exec(name);
	return match ? match[1] : name;
}

function getReadableClasses(el: Element): string[] {
	return Array.from(el.classList).map(normalizeClassName);
}

export type ElementContext = {
	file?: string;
	line?: number;
	col?: number;
	testid?: string;
	component?: string;
	selector?: string;
	classes?: string[];
	outerHtmlSnippet?: string;
	domPath?: string;
	summary?: string;
};

type VueAttachedElement = Element & {
	__vueParentComponent?: { type?: { __name?: string; name?: string } };
};

function findInspectorPath(el: Element): string | undefined {
	let current: Element | null = el;
	while (current) {
		const attr = current.getAttribute(INSPECTOR_ATTR);
		if (attr) return attr;
		current = current.parentElement;
	}
	return undefined;
}

function parseInspectorPath(path: string): { file: string; line?: number; col?: number } {
	const parts = path.split(':');
	if (parts.length >= 3) {
		return {
			file: parts.slice(0, -2).join(':'),
			line: Number(parts.at(-2)),
			col: Number(parts.at(-1)),
		};
	}
	return { file: path };
}

function findTestId(el: Element): string | undefined {
	let current: Element | null = el;
	while (current) {
		const attr = current.getAttribute('data-testid');
		if (attr) return attr;
		current = current.parentElement;
	}
	return undefined;
}

function findComponentName(el: Element): string | undefined {
	let current: Element | null = el;
	while (current) {
		const component = (current as VueAttachedElement).__vueParentComponent;
		const name = component?.type?.__name ?? component?.type?.name;
		if (name) return name;
		current = current.parentElement;
	}
	return undefined;
}

function buildSelector(el: Element): string {
	if (el.id) return `#${el.id}`;
	const testId = el.getAttribute('data-testid');
	if (testId) return `[data-testid="${testId}"]`;
	const tag = el.tagName.toLowerCase();
	const classes = getReadableClasses(el).slice(0, 3).join('.');
	return classes ? `${tag}.${classes}` : tag;
}

function describeSegment(el: Element): string {
	const tag = el.tagName.toLowerCase();
	if (el.id) return `#${el.id}`;
	const testid = el.getAttribute('data-testid');
	if (testid) return `[data-testid="${testid}"]`;
	const firstClass = getReadableClasses(el)[0];
	if (firstClass) return `${tag}.${firstClass}`;
	return tag;
}

function buildDomPath(el: Element): string {
	const parts: string[] = [];
	let current: Element | null = el;
	let depth = 0;
	while (current && depth < DOM_PATH_MAX_DEPTH) {
		if (current.tagName === 'BODY' || current.tagName === 'HTML') break;
		parts.unshift(describeSegment(current));
		current = current.parentElement;
		depth += 1;
	}
	return parts.join(' > ');
}

function extractText(el: Element): string | undefined {
	const text = el.textContent?.replace(/\s+/g, ' ').trim();
	if (!text) return undefined;
	return text.length > SUMMARY_TEXT_MAX ? `${text.slice(0, SUMMARY_TEXT_MAX)}…` : text;
}

function buildSummary(el: Element, component?: string): string {
	const tag = el.tagName.toLowerCase();
	const prefix = component ? `<${component}> ` : '';

	if (tag === 'svg' || el.closest('svg') !== null) {
		return `${prefix}icon`;
	}
	if (tag === 'img') {
		const alt = el.getAttribute('alt');
		return alt ? `${prefix}image "${alt}"` : `${prefix}image`;
	}
	if (tag === 'input' || tag === 'textarea' || tag === 'select') {
		const label = el.getAttribute('aria-label') ?? el.getAttribute('placeholder');
		return label ? `${prefix}${tag} "${label}"` : `${prefix}${tag}`;
	}

	const text = extractText(el);
	return text ? `${prefix}${tag} "${text}"` : `${prefix}${tag}`;
}

export function collectElementContext(el: Element): ElementContext {
	const inspector = findInspectorPath(el);
	const parsed = inspector ? parseInspectorPath(inspector) : {};
	const component = findComponentName(el);

	return {
		...parsed,
		testid: findTestId(el),
		component,
		selector: buildSelector(el),
		classes: getReadableClasses(el),
		outerHtmlSnippet: el.outerHTML.slice(0, OUTER_HTML_MAX),
		domPath: buildDomPath(el),
		summary: buildSummary(el, component),
	};
}
