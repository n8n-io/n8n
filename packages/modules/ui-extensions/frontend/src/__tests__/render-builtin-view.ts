import {
	UI_EXTENSION_VIEW_FACTORY_GLOBAL,
	type UiExtensionOverviewData,
	type UiExtensionPageContext,
	type UiExtensionPanelData,
	type UiExtensionRun,
	type UiExtensionServiceNodeData,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nTag,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { render } from '@testing-library/vue';
import { runInNewContext } from 'node:vm';
import * as Vue from 'vue';

import { builtinViewStrings, getBuiltinView } from '../ui-extensions.builtin';
import { viewSourceToScript } from '../ui-extensions.frame';

/** A call that a view made to `refresh`, `openExecution`, `openWorkflow` or `openUrl`. */
export type ViewAction =
	| { type: 'refresh' }
	| { type: 'openExecution'; workflowId: string; executionId: string }
	| { type: 'openWorkflow'; workflowId: string }
	| { type: 'openUrl'; url: string };

/**
 * Renders a built-in view the way the frame does: the view script with the two
 * globals, the English strings that the host sends, and the components that the
 * view runtime registers. `usedKeys` collects every key that the view translates,
 * and `actions` collects the calls that the view makes to the editor.
 */
export function renderBuiltinView(
	id: string,
	initial: UiExtensionPageContext,
	initialData: UiExtensionPanelData | null = null,
) {
	const definition = getBuiltinView(id);
	if (!definition) throw new Error(`No built-in view ${id}`);

	const i18n = useI18n();
	const strings = builtinViewStrings(definition, (key, options) => i18n.baseText(key, options));
	const usedKeys = new Set<string>();
	const actions: ViewAction[] = [];
	const context = Vue.ref(initial);
	const data = Vue.ref(initialData);
	const n8n = {
		useContext: () => Vue.computed(() => context.value),
		useData: () => Vue.computed(() => data.value),
		useLocale: () => Vue.computed(() => 'en'),
		t: (key: string, params: Record<string, string | number> = {}) => {
			usedKeys.add(key);
			const text = strings[key] ?? key;
			return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
				name in params ? String(params[name]) : placeholder,
			);
		},
		refresh: () => actions.push({ type: 'refresh' }),
		openExecution: (workflowId: string, executionId: string) =>
			actions.push({ type: 'openExecution', workflowId, executionId }),
		openWorkflow: (workflowId: string) => actions.push({ type: 'openWorkflow', workflowId }),
		openUrl: (url: string) => actions.push({ type: 'openUrl', url }),
	};

	// The test's window, document and `Date` go in, so the view's listeners and
	// animation frames reach the test, and fake timers reach the view.
	const frameWindow = window as unknown as Record<string, unknown>;
	runInNewContext(viewSourceToScript(definition.source), { window, document, Date });
	const factory = frameWindow[UI_EXTENSION_VIEW_FACTORY_GLOBAL] as (
		vue: typeof Vue,
		api: typeof n8n,
	) => Vue.Component;
	delete frameWindow[UI_EXTENSION_VIEW_FACTORY_GLOBAL];

	const result = render(factory(Vue, n8n), {
		global: {
			components: {
				N8nBadge,
				N8nButton,
				N8nCallout,
				N8nCard,
				N8nHeading,
				N8nIcon,
				N8nTag,
				N8nText,
			},
		},
	});
	return { ...result, context, data, usedKeys, strings, actions };
}

export const node = (
	name: string,
	displayName: string,
	extra: {
		isTrigger?: boolean;
		isService?: boolean;
		disabled?: boolean;
		type?: string;
		defaultName?: string;
	} = {},
) => ({
	name,
	...(extra.defaultName !== undefined && { defaultName: extra.defaultName }),
	type: extra.type ?? `n8n-nodes-base.${displayName.replace(/\s/g, '').toLowerCase()}`,
	displayName,
	isTrigger: extra.isTrigger ?? false,
	isService: extra.isService ?? false,
	disabled: extra.disabled ?? false,
});

export const workflowPage = (
	nodes: Array<ReturnType<typeof node>>,
	extra: { active?: boolean; hasErrorWorkflow?: boolean } = {},
): UiExtensionPageContext => ({
	page: 'workflow',
	routeName: 'NodeViewExisting',
	workflow: {
		id: 'wf-1',
		name: 'Lead routing',
		active: extra.active ?? false,
		nodes,
		hasErrorWorkflow: extra.hasErrorWorkflow ?? false,
	},
});

export const listPage: UiExtensionPageContext = {
	page: 'workflows',
	routeName: 'WorkflowsView',
	projectId: null,
	totalWorkflows: 7,
};

export const otherPage: UiExtensionPageContext = {
	page: 'other',
	routeName: 'SettingsPersonalView',
};

export const hiddenWorkflowPage: UiExtensionPageContext = {
	page: 'workflow',
	routeName: 'NodeViewExisting',
	workflow: null,
};

export const NOW = new Date('2026-11-16T12:00:00.000Z');

export const run = (id: string, extra: Partial<UiExtensionRun> = {}): UiExtensionRun => ({
	id,
	workflowId: 'wf-1',
	workflowName: 'Lead routing',
	status: 'success',
	mode: 'manual',
	startedAt: '2026-11-16T11:55:00.000Z',
	stoppedAt: '2026-11-16T11:55:01.500Z',
	...extra,
});

export const serviceNode = (
	extra: Partial<UiExtensionServiceNodeData> = {},
): UiExtensionServiceNodeData => ({
	nodeName: 'Notify sales',
	nodeType: 'n8n-nodes-base.slack',
	displayName: 'Slack',
	resource: 'Message',
	operation: 'Send',
	targets: [{ label: 'Channel', name: '#alerts', url: 'https://example.slack.com/archives/C123' }],
	credentialName: 'Sales Slack',
	lastRun: {
		executionId: '42',
		status: 'success',
		finishedAt: '2026-11-16T11:55:01.500Z',
		itemCount: 5,
		items: [{ ts: '1', text: 'hello' }],
	},
	...extra,
});

export const panelData = (extra: Partial<UiExtensionPanelData> = {}): UiExtensionPanelData => ({
	state: 'ready',
	runs: null,
	services: null,
	...extra,
});

export const overviewService = (
	extra: Partial<UiExtensionOverviewData['services'][number]> = {},
): UiExtensionOverviewData['services'][number] => ({
	nodeType: 'n8n-nodes-base.slack',
	displayName: 'Slack',
	workflowCount: 2,
	activeWorkflowCount: 1,
	health: 'ok',
	accounts: ['Sales Slack'],
	workflows: [
		{
			id: 'wf-1',
			name: 'Lead routing',
			active: true,
			lastRun: { status: 'success', stoppedAt: '2026-11-16T11:55:01.500Z' },
		},
		{ id: 'wf-2', name: 'Digest', active: false, lastRun: null },
	],
	...extra,
});

export const overview = (
	extra: Partial<UiExtensionOverviewData> = {},
): UiExtensionOverviewData => ({
	workflows: { total: 3, active: 1, scanned: 3 },
	runs: { scanned: 4, succeeded: 3, failed: 1 },
	services: [overviewService()],
	failures: [run('9', { status: 'error', workflowId: 'wf-2', workflowName: 'Digest' })],
	...extra,
});
