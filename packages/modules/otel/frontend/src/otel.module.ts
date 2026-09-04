import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { OTEL_SETTINGS_VIEW } from './otel.constants';

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
			labelKey: 'settings.opentelemetry',
			position: 'top',
			route: { to: { name: OTEL_SETTINGS_VIEW } },
			requiredScopes: 'otel:manage',
		},
	],
};
