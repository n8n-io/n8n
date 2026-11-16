import type { BaseTextKey } from '@n8n/i18n';

import recentRunsSource from './examples/recentRuns.view.js?raw';
import serviceDataSource from './examples/serviceData.view.js?raw';
import { BUILTIN_RECENT_RUNS_VIEW_ID } from './ui-extensions.constants';

/** A string that a built-in view reads with `n8n.t(key, params)`, and its placeholders. */
export type BuiltinViewString = { key: BaseTextKey; params?: readonly string[] };

/** A view that ships with n8n. It gets the full page context and translated strings. */
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
		],
	},
];

export function getBuiltinView(id: string): BuiltinViewDefinition | undefined {
	return BUILTIN_VIEWS.find((view) => view.id === id);
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
