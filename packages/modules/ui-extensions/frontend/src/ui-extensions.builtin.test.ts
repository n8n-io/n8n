import { i18nInstance, useI18n } from '@n8n/i18n';

import {
	hiddenWorkflowPage,
	listPage,
	node,
	otherPage,
	overview,
	overviewService,
	panelData,
	renderBuiltinView,
	run,
	serviceNode,
	workflowPage,
} from './__tests__/render-builtin-view';
import {
	BUILTIN_PAGES,
	BUILTIN_VIEWS,
	builtinViewStrings,
	getBuiltinView,
} from './ui-extensions.builtin';

const ALL_BUILTINS = [...BUILTIN_VIEWS, ...BUILTIN_PAGES];

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('built-in views', () => {
	it('have unique ids in the builtin namespace', () => {
		const ids = ALL_BUILTINS.map((view) => view.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids.every((id) => id.startsWith('builtin:'))).toBe(true);
	});

	it.each(ALL_BUILTINS.map((view) => [view.id, view]))(
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

	it.each(ALL_BUILTINS.map((view) => [view.id, view]))(
		'%s keeps the placeholders in the strings that the host sends',
		(_id, view) => {
			const i18n = useI18n();
			const strings = builtinViewStrings(view, (key, options) => i18n.baseText(key, options));
			for (const { key, params = [] } of view.strings) {
				for (const param of params) expect(strings[key], key).toContain(`{${param}}`);
			}
		},
	);

	it('finds a built-in page by its id, so the frame gets its strings', () => {
		expect(getBuiltinView('builtin:services-overview')).toBe(BUILTIN_PAGES[0]);
		expect(getBuiltinView('builtin:recent-runs')).toBe(BUILTIN_VIEWS[0]);
		expect(getBuiltinView('missing')).toBeUndefined();
	});

	it('ships the Services overview page, which asks for data', () => {
		expect(BUILTIN_PAGES.map((p) => [p.id, p.usesData])).toEqual([
			['builtin:services-overview', true],
		]);
	});

	it('Services overview only translates keys that the host sends it', () => {
		const statuses = ['success', 'error', 'crashed', 'canceled', 'running', 'waiting'] as const;
		const cases = [
			panelData({
				overview: overview({
					workflows: { total: 300, active: 10, scanned: 200 },
					services: [
						overviewService(),
						overviewService({
							nodeType: 'x',
							workflowCount: 1,
							health: 'failing',
							accounts: [],
							workflows: statuses.map((status, index) => ({
								id: String(index),
								name: index === 0 ? '' : `W${index}`,
								active: index % 2 === 0,
								lastRun: { status, stoppedAt: null },
							})),
						}),
						overviewService({ nodeType: 'y', health: 'unknown' }),
					],
				}),
			}),
			panelData({ overview: overview({ services: [], failures: [] }) }),
			panelData({ overview: overview({ runs: { scanned: 0, succeeded: 0, failed: 0 } }) }),
			panelData({ state: 'loading' }),
			panelData({ state: 'error' }),
			panelData(),
			null,
		];
		for (const data of cases) {
			const { usedKeys, strings, unmount } = renderBuiltinView(
				'builtin:services-overview',
				otherPage,
				data,
			);
			for (const key of usedKeys) expect(Object.keys(strings), key).toContain(key);
			unmount();
		}
	});

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
