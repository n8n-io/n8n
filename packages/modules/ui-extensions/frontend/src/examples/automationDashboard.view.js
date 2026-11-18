/* global Vue, n8n */
// The built-in "Automation dashboard" page. It shows how the user's automations
// run: the success rate and run times of the newest runs, the workflows that
// fail, and the outside services that the workflows connect to.
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
const BAR_COLOR = {
	success: 'var(--color--green-500)',
	error: 'var(--color--red-500)',
	crashed: 'var(--color--red-500)',
	canceled: 'var(--color--yellow-500)',
};
const FAILED = ['error', 'crashed'];
const ATTENTION_LIMIT = 5;
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
const columns =
	'display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: var(--spacing--sm); align-items: start';
const chart =
	'display: flex; align-items: flex-end; gap: var(--spacing--4xs); height: var(--spacing--4xl); padding: var(--spacing--2xs); border-radius: var(--radius); background-color: var(--background--subtle)';
// A bar is no wider than a large spacing step, so a few runs don't fill the chart.
const bar =
	'flex: 1; min-width: 0; max-width: var(--spacing--lg); padding: 0; border: none; border-radius: var(--radius) var(--radius) 0 0; cursor: pointer';
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

		const runs = computed(() => overview.value?.runs.items ?? []);

		function durationMs(run) {
			if (!run.startedAt || !run.stoppedAt) return null;
			return Math.max(0, new Date(run.stoppedAt).getTime() - new Date(run.startedAt).getTime());
		}

		function formatDuration(ms) {
			const inSeconds = ms >= 1000;
			return new Intl.NumberFormat(locale.value, {
				style: 'unit',
				unit: inSeconds ? 'second' : 'millisecond',
				unitDisplay: 'short',
				maximumFractionDigits: 1,
			}).format(inSeconds ? ms / 1000 : ms);
		}

		const durations = computed(() => runs.value.map(durationMs).filter((ms) => ms !== null));

		const summary = computed(() => {
			const value = overview.value;
			if (!value) return [];
			const numberFormat = new Intl.NumberFormat(locale.value);
			const accounts = new Set(services.value.flatMap((service) => service.accounts));
			const finished = value.runs.succeeded + value.runs.failed;
			const none = t('uiExtensions.recentRuns.summary.noValue');
			const total = durations.value.reduce((sum, ms) => sum + ms, 0);
			return [
				{
					key: 'workflows',
					value: numberFormat.format(value.workflows.total),
					detail: t('uiExtensions.automationDashboard.summary.active', {
						count: numberFormat.format(value.workflows.active),
					}),
				},
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
							? 'uiExtensions.automationDashboard.summary.runsOne'
							: 'uiExtensions.automationDashboard.summary.runs',
						{
							count: numberFormat.format(value.runs.scanned),
						},
					),
				},
				{
					key: 'averageDuration',
					value: durations.value.length ? formatDuration(total / durations.value.length) : none,
					...(durations.value.length && {
						detail: t('uiExtensions.automationDashboard.summary.longest', {
							duration: formatDuration(Math.max(...durations.value)),
						}),
					}),
				},
				{
					key: 'services',
					value: numberFormat.format(services.value.length),
					detail: t('uiExtensions.automationDashboard.summary.accountsCount', {
						count: numberFormat.format(accounts.size),
					}),
				},
			];
		});

		// Oldest first, so the chart reads left to right.
		const bars = computed(() => {
			const longest = Math.max(1, ...durations.value);
			return [...runs.value].reverse().map((run) => {
				const ms = durationMs(run);
				const status = t('uiExtensions.recentRuns.status.' + run.status);
				return {
					run,
					height: ms === null ? 8 : Math.max(8, Math.round((ms / longest) * 100)),
					color: BAR_COLOR[run.status] ?? 'var(--color--blue-500)',
					label:
						ms === null
							? t('uiExtensions.recentRuns.chart.barNoTime', { status })
							: t('uiExtensions.recentRuns.chart.bar', { status, duration: formatDuration(ms) }),
				};
			});
		});

		// The workflows that failed in these runs, the most failures first.
		const attention = computed(() => {
			const byWorkflow = new Map();
			for (const run of runs.value) {
				const entry = byWorkflow.get(run.workflowId) ?? {
					workflowId: run.workflowId,
					name: run.workflowName,
					runs: 0,
					failures: 0,
					lastFailure: null,
				};
				entry.runs += 1;
				if (FAILED.includes(run.status)) {
					entry.failures += 1;
					// Runs come newest first, so the first failure is the newest.
					entry.lastFailure ??= run;
				}
				byWorkflow.set(run.workflowId, entry);
			}
			return [...byWorkflow.values()]
				.filter((entry) => entry.failures > 0)
				.sort((a, b) => b.failures - a.failures || b.failures / b.runs - a.failures / a.runs)
				.slice(0, ATTENTION_LIMIT);
		});

		return {
			data,
			overview,
			services,
			summary,
			bars,
			attention,
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
			columns,
			chart,
			bar,
			linkButton,
			t,
		};
	},
	template: `
		<section data-test-id="automation-dashboard" :style="page">
			<header :style="between" style="align-items: flex-start">
				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs); min-width: 0">
					<N8nHeading tag="h1" size="xlarge" bold>{{ t('uiExtensions.automationDashboard.title') }}</N8nHeading>
					<N8nText color="text-light">{{ t('uiExtensions.automationDashboard.subtitle') }}</N8nText>
				</div>
				<N8nButton variant="outline" size="small" icon="refresh-cw" data-test-id="automation-dashboard-refresh" @click="refresh">{{ t('uiExtensions.view.refresh') }}</N8nButton>
			</header>

			<N8nText v-if="!data || data.state === 'loading'" color="text-light" data-test-id="automation-dashboard-loading">{{ t('uiExtensions.view.loading') }}</N8nText>
			<N8nCallout v-else-if="data.state === 'error' || !overview" theme="danger" data-test-id="automation-dashboard-error">
				<div :style="between">
					<span>{{ t('uiExtensions.view.loadError') }}</span>
					<N8nButton variant="outline" size="small" data-test-id="automation-dashboard-retry" @click="refresh">{{ t('uiExtensions.view.retry') }}</N8nButton>
				</div>
			</N8nCallout>
			<template v-else>
				<div :style="tiles" data-test-id="automation-dashboard-summary">
					<div v-for="stat in summary" :key="stat.key" :style="tile" :data-test-id="'automation-dashboard-stat-' + stat.key">
						<N8nText size="small" color="text-light">{{ t('uiExtensions.automationDashboard.summary.' + stat.key) }}</N8nText>
						<N8nText size="xlarge" bold>{{ stat.value }}</N8nText>
						<N8nText v-if="stat.detail" size="xsmall" color="text-light">{{ stat.detail }}</N8nText>
					</div>
				</div>

				<div v-if="bars.length > 0" :style="stack" data-test-id="automation-dashboard-activity">
					<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.automationDashboard.activity') }}</N8nHeading>
					<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs)">
						<N8nText size="xsmall" color="text-light">{{ t('uiExtensions.recentRuns.chart.title') }}</N8nText>
						<div :style="chart" data-test-id="automation-dashboard-chart">
							<button
								v-for="entry in bars"
								:key="entry.run.id"
								type="button"
								:style="[bar, { height: entry.height + '%', backgroundColor: entry.color }]"
								:title="entry.label"
								:aria-label="entry.label"
								tabindex="-1"
								data-test-id="automation-dashboard-bar"
								:data-status="entry.run.status"
								@click="openExecution(entry.run)"
							/>
						</div>
					</div>
				</div>

				<div :style="columns">
					<div :style="stack" data-test-id="automation-dashboard-attention">
						<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.automationDashboard.attention.title') }}</N8nHeading>
						<N8nCard>
							<div v-if="attention.length === 0" :style="row" data-test-id="automation-dashboard-attention-empty">
								<N8nIcon icon="circle-check" size="small" color="success" />
								<N8nText size="small" color="text-light">{{ t('uiExtensions.automationDashboard.attention.empty') }}</N8nText>
							</div>
							<div v-else style="display: flex; flex-direction: column; gap: var(--spacing--5xs)">
								<button v-for="entry in attention" :key="entry.workflowId" type="button" :style="linkButton" :title="t('uiExtensions.automationDashboard.openWorkflow')" data-test-id="automation-dashboard-attention-item" @click="openWorkflow(entry.workflowId)">
									<span style="display: flex; flex-direction: column; gap: var(--spacing--5xs); min-width: 0">
										<N8nText size="small" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ entry.name || t('uiExtensions.recentRuns.unnamedWorkflow') }}</N8nText>
										<N8nText size="xsmall" color="text-light">{{ t('uiExtensions.automationDashboard.attention.lastFailed', { time: ago(entry.lastFailure.stoppedAt ?? entry.lastFailure.startedAt) }) }}</N8nText>
									</span>
									<N8nBadge variant="danger" data-test-id="automation-dashboard-attention-failures">{{ t('uiExtensions.automationDashboard.attention.failures', { count: entry.failures, runs: entry.runs }) }}</N8nBadge>
								</button>
							</div>
						</N8nCard>
					</div>

					<div v-if="overview.failures.length > 0" :style="stack" data-test-id="automation-dashboard-failures">
						<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.automationDashboard.failures') }}</N8nHeading>
						<N8nCard>
							<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs)">
								<button v-for="run in overview.failures" :key="run.id" type="button" :style="linkButton" :title="t('uiExtensions.recentRuns.openRun')" data-test-id="automation-dashboard-failure" @click="openExecution(run)">
									<span :style="row" style="min-width: 0">
										<N8nBadge :variant="statusBadge(run.status)">{{ t('uiExtensions.recentRuns.status.' + run.status) }}</N8nBadge>
										<N8nText size="small" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ run.workflowName || t('uiExtensions.recentRuns.unnamedWorkflow') }}</N8nText>
									</span>
									<N8nText size="xsmall" color="text-light">{{ ago(run.stoppedAt ?? run.startedAt) }}</N8nText>
								</button>
							</div>
						</N8nCard>
					</div>
				</div>

				<div v-if="services.length === 0" style="display: flex; flex-direction: column; align-items: center; gap: var(--spacing--2xs); padding: var(--spacing--2xl) 0; text-align: center" data-test-id="automation-dashboard-empty">
					<N8nIcon icon="plug" size="xlarge" color="text-light" />
					<N8nText bold>{{ t('uiExtensions.automationDashboard.empty.title') }}</N8nText>
					<N8nText size="small" color="text-light">{{ t('uiExtensions.automationDashboard.empty.hint') }}</N8nText>
				</div>
				<div v-else :style="stack">
					<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.automationDashboard.services') }}</N8nHeading>
					<div :style="grid">
						<N8nCard v-for="service in services" :key="service.nodeType" data-test-id="automation-dashboard-card">
							<div :style="stack">
								<div :style="between" style="align-items: flex-start">
									<span style="display: flex; flex-direction: column; gap: var(--spacing--4xs); min-width: 0">
										<N8nText bold data-test-id="automation-dashboard-service">{{ service.displayName }}</N8nText>
										<N8nText size="small" color="text-light" data-test-id="automation-dashboard-usage">{{ t(service.workflowCount === 1 ? 'uiExtensions.automationDashboard.usedInOne' : 'uiExtensions.automationDashboard.usedIn', { count: service.workflowCount, active: service.activeWorkflowCount }) }}</N8nText>
									</span>
									<N8nBadge :variant="healthBadge(service.health)" data-test-id="automation-dashboard-health">{{ t('uiExtensions.automationDashboard.health.' + service.health) }}</N8nBadge>
								</div>
								<span v-if="service.accounts.length > 0" :style="row" style="flex-wrap: wrap; gap: var(--spacing--4xs)" data-test-id="automation-dashboard-accounts">
									<N8nText size="xsmall" color="text-light">{{ t('uiExtensions.automationDashboard.accounts') }}</N8nText>
									<N8nTag v-for="account in service.accounts" :key="account" :text="account" :clickable="false" data-test-id="automation-dashboard-account" />
								</span>
								<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs)">
									<button v-for="workflow in service.workflows" :key="workflow.id" type="button" :style="linkButton" :title="t('uiExtensions.automationDashboard.openWorkflow')" data-test-id="automation-dashboard-workflow" @click="openWorkflow(workflow.id)">
										<span :style="row" style="min-width: 0">
											<N8nIcon :icon="workflow.active ? 'circle-check' : 'circle'" size="small" :color="workflow.active ? 'success' : 'text-light'" />
											<N8nText size="small" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ workflow.name || t('uiExtensions.recentRuns.unnamedWorkflow') }}</N8nText>
										</span>
										<N8nBadge v-if="workflow.lastRun" :variant="statusBadge(workflow.lastRun.status)">{{ t('uiExtensions.recentRuns.status.' + workflow.lastRun.status) }}</N8nBadge>
										<N8nText v-else size="xsmall" color="text-light">{{ t('uiExtensions.automationDashboard.noRun') }}</N8nText>
									</button>
								</div>
							</div>
						</N8nCard>
					</div>
				</div>

				<N8nText v-if="isPartial" size="small" color="text-light" data-test-id="automation-dashboard-partial">{{ t('uiExtensions.automationDashboard.partial', { count: overview.workflows.scanned }) }}</N8nText>
			</template>
		</section>
	`,
};
