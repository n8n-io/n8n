import type { BaseTextKey } from '@n8n/i18n';

import checklistSource from './examples/checklist.view.js?raw';
import integrationsSource from './examples/integrations.view.js?raw';
import pageSummarySource from './examples/pageSummary.view.js?raw';
import { BUILTIN_PAGE_SUMMARY_VIEW_ID } from './ui-extensions.constants';

/** A string that a built-in view reads with `n8n.t(key, params)`, and its placeholders. */
export type BuiltinViewString = { key: BaseTextKey; params?: readonly string[] };

/** A view that ships with n8n. It gets the full page context and translated strings. */
export type BuiltinViewDefinition = {
	id: string;
	titleKey: BaseTextKey;
	icon: string;
	source: string;
	strings: readonly BuiltinViewString[];
};

const hiddenWorkflow: BuiltinViewString = { key: 'uiExtensions.view.hiddenWorkflow' };

export const BUILTIN_VIEWS: readonly BuiltinViewDefinition[] = [
	{
		id: BUILTIN_PAGE_SUMMARY_VIEW_ID,
		titleKey: 'uiExtensions.pageSummary.title',
		icon: 'file-text',
		source: pageSummarySource,
		strings: [
			hiddenWorkflow,
			{ key: 'uiExtensions.pageSummary.workflow.active' },
			{ key: 'uiExtensions.pageSummary.workflow.inactive' },
			{ key: 'uiExtensions.pageSummary.stats.nodes' },
			{ key: 'uiExtensions.pageSummary.stats.triggers' },
			{ key: 'uiExtensions.pageSummary.stats.services' },
			{ key: 'uiExtensions.pageSummary.stats.disabled' },
			{ key: 'uiExtensions.pageSummary.triggers.heading' },
			{ key: 'uiExtensions.pageSummary.triggers.empty' },
			{ key: 'uiExtensions.pageSummary.workflows.heading' },
			{ key: 'uiExtensions.pageSummary.workflows.total' },
			{ key: 'uiExtensions.pageSummary.workflows.hint' },
			{ key: 'uiExtensions.pageSummary.other.heading' },
			{ key: 'uiExtensions.pageSummary.other.hint' },
		],
	},
	{
		id: 'builtin:integrations',
		titleKey: 'uiExtensions.integrations.title',
		icon: 'plug',
		source: integrationsSource,
		strings: [
			hiddenWorkflow,
			{ key: 'uiExtensions.integrations.heading' },
			{ key: 'uiExtensions.integrations.summary', params: ['services', 'nodes'] },
			{ key: 'uiExtensions.integrations.trigger' },
			{ key: 'uiExtensions.integrations.empty' },
			{ key: 'uiExtensions.integrations.noServices' },
			{ key: 'uiExtensions.integrations.builtinHeading' },
			{ key: 'uiExtensions.integrations.openWorkflow' },
		],
	},
	{
		id: 'builtin:checklist',
		titleKey: 'uiExtensions.checklist.title',
		icon: 'list-checks',
		source: checklistSource,
		strings: [
			hiddenWorkflow,
			{ key: 'uiExtensions.checklist.heading' },
			{ key: 'uiExtensions.checklist.score', params: ['passed', 'total'] },
			{ key: 'uiExtensions.checklist.allPass' },
			{ key: 'uiExtensions.checklist.openWorkflow' },
			{ key: 'uiExtensions.checklist.trigger.title' },
			{ key: 'uiExtensions.checklist.trigger.help' },
			{ key: 'uiExtensions.checklist.errorWorkflow.title' },
			{ key: 'uiExtensions.checklist.errorWorkflow.help' },
			{ key: 'uiExtensions.checklist.disabled.title' },
			{ key: 'uiExtensions.checklist.disabled.help', params: ['count'] },
			{ key: 'uiExtensions.checklist.names.title' },
			{ key: 'uiExtensions.checklist.names.help', params: ['count'] },
			{ key: 'uiExtensions.checklist.notes.title' },
			{ key: 'uiExtensions.checklist.notes.help' },
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
