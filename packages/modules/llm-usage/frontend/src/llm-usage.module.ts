import { defineFrontendModule } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';

import { LLM_USAGE_VIEW } from './llm-usage.constants';

// typescript-eslint reads an SFC import as `any`, because only vue-tsc can type one.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const SettingsLlmUsageView = async () => await import('./SettingsLlmUsageView.vue');

export const LlmUsageModule = defineFrontendModule({
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'llm-usage',
	name: 'LLM usage',
	description: 'Shows the tokens and estimated cost of LLM calls',
	icon: 'circle-dollar-sign',
	routes: [
		{
			path: 'llm-usage',
			name: LLM_USAGE_VIEW,
			component: SettingsLlmUsageView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: { rbac: { scope: 'llmUsage:read' } },
				telemetry: { pageCategory: 'settings' },
			},
		},
	],
	settingsPages: [
		{
			id: 'settings-llm-usage',
			order: 80,
			section: 'ai',
			icon: 'circle-dollar-sign',
			get label() {
				return useI18n().baseText('settings.llmUsage');
			},
			position: 'top',
			route: { to: { name: LLM_USAGE_VIEW } },
			get available() {
				return useRBACStore().hasScope('llmUsage:read');
			},
		},
	],
});
