import type { UiExtensionPageContext } from '@n8n/api-types';
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

/**
 * Renders a built-in view the way the frame does: the view script with the two
 * globals, the English strings that the host sends, and the components that the
 * view runtime registers. `usedKeys` collects every key that the view translates.
 */
export function renderBuiltinView(id: string, initial: UiExtensionPageContext) {
	const definition = getBuiltinView(id);
	if (!definition) throw new Error(`No built-in view ${id}`);

	const i18n = useI18n();
	const strings = builtinViewStrings(definition, (key, options) => i18n.baseText(key, options));
	const usedKeys = new Set<string>();
	const context = Vue.ref(initial);
	const n8n = {
		useContext: () => Vue.computed(() => context.value),
		t: (key: string, params: Record<string, string | number> = {}) => {
			usedKeys.add(key);
			const text = strings[key] ?? key;
			return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
				name in params ? String(params[name]) : placeholder,
			);
		},
	};

	const window: Record<string, unknown> = {};
	runInNewContext(viewSourceToScript(definition.source), { window });
	const factory = window.__n8nUiExtensionView as (
		vue: typeof Vue,
		api: typeof n8n,
	) => Vue.Component;

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
	return { ...result, context, usedKeys, strings };
}

export const node = (
	name: string,
	displayName: string,
	extra: { isTrigger?: boolean; disabled?: boolean; type?: string; defaultName?: string } = {},
) => ({
	name,
	...(extra.defaultName !== undefined && { defaultName: extra.defaultName }),
	type: extra.type ?? `n8n-nodes-base.${displayName.replace(/\s/g, '').toLowerCase()}`,
	displayName,
	isTrigger: extra.isTrigger ?? false,
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
