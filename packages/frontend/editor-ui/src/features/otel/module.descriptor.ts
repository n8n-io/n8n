import { useI18n } from '@n8n/i18n';
import type { FrontendModuleDescription } from '@/app/moduleInitializer/module.types';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { OTEL_SETTINGS_VIEW } from './otel.constants';

const i18n = useI18n();

const SettingsOpenTelemetryView = async () => await import('./SettingsOpenTelemetryView.vue');

export const OtelModule: FrontendModuleDescription = {
	id: 'otel',
	name: 'OpenTelemetry',
	description: 'Configure OpenTelemetry settings',
	icon: 'chart-column-decreasing',
	routes: [
		{
			path: 'opentelemetry',
			name: OTEL_SETTINGS_VIEW,
			component: SettingsOpenTelemetryView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'custom'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
	settingsPages: [
		{
			id: 'settings-opentelemetry',
			icon: 'chart-column-decreasing',
			label: i18n.baseText('settings.opentelemetry'),
			position: 'bottom',
			route: { to: { name: OTEL_SETTINGS_VIEW } },
			get available() {
				return hasPermission(['rbac'], { rbac: { scope: 'otel:manage' } });
			},
		},
	],
};
