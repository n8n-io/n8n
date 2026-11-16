/* global Vue, n8n */
// The built-in "Service data" view. For each node of the open workflow that
// connects to an outside service, it shows what the node works on, the account
// it uses and the data it read or wrote in the latest run.
const { computed } = Vue;

const STATUS_BADGE = {
	success: 'success',
	error: 'danger',
	crashed: 'danger',
	canceled: 'warning',
	running: 'info',
	waiting: 'info',
};
const UNITS = [
	['day', 86400],
	['hour', 3600],
	['minute', 60],
];

const stack = 'display: flex; flex-direction: column; gap: var(--spacing--xs)';
const row = 'display: flex; align-items: center; gap: var(--spacing--2xs)';
const between =
	'display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--2xs)';
const itemTable =
	'display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: var(--spacing--4xs) var(--spacing--2xs); padding: var(--spacing--2xs); border-radius: var(--radius); background-color: var(--background--subtle)';

export default {
	setup() {
		const context = n8n.useContext();
		const data = n8n.useData();
		const locale = n8n.useLocale();
		const t = n8n.t;

		const services = computed(() => data.value?.services ?? []);

		function finishedAgo(iso) {
			if (!iso) return '';
			const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
			const format = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' });
			for (const [unit, size] of UNITS) {
				if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
			}
			return format.format(seconds, 'second');
		}

		function action(service) {
			if (service.resource && service.operation) {
				return t('uiExtensions.serviceData.action', {
					resource: service.resource,
					operation: service.operation,
				});
			}
			return service.operation ?? service.resource ?? '';
		}

		return {
			context,
			data,
			services,
			finishedAgo,
			action,
			badge: (status) => STATUS_BADGE[status] ?? 'subtle',
			refresh: () => n8n.refresh(),
			openUrl: (url) => n8n.openUrl(url),
			entries: (item) => Object.entries(item),
			stack,
			row,
			between,
			itemTable,
			t,
		};
	},
	template: `
		<section data-test-id="service-data" :style="stack">
			<header :style="between" style="align-items: flex-start">
				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs); min-width: 0">
					<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.serviceData.title') }}</N8nHeading>
					<N8nText v-if="context.page === 'workflow' && context.workflow" size="small" color="text-light" data-test-id="service-data-subtitle" style="overflow-wrap: anywhere">{{ context.workflow.name }}</N8nText>
				</div>
				<N8nButton v-if="context.page === 'workflow'" variant="ghost" size="small" icon="refresh-cw" icon-only :aria-label="t('uiExtensions.view.refresh')" :title="t('uiExtensions.view.refresh')" data-test-id="service-data-refresh" @click="refresh" />
			</header>

			<div v-if="context.page !== 'workflow'" style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing--2xs); padding: var(--spacing--lg) 0; text-align: center" data-test-id="service-data-open-workflow">
				<N8nIcon icon="database" size="xlarge" color="text-light" />
				<N8nText size="small" color="text-light">{{ t('uiExtensions.serviceData.openWorkflow') }}</N8nText>
			</div>
			<N8nText v-else-if="!data || data.state === 'loading'" size="small" color="text-light" data-test-id="service-data-loading">{{ t('uiExtensions.view.loading') }}</N8nText>
			<N8nCallout v-else-if="data.state === 'error'" theme="danger" data-test-id="service-data-error">
				<div :style="between">
					<span>{{ t('uiExtensions.view.loadError') }}</span>
					<N8nButton variant="outline" size="small" data-test-id="service-data-retry" @click="refresh">{{ t('uiExtensions.view.retry') }}</N8nButton>
				</div>
			</N8nCallout>
			<N8nText v-else-if="services.length === 0" size="small" color="text-light" data-test-id="service-data-empty">{{ t('uiExtensions.serviceData.empty') }}</N8nText>
			<template v-else>
				<N8nCard v-for="service in services" :key="service.nodeName" data-test-id="service-data-card">
					<div :style="stack">
						<div :style="between" style="align-items: flex-start">
							<span style="display: flex; flex-direction: column; gap: var(--spacing--4xs); min-width: 0">
								<N8nText size="small" bold data-test-id="service-data-service">{{ service.displayName }}</N8nText>
								<N8nText size="xsmall" color="text-light" data-test-id="service-data-node" style="overflow-wrap: anywhere">{{ service.nodeName }}</N8nText>
							</span>
							<N8nTag v-if="action(service)" :text="action(service)" :clickable="false" data-test-id="service-data-action" />
						</div>

						<span v-for="target in service.targets" :key="target.label + target.name" :style="row" data-test-id="service-data-target">
							<N8nText size="small" style="overflow-wrap: anywhere">{{ t('uiExtensions.serviceData.target', { label: target.label, name: target.name }) }}</N8nText>
							<N8nButton v-if="target.url" variant="ghost" size="xsmall" icon="external-link" icon-only :aria-label="t('uiExtensions.serviceData.openTarget', { name: target.name })" :title="t('uiExtensions.serviceData.openTarget', { name: target.name })" data-test-id="service-data-target-link" @click="openUrl(target.url)" />
						</span>
						<N8nText v-if="service.credentialName" size="xsmall" color="text-light" data-test-id="service-data-account" style="overflow-wrap: anywhere">{{ t('uiExtensions.serviceData.account', { name: service.credentialName }) }}</N8nText>

						<N8nText v-if="!service.lastRun" size="small" color="text-light" data-test-id="service-data-no-run">{{ t('uiExtensions.serviceData.noRun') }}</N8nText>
						<div v-else style="display: flex; flex-direction: column; gap: var(--spacing--2xs)" data-test-id="service-data-last-run">
							<span :style="row" style="flex-wrap: wrap">
								<N8nBadge :variant="badge(service.lastRun.status)">{{ t('uiExtensions.recentRuns.status.' + service.lastRun.status) }}</N8nBadge>
								<N8nText size="xsmall" color="text-light">{{ finishedAgo(service.lastRun.finishedAt) }}</N8nText>
								<N8nText size="xsmall" color="text-light" data-test-id="service-data-items">{{ t('uiExtensions.serviceData.items', { count: service.lastRun.itemCount }) }}</N8nText>
							</span>
							<N8nCallout v-if="service.lastRun.error" theme="danger" data-test-id="service-data-node-error">
								<span style="overflow-wrap: anywhere">{{ service.lastRun.error }}</span>
							</N8nCallout>
							<N8nText v-else-if="service.lastRun.items.length === 0" size="xsmall" color="text-light">{{ t('uiExtensions.serviceData.noItems') }}</N8nText>
							<div v-for="(item, index) in service.lastRun.items" :key="index" :style="itemTable" data-test-id="service-data-item">
								<template v-for="[key, value] in entries(item)" :key="key">
									<N8nText size="xsmall" color="text-light" style="overflow-wrap: anywhere">{{ key }}</N8nText>
									<N8nText size="xsmall" style="overflow-wrap: anywhere">{{ value }}</N8nText>
								</template>
							</div>
						</div>
					</div>
				</N8nCard>
			</template>
		</section>
	`,
};
