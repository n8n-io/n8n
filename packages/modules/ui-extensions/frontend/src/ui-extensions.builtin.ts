import type { BaseTextKey } from '@n8n/i18n';

import arcadeSource from './examples/arcade.view.js?raw';
import recentRunsSource from './examples/recentRuns.view.js?raw';
import serviceDataSource from './examples/serviceData.view.js?raw';
import automationDashboardSource from './examples/automationDashboard.view.js?raw';
import notionDocsSource from './examples/notionDocs.view.js?raw';
import {
	BUILTIN_RECENT_RUNS_VIEW_ID,
	BUILTIN_AUTOMATION_DASHBOARD_PAGE_ID,
	BUILTIN_NOTION_DOCS_PAGE_ID,
} from './ui-extensions.constants';

/** A string that a built-in view reads with `n8n.t(key, params)`, and its placeholders. */
export type BuiltinViewString = { key: BaseTextKey; params?: readonly string[] };

/** A view or a page that ships with n8n. It gets the full page context and translated strings. */
export type BuiltinViewDefinition = {
	id: string;
	titleKey: BaseTextKey;
	icon: string;
	source: string;
	strings: readonly BuiltinViewString[];
	/** Whether the view shows run and service data, so the editor fetches it while the view is open. */
	usesData: boolean;
};

const loadStates: readonly BuiltinViewString[] = [
	{ key: 'uiExtensions.view.refresh' },
	{ key: 'uiExtensions.view.loading' },
	{ key: 'uiExtensions.view.loadError' },
	{ key: 'uiExtensions.view.retry' },
];

const runStatuses: readonly BuiltinViewString[] = [
	{ key: 'uiExtensions.recentRuns.status.success' },
	{ key: 'uiExtensions.recentRuns.status.error' },
	{ key: 'uiExtensions.recentRuns.status.crashed' },
	{ key: 'uiExtensions.recentRuns.status.canceled' },
	{ key: 'uiExtensions.recentRuns.status.running' },
	{ key: 'uiExtensions.recentRuns.status.waiting' },
	{ key: 'uiExtensions.recentRuns.status.new' },
	{ key: 'uiExtensions.recentRuns.status.unknown' },
];

export const BUILTIN_VIEWS: readonly BuiltinViewDefinition[] = [
	{
		id: BUILTIN_RECENT_RUNS_VIEW_ID,
		titleKey: 'uiExtensions.recentRuns.title',
		icon: 'history',
		source: recentRunsSource,
		usesData: true,
		strings: [
			...loadStates,
			...runStatuses,
			{ key: 'uiExtensions.recentRuns.title' },
			{ key: 'uiExtensions.recentRuns.allWorkflows' },
			{ key: 'uiExtensions.recentRuns.otherPage' },
			{ key: 'uiExtensions.recentRuns.empty.workflow' },
			{ key: 'uiExtensions.recentRuns.empty.all' },
			{ key: 'uiExtensions.recentRuns.lastError', params: ['node'] },
			{ key: 'uiExtensions.recentRuns.lastErrorNoNode' },
			{ key: 'uiExtensions.recentRuns.openRun' },
			{ key: 'uiExtensions.recentRuns.mode.manual' },
			{ key: 'uiExtensions.recentRuns.mode.trigger' },
			{ key: 'uiExtensions.recentRuns.mode.webhook' },
			{ key: 'uiExtensions.recentRuns.mode.retry' },
			{ key: 'uiExtensions.recentRuns.mode.error' },
			{ key: 'uiExtensions.recentRuns.mode.integrated' },
			{ key: 'uiExtensions.recentRuns.mode.chat' },
			{ key: 'uiExtensions.recentRuns.mode.evaluation' },
			{ key: 'uiExtensions.recentRuns.summary.runs' },
			{ key: 'uiExtensions.recentRuns.summary.successRate' },
			{ key: 'uiExtensions.recentRuns.summary.averageDuration' },
			{ key: 'uiExtensions.recentRuns.summary.longestDuration' },
			{ key: 'uiExtensions.recentRuns.summary.noValue' },
			{ key: 'uiExtensions.recentRuns.chart.title' },
			{ key: 'uiExtensions.recentRuns.chart.bar', params: ['status', 'duration'] },
			{ key: 'uiExtensions.recentRuns.chart.barNoTime', params: ['status'] },
			{ key: 'uiExtensions.recentRuns.unnamedWorkflow' },
			{ key: 'uiExtensions.recentRuns.topWorkflows.title' },
			{ key: 'uiExtensions.recentRuns.topWorkflows.runs', params: ['count'] },
			{ key: 'uiExtensions.recentRuns.topWorkflows.failures', params: ['count'] },
		],
	},
	{
		id: 'builtin:service-data',
		titleKey: 'uiExtensions.serviceData.title',
		icon: 'database',
		source: serviceDataSource,
		usesData: true,
		strings: [
			...loadStates,
			...runStatuses,
			{ key: 'uiExtensions.serviceData.title' },
			{ key: 'uiExtensions.serviceData.openWorkflow' },
			{ key: 'uiExtensions.serviceData.empty' },
			{ key: 'uiExtensions.serviceData.action', params: ['resource', 'operation'] },
			{ key: 'uiExtensions.serviceData.target', params: ['label', 'name'] },
			{ key: 'uiExtensions.serviceData.openTarget', params: ['name'] },
			{ key: 'uiExtensions.serviceData.account', params: ['name'] },
			{ key: 'uiExtensions.serviceData.noRun' },
			{ key: 'uiExtensions.serviceData.items', params: ['count'] },
			{ key: 'uiExtensions.serviceData.noItems' },
			{ key: 'uiExtensions.serviceData.summary.services' },
			{ key: 'uiExtensions.serviceData.summary.accounts' },
			{ key: 'uiExtensions.serviceData.summary.items' },
			{ key: 'uiExtensions.serviceData.duration', params: ['duration'] },
			{ key: 'uiExtensions.serviceData.fields' },
			{ key: 'uiExtensions.serviceData.moreFields', params: ['count'] },
		],
	},
	{
		id: 'builtin:arcade',
		titleKey: 'uiExtensions.arcade.title',
		icon: 'zap',
		source: arcadeSource,
		usesData: false,
		strings: [
			{ key: 'uiExtensions.arcade.heading' },
			{ key: 'uiExtensions.arcade.subtitle' },
			{ key: 'uiExtensions.arcade.play' },
			{ key: 'uiExtensions.arcade.playAgain' },
			{ key: 'uiExtensions.arcade.resume' },
			{ key: 'uiExtensions.arcade.hint' },
			{ key: 'uiExtensions.arcade.score', params: ['score'] },
			{ key: 'uiExtensions.arcade.best', params: ['best'] },
			{ key: 'uiExtensions.arcade.gameOver' },
			{ key: 'uiExtensions.arcade.paused' },
			{ key: 'uiExtensions.arcade.canvas' },
		],
	},
];

/** Pages of the main sidebar that ship with n8n. They run in the same frame as views. */
export const BUILTIN_PAGES: readonly BuiltinViewDefinition[] = [
	{
		id: BUILTIN_AUTOMATION_DASHBOARD_PAGE_ID,
		titleKey: 'uiExtensions.automationDashboard.title',
		icon: 'plug',
		source: automationDashboardSource,
		usesData: true,
		strings: [
			...loadStates,
			...runStatuses,
			{ key: 'uiExtensions.automationDashboard.title' },
			{ key: 'uiExtensions.automationDashboard.subtitle' },
			{ key: 'uiExtensions.automationDashboard.summary.workflows' },
			{ key: 'uiExtensions.automationDashboard.summary.active', params: ['count'] },
			{ key: 'uiExtensions.automationDashboard.summary.services' },
			{ key: 'uiExtensions.automationDashboard.summary.accountsCount', params: ['count'] },
			{ key: 'uiExtensions.automationDashboard.summary.averageDuration' },
			{ key: 'uiExtensions.automationDashboard.summary.longest', params: ['duration'] },
			{ key: 'uiExtensions.automationDashboard.summary.successRate' },
			{ key: 'uiExtensions.automationDashboard.summary.runs', params: ['count'] },
			{ key: 'uiExtensions.automationDashboard.summary.runsOne' },
			{ key: 'uiExtensions.automationDashboard.services' },
			{ key: 'uiExtensions.automationDashboard.usedIn', params: ['count', 'active'] },
			{ key: 'uiExtensions.automationDashboard.usedInOne', params: ['active'] },
			{ key: 'uiExtensions.automationDashboard.health.ok' },
			{ key: 'uiExtensions.automationDashboard.health.failing' },
			{ key: 'uiExtensions.automationDashboard.health.unknown' },
			{ key: 'uiExtensions.automationDashboard.accounts' },
			{ key: 'uiExtensions.automationDashboard.openWorkflow' },
			{ key: 'uiExtensions.automationDashboard.noRun' },
			{ key: 'uiExtensions.automationDashboard.failures' },
			{ key: 'uiExtensions.automationDashboard.activity' },
			{ key: 'uiExtensions.automationDashboard.attention.title' },
			{ key: 'uiExtensions.automationDashboard.attention.failures', params: ['count', 'runs'] },
			{ key: 'uiExtensions.automationDashboard.attention.lastFailed', params: ['time'] },
			{ key: 'uiExtensions.automationDashboard.attention.empty' },
			{ key: 'uiExtensions.recentRuns.chart.title' },
			{ key: 'uiExtensions.recentRuns.chart.bar', params: ['status', 'duration'] },
			{ key: 'uiExtensions.recentRuns.chart.barNoTime', params: ['status'] },
			{ key: 'uiExtensions.automationDashboard.empty.title' },
			{ key: 'uiExtensions.automationDashboard.empty.hint' },
			{ key: 'uiExtensions.automationDashboard.partial', params: ['count'] },
			{ key: 'uiExtensions.recentRuns.summary.noValue' },
			{ key: 'uiExtensions.recentRuns.unnamedWorkflow' },
			{ key: 'uiExtensions.recentRuns.openRun' },
		],
	},
	{
		id: BUILTIN_NOTION_DOCS_PAGE_ID,
		titleKey: 'uiExtensions.notionDocs.title',
		icon: 'book-open',
		source: notionDocsSource,
		// The documents are sample data in the page, so the editor fetches nothing for it.
		usesData: false,
		strings: [
			{ key: 'uiExtensions.notionDocs.workspace' },
			{ key: 'uiExtensions.notionDocs.documents' },
			{ key: 'uiExtensions.notionDocs.sample' },
			{ key: 'uiExtensions.notionDocs.synced', params: ['time'] },
			{ key: 'uiExtensions.notionDocs.syncing' },
			{ key: 'uiExtensions.notionDocs.sync' },
			{ key: 'uiExtensions.notionDocs.open' },
			{ key: 'uiExtensions.notionDocs.owner' },
			{ key: 'uiExtensions.notionDocs.edited' },
			{ key: 'uiExtensions.notionDocs.tags' },
			{ key: 'uiExtensions.notionDocs.tasks' },
			{ key: 'uiExtensions.notionDocs.tasksDone', params: ['done', 'total'] },
		],
	},
];

/** A built-in view or page by its ID. */
export function getBuiltinView(id: string): BuiltinViewDefinition | undefined {
	return BUILTIN_VIEWS.find((view) => view.id === id) ?? BUILTIN_PAGES.find((p) => p.id === id);
}

/**
 * The translated strings of a built-in view. Each placeholder stays as
 * `{name}`, because the view fills it with `n8n.t(key, params)`.
 */
export function builtinViewStrings(
	view: BuiltinViewDefinition,
	baseText: (key: BaseTextKey, options?: { interpolate?: Record<string, string> }) => string,
): Record<string, string> {
	return Object.fromEntries(
		view.strings.map(({ key, params }) => [
			key,
			params?.length
				? baseText(key, {
						interpolate: Object.fromEntries(params.map((param) => [param, `{${param}}`])),
					})
				: baseText(key),
		]),
	);
}
