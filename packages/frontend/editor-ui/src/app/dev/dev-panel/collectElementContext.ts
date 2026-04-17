import type { ChannelPromptBody } from './channelClient';

const INSPECTOR_ATTR = 'data-v-inspector';
const OUTER_HTML_MAX = 500;

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
	const classes = Array.from(el.classList).slice(0, 3).join('.');
	return classes ? `${tag}.${classes}` : tag;
}

export function collectElementContext(el: Element): Omit<ChannelPromptBody, 'prompt'> {
	const inspector = findInspectorPath(el);
	const parsed = inspector ? parseInspectorPath(inspector) : {};
	const outerHtml = el.outerHTML.slice(0, OUTER_HTML_MAX);

	return {
		...parsed,
		testid: findTestId(el),
		component: findComponentName(el),
		selector: buildSelector(el),
		classes: Array.from(el.classList),
		outerHtmlSnippet: outerHtml,
	};
}
