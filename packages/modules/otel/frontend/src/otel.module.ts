import { defineFrontendModule, splitSearchKeywords } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';

import { OTEL_SETTINGS_VIEW } from './otel.constants';

// typescript-eslint reads an SFC import as `any`, because only vue-tsc can type one.
// `pnpm turbo typecheck` is what checks this component for real.
// eslint-disable-next-line @typescript-eslint/no-unsafe-return
const SettingsOpenTelemetryView = async () => await import('./SettingsOpenTelemetryView.vue');

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
			order: 50,
			section: 'operations',
			icon: 'telescope',
			get label() {
				return useI18n().baseText('settings.opentelemetry');
			},
			get searchKeywords() {
				return splitSearchKeywords(useI18n().baseText('settings.opentelemetry.search.page'));
			},
			get searchEntries() {
				const i18n = useI18n();
				const connectionGroup = i18n.baseText('settings.opentelemetry.collectorConnection.title');
				const tracingGroup = i18n.baseText('settings.opentelemetry.tracing.title');
				return [
					{
						anchor: 'enabled',
						label: i18n.baseText('settings.opentelemetry.status.label'),
						keywords: splitSearchKeywords(i18n.baseText('settings.opentelemetry.search.enabled')),
					},
					{
						anchor: 'protocol',
						label: i18n.baseText('settings.opentelemetry.exporterProtocol.label'),
						group: connectionGroup,
						keywords: splitSearchKeywords(i18n.baseText('settings.opentelemetry.search.protocol')),
					},
					{
						anchor: 'endpoint',
						label: i18n.baseText('settings.opentelemetry.exporterEndpoint.label'),
						group: connectionGroup,
						keywords: splitSearchKeywords(i18n.baseText('settings.opentelemetry.search.endpoint')),
					},
					{
						anchor: 'service-name',
						label: i18n.baseText('settings.opentelemetry.exporterServiceName.label'),
						group: connectionGroup,
						keywords: splitSearchKeywords(
							i18n.baseText('settings.opentelemetry.search.serviceName'),
						),
					},
					{
						anchor: 'headers',
						label: i18n.baseText('settings.opentelemetry.exporterHeaders.label'),
						group: connectionGroup,
						keywords: splitSearchKeywords(i18n.baseText('settings.opentelemetry.search.headers')),
					},
					{
						anchor: 'trace-path',
						label: i18n.baseText('settings.opentelemetry.exporterTracingPath.label'),
						group: connectionGroup,
						keywords: splitSearchKeywords(i18n.baseText('settings.opentelemetry.search.tracePath')),
					},
					{
						anchor: 'connectivity-timeout',
						label: i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.label'),
						group: connectionGroup,
					},
					{
						anchor: 'verify-configuration',
						label: i18n.baseText('settings.opentelemetry.testTrace.label'),
						group: connectionGroup,
						keywords: splitSearchKeywords(
							i18n.baseText('settings.opentelemetry.search.verifyConfiguration'),
						),
					},
					{
						anchor: 'sample-rate',
						label: i18n.baseText('settings.opentelemetry.tracesSampleRate.label'),
						group: tracingGroup,
						keywords: splitSearchKeywords(
							i18n.baseText('settings.opentelemetry.search.sampleRate'),
						),
					},
					{
						anchor: 'node-spans',
						label: i18n.baseText('settings.opentelemetry.includeNodeSpans.label'),
						group: tracingGroup,
					},
					{
						anchor: 'workflow-start-spans',
						label: i18n.baseText('settings.opentelemetry.emitWorkflowStartSpan.label'),
						group: tracingGroup,
					},
					{
						anchor: 'node-start-spans',
						label: i18n.baseText('settings.opentelemetry.emitNodeStartSpan.label'),
						group: tracingGroup,
					},
					{
						anchor: 'outbound-trace-headers',
						label: i18n.baseText('settings.opentelemetry.injectOutbound.label'),
						group: tracingGroup,
						keywords: splitSearchKeywords(
							i18n.baseText('settings.opentelemetry.search.outboundTraceHeaders'),
						),
					},
					{
						anchor: 'published-workflows-only',
						label: i18n.baseText('settings.opentelemetry.productionExecutionsOnly.label'),
						group: tracingGroup,
						keywords: splitSearchKeywords(
							i18n.baseText('settings.opentelemetry.search.publishedWorkflowsOnly'),
						),
					},
				];
			},
			position: 'top',
			route: { to: { name: OTEL_SETTINGS_VIEW } },
			get available() {
				return useRBACStore().hasScope('otel:manage');
			},
		},
	],
});
