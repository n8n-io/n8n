/* global Vue, n8n */
// The built-in "Services overview" page. It shows the outside services that the
// user's workflows connect to: how much each one is used, through which
// accounts, and whether the workflows that use it run well.
const { computed } = Vue;

const STATUS_BADGE = {
	success: 'success',
	error: 'danger',
	crashed: 'danger',
	canceled: 'warning',
	running: 'info',
	waiting: 'info',
};
const HEALTH_BADGE = { ok: 'success', failing: 'danger', unknown: 'subtle' };
const UNITS = [
	['day', 86400],
	['hour', 3600],
	['minute', 60],
];

const page =
	'display: flex; flex-direction: column; gap: var(--spacing--lg); max-width: 75rem; margin: 0 auto; padding: var(--spacing--xl) var(--spacing--lg)';
const stack = 'display: flex; flex-direction: column; gap: var(--spacing--xs)';
const row = 'display: flex; align-items: center; gap: var(--spacing--2xs)';
const between =
	'display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--2xs)';
const tiles =
	'display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: var(--spacing--xs)';
const tile =
	'display: flex; flex-direction: column; gap: var(--spacing--4xs); padding: var(--spacing--xs) var(--spacing--sm); border-radius: var(--radius); background-color: var(--background--subtle)';
const grid =
	'display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr)); gap: var(--spacing--sm)';
const linkButton =
	'display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--2xs); width: 100%; padding: var(--spacing--4xs) var(--spacing--2xs); border: none; border-radius: var(--radius); background: none; color: inherit; font: inherit; text-align: left; cursor: pointer';

export default {
	setup() {
		const data = n8n.useData();
		const locale = n8n.useLocale();
		const t = n8n.t;

		const overview = computed(() => data.value?.overview ?? null);
		const services = computed(() => overview.value?.services ?? []);

		function ago(iso) {
			if (!iso) return '';
			const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
			const format = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' });
			for (const [unit, size] of UNITS) {
				if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
			}
			return format.format(seconds, 'second');
		}

		const summary = computed(() => {
			const value = overview.value;
			if (!value) return [];
			const numberFormat = new Intl.NumberFormat(locale.value);
			const accounts = new Set(services.value.flatMap((service) => service.accounts));
			const finished = value.runs.succeeded + value.runs.failed;
			return [
				{
					key: 'workflows',
					value: numberFormat.format(value.workflows.total),
					detail: t('uiExtensions.servicesOverview.summary.active', {
						count: numberFormat.format(value.workflows.active),
					}),
				},
				{ key: 'services', value: numberFormat.format(services.value.length) },
				{ key: 'accounts', value: numberFormat.format(accounts.size) },
				{
					key: 'successRate',
					value:
						finished === 0
							? t('uiExtensions.recentRuns.summary.noValue')
							: new Intl.NumberFormat(locale.value, { style: 'percent' }).format(
									value.runs.succeeded / finished,
								),
					detail: t(
						value.runs.scanned === 1
							? 'uiExtensions.servicesOverview.summary.runsOne'
							: 'uiExtensions.servicesOverview.summary.runs',
						{
							count: numberFormat.format(value.runs.scanned),
						},
					),
				},
			];
		});

		return {
			data,
			overview,
			services,
			summary,
			ago,
			isPartial: computed(
				() => !!overview.value && overview.value.workflows.scanned < overview.value.workflows.total,
			),
			statusBadge: (status) => STATUS_BADGE[status] ?? 'subtle',
			healthBadge: (health) => HEALTH_BADGE[health] ?? 'subtle',
			refresh: () => n8n.refresh(),
			openWorkflow: (id) => n8n.openWorkflow(id),
			openExecution: (run) => n8n.openExecution(run.workflowId, run.id),
			page,
			stack,
			row,
			between,
			tiles,
			tile,
			grid,
			linkButton,
			t,
		};
	},
	template: `
		<section data-test-id="services-overview" :style="page">
			<header :style="between" style="align-items: flex-start">
				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs); min-width: 0">
					<N8nHeading tag="h1" size="xlarge" bold>{{ t('uiExtensions.servicesOverview.title') }}</N8nHeading>
					<N8nText color="text-light">{{ t('uiExtensions.servicesOverview.subtitle') }}</N8nText>
				</div>
				<N8nButton variant="outline" size="small" icon="refresh-cw" data-test-id="services-overview-refresh" @click="refresh">{{ t('uiExtensions.view.refresh') }}</N8nButton>
			</header>

			<N8nText v-if="!data || data.state === 'loading'" color="text-light" data-test-id="services-overview-loading">{{ t('uiExtensions.view.loading') }}</N8nText>
			<N8nCallout v-else-if="data.state === 'error' || !overview" theme="danger" data-test-id="services-overview-error">
				<div :style="between">
					<span>{{ t('uiExtensions.view.loadError') }}</span>
					<N8nButton variant="outline" size="small" data-test-id="services-overview-retry" @click="refresh">{{ t('uiExtensions.view.retry') }}</N8nButton>
				</div>
			</N8nCallout>
			<template v-else>
				<div :style="tiles" data-test-id="services-overview-summary">
					<div v-for="stat in summary" :key="stat.key" :style="tile" :data-test-id="'services-overview-stat-' + stat.key">
						<N8nText size="small" color="text-light">{{ t('uiExtensions.servicesOverview.summary.' + stat.key) }}</N8nText>
						<N8nText size="xlarge" bold>{{ stat.value }}</N8nText>
						<N8nText v-if="stat.detail" size="xsmall" color="text-light">{{ stat.detail }}</N8nText>
					</div>
				</div>

				<div v-if="services.length === 0" style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing--2xs); padding: var(--spacing--2xl) 0; text-align: center" data-test-id="services-overview-empty">
					<N8nIcon icon="plug" size="xlarge" color="text-light" />
					<N8nText bold>{{ t('uiExtensions.servicesOverview.empty.title') }}</N8nText>
					<N8nText size="small" color="text-light">{{ t('uiExtensions.servicesOverview.empty.hint') }}</N8nText>
				</div>
				<div v-else :style="stack">
					<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.servicesOverview.services') }}</N8nHeading>
					<div :style="grid">
						<N8nCard v-for="service in services" :key="service.nodeType" data-test-id="services-overview-card">
							<div :style="stack">
								<div :style="between" style="align-items: flex-start">
									<span style="display: flex; flex-direction: column; gap: var(--spacing--4xs); min-width: 0">
										<N8nText bold data-test-id="services-overview-service">{{ service.displayName }}</N8nText>
										<N8nText size="small" color="text-light" data-test-id="services-overview-usage">{{ t(service.workflowCount === 1 ? 'uiExtensions.servicesOverview.usedInOne' : 'uiExtensions.servicesOverview.usedIn', { count: service.workflowCount, active: service.activeWorkflowCount }) }}</N8nText>
									</span>
									<N8nBadge :variant="healthBadge(service.health)" data-test-id="services-overview-health">{{ t('uiExtensions.servicesOverview.health.' + service.health) }}</N8nBadge>
								</div>
								<span v-if="service.accounts.length > 0" :style="row" style="flex-wrap: wrap; gap: var(--spacing--4xs)" data-test-id="services-overview-accounts">
									<N8nText size="xsmall" color="text-light">{{ t('uiExtensions.servicesOverview.accounts') }}</N8nText>
									<N8nTag v-for="account in service.accounts" :key="account" :text="account" :clickable="false" data-test-id="services-overview-account" />
								</span>
								<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs)">
									<button v-for="workflow in service.workflows" :key="workflow.id" type="button" :style="linkButton" :title="t('uiExtensions.servicesOverview.openWorkflow')" data-test-id="services-overview-workflow" @click="openWorkflow(workflow.id)">
										<span :style="row" style="min-width: 0">
											<N8nIcon :icon="workflow.active ? 'circle-check' : 'circle'" size="small" :color="workflow.active ? 'success' : 'text-light'" />
											<N8nText size="small" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ workflow.name || t('uiExtensions.recentRuns.unnamedWorkflow') }}</N8nText>
										</span>
										<N8nBadge v-if="workflow.lastRun" :variant="statusBadge(workflow.lastRun.status)">{{ t('uiExtensions.recentRuns.status.' + workflow.lastRun.status) }}</N8nBadge>
										<N8nText v-else size="xsmall" color="text-light">{{ t('uiExtensions.servicesOverview.noRun') }}</N8nText>
									</button>
								</div>
							</div>
						</N8nCard>
					</div>
				</div>

				<div v-if="overview.failures.length > 0" :style="stack" data-test-id="services-overview-failures">
					<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.servicesOverview.failures') }}</N8nHeading>
					<N8nCard>
						<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs)">
							<button v-for="run in overview.failures" :key="run.id" type="button" :style="linkButton" :title="t('uiExtensions.recentRuns.openRun')" data-test-id="services-overview-failure" @click="openExecution(run)">
								<span :style="row" style="min-width: 0">
									<N8nBadge :variant="statusBadge(run.status)">{{ t('uiExtensions.recentRuns.status.' + run.status) }}</N8nBadge>
									<N8nText size="small" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ run.workflowName || t('uiExtensions.recentRuns.unnamedWorkflow') }}</N8nText>
								</span>
								<N8nText size="xsmall" color="text-light">{{ ago(run.stoppedAt ?? run.startedAt) }}</N8nText>
							</button>
						</div>
					</N8nCard>
				</div>

				<N8nText v-if="isPartial" size="small" color="text-light" data-test-id="services-overview-partial">{{ t('uiExtensions.servicesOverview.partial', { count: overview.workflows.scanned }) }}</N8nText>
			</template>
		</section>
	`,
};
