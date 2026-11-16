import { i18nInstance, useI18n } from '@n8n/i18n';

import {
	hiddenWorkflowPage,
	listPage,
	node,
	otherPage,
	renderBuiltinView,
	workflowPage,
} from './__tests__/render-builtin-view';
import { BUILTIN_VIEWS, builtinViewStrings } from './ui-extensions.builtin';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('built-in views', () => {
	it('have unique ids in the builtin namespace', () => {
		const ids = BUILTIN_VIEWS.map((view) => view.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids.every((id) => id.startsWith('builtin:'))).toBe(true);
	});

	it.each(BUILTIN_VIEWS.map((view) => [view.id, view]))(
		'%s lists the placeholders that each English string has',
		(_id, view) => {
			const messages: Record<string, unknown> = i18nInstance.global.getLocaleMessage('en');
			for (const { key, params = [] } of view.strings) {
				const text = messages[key];
				expect(typeof text, key).toBe('string');
				expect(placeholders(String(text)), key).toEqual([...params].sort());
			}
		},
	);

	it.each(BUILTIN_VIEWS.map((view) => [view.id, view]))(
		'%s keeps the placeholders in the strings that the host sends',
		(_id, view) => {
			const i18n = useI18n();
			const strings = builtinViewStrings(view, (key, options) => i18n.baseText(key, options));
			for (const { key, params = [] } of view.strings) {
				for (const param of params) expect(strings[key], key).toContain(`{${param}}`);
			}
		},
	);

	it.each(BUILTIN_VIEWS.map((view) => [view.id]))(
		'%s only translates keys that the host sends it',
		(id) => {
			const contexts = [
				workflowPage([node('A', 'HTTP Request')]),
				workflowPage([node('B', 'Webhook', { isTrigger: true })], { hasErrorWorkflow: true }),
				hiddenWorkflowPage,
				listPage,
				otherPage,
			];
			for (const context of contexts) {
				const { usedKeys, strings, unmount } = renderBuiltinView(id, context);
				for (const key of usedKeys) expect(Object.keys(strings), key).toContain(key);
				unmount();
			}
		},
	);
});
