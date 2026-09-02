import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';

import { OTEL_SETTINGS_VIEW } from './otel.constants';

const i18n = useI18n();

// typescript-eslint reads an SFC import as `any`, because only vue-tsc can type one.
// `pnpm turbo typecheck` is what checks this component for real.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const SettingsOpenTelemetryView = async () => await import('./SettingsOpenTelemetryView.vue');

export const OtelModule: FrontendModuleDescription = {
	id: 'otel',
	name: 'OpenTelemetry',
	description: 'Configure OpenTelemetry settings',
	icon: 'telescope',
	routes: [
		{
			path: 'opentelemetry',
			name: OTEL_SETTINGS_VIEW,
			component: SettingsOpenTelemetryView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: {
					rbac: {
						scope: 'otel:manage',
					},
				},
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
	settingsPages: [
		{
			id: 'settings-opentelemetry',
			icon: 'telescope',
			label: i18n.baseText('settings.opentelemetry'),
			position: 'top',
			route: { to: { name: OTEL_SETTINGS_VIEW } },
			// Getter, not a value: the item is registered once at init, but the
			// scope check must re-run whenever the sidebar recomputes.
			get available() {
				return useRBACStore().hasScope('otel:manage');
			},
		},
	],
};
