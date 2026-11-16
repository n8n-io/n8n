import { i18nInstance, useI18n } from '@n8n/i18n';

import {
	hiddenWorkflowPage,
	listPage,
	node,
	otherPage,
	panelData,
	renderBuiltinView,
	run,
	serviceNode,
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

	it('starts with Recent runs, and only the two data views ask for data', () => {
		expect(BUILTIN_VIEWS.map((view) => [view.id, view.usesData])).toEqual([
			['builtin:recent-runs', true],
			['builtin:service-data', true],
			['builtin:arcade', false],
		]);
	});

	it.each(BUILTIN_VIEWS.map((view) => [view.id]))(
		'%s only translates keys that the host sends it',
		(id) => {
			const failedNode = serviceNode({
				lastRun: {
					executionId: '1',
					status: 'error',
					finishedAt: null,
					itemCount: 0,
					items: [],
					error: 'Bad request',
				},
			});
			const statuses = [
				'success',
				'error',
				'crashed',
				'canceled',
				'running',
				'waiting',
				'new',
				'unknown',
			] as const;
			const modes = [
				'manual',
				'trigger',
				'webhook',
				'retry',
				'error',
				'integrated',
				'chat',
				'evaluation',
				'cli',
			];
			const fullData = panelData({
				runs: {
					scope: 'workflow',
					items: statuses.map((status, index) =>
						run(String(index), { status, mode: modes[index] }),
					),
					lastError: { nodeName: 'A', message: 'Failed' },
				},
				services: [
					serviceNode(),
					failedNode,
					serviceNode({
						nodeName: 'B',
						resource: undefined,
						lastRun: null,
						credentialName: undefined,
					}),
				],
			});
			const cases = [
				[workflowPage([node('A', 'Slack', { isService: true })]), fullData],
				[
					workflowPage([]),
					panelData({
						runs: { scope: 'workflow', items: [], lastError: { message: 'x' } },
						services: [],
					}),
				],
				[workflowPage([]), panelData({ state: 'loading' })],
				[workflowPage([]), panelData({ state: 'error' })],
				[workflowPage([]), null],
				[hiddenWorkflowPage, null],
				[listPage, panelData({ runs: { scope: 'all', items: [run('1')] } })],
				[listPage, panelData({ runs: { scope: 'all', items: [] } })],
				[otherPage, panelData()],
			] as const;
			for (const [context, data] of cases) {
				const { usedKeys, strings, unmount } = renderBuiltinView(id, context, data);
				for (const key of usedKeys) expect(Object.keys(strings), key).toContain(key);
				unmount();
			}
		},
	);
});
