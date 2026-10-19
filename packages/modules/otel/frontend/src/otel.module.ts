import { VIEWS } from '@n8n/frontend-constants/views';
import { defineFrontendModule } from '@n8n/frontend-module-sdk';

import { OTEL_SETTINGS_VIEW } from './otel.constants';

// typescript-eslint reads an SFC import as `any`, because only vue-tsc can type one.
// `pnpm turbo typecheck` is what checks this component for real.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const SettingsOpenTelemetryView = async () => await import('./SettingsOpenTelemetryView.vue');

// The page has no sidebar link of its own: the shell's Observability overview lists it, so
// the route nests under that overview and the old flat path redirects there.
export const OtelModule = defineFrontendModule({
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
				parentRouteName: VIEWS.OBSERVABILITY_SETTINGS_ROOT,
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
		{
			path: 'opentelemetry',
			redirect: { name: OTEL_SETTINGS_VIEW },
			meta: {
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
});
