/* global Vue, n8n */
// The built-in "Recent runs" view. It runs in the view frame like a view from
// an MCP client. It shows the latest runs of the open workflow, or of all
// workflows on the workflows list, and opens a run when the user selects it.
const { computed } = Vue;

const STATUS_BADGE = {
	success: 'success',
	error: 'danger',
	crashed: 'danger',
	canceled: 'warning',
	running: 'info',
	waiting: 'info',
};
const KNOWN_MODES = [
	'manual',
	'trigger',
	'webhook',
	'retry',
	'error',
	'integrated',
	'chat',
	'evaluation',
];
const BAR_COLOR = {
	success: 'var(--color--green-500)',
	error: 'var(--color--red-500)',
	crashed: 'var(--color--red-500)',
	canceled: 'var(--color--yellow-500)',
};
// A canceled run neither succeeded nor failed, so the success rate leaves it out.
const RATED = ['success', 'error', 'crashed'];
const TOP_WORKFLOWS = 3;
const UNITS = [
	['day', 86400],
	['hour', 3600],
	['minute', 60],
];

const stack = 'display: flex; flex-direction: column; gap: var(--spacing--xs)';
const row = 'display: flex; align-items: center; gap: var(--spacing--2xs)';
const between =
	'display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--2xs)';
const tiles =
	'display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing--2xs)';
const tile =
	'display: flex; flex-direction: column; gap: var(--spacing--4xs); padding: var(--spacing--2xs) var(--spacing--xs); border-radius: var(--radius); background-color: var(--background--subtle)';
const chart =
	'display: flex; align-items: flex-end; gap: var(--spacing--4xs); height: var(--spacing--3xl); padding: var(--spacing--2xs); border-radius: var(--radius); background-color: var(--background--subtle)';
const bar =
	'flex: 1; min-width: 0; padding: 0; border: none; border-radius: var(--radius) var(--radius) 0 0; cursor: pointer';
const runButton =
	'display: flex; flex-direction: column; gap: var(--spacing--3xs); width: 100%; padding: var(--spacing--xs); border: var(--border); border-radius: var(--radius); background-color: var(--background--surface); color: inherit; font: inherit; text-align: left; cursor: pointer';

export default {
	setup() {
		const context = n8n.useContext();
		const data = n8n.useData();
		const locale = n8n.useLocale();
		const t = n8n.t;

		const runs = computed(() => data.value?.runs ?? null);
		const onWorkflow = computed(() => context.value.page === 'workflow');
		const subtitle = computed(() => {
			if (context.value.page === 'workflow') return context.value.workflow?.name ?? '';
			if (context.value.page === 'workflows') return t('uiExtensions.recentRuns.allWorkflows');
			return '';
		});

		function startedAgo(iso) {
			if (!iso) return '';
			const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
			const format = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' });
			for (const [unit, size] of UNITS) {
				if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
			}
			return format.format(seconds, 'second');
		}

		const workflowName = (run) => run.workflowName || t('uiExtensions.recentRuns.unnamedWorkflow');

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

		function duration(run) {
			const ms = durationMs(run);
			return ms === null ? '' : formatDuration(ms);
		}

		const items = computed(() => runs.value?.items ?? []);
		const durations = computed(() => items.value.map(durationMs).filter((ms) => ms !== null));

		const summary = computed(() => {
			const rated = items.value.filter((run) => RATED.includes(run.status));
			const succeeded = rated.filter((run) => run.status === 'success').length;
			const total = durations.value.reduce((sum, ms) => sum + ms, 0);
			const none = t('uiExtensions.recentRuns.summary.noValue');
			return [
				{ key: 'runs', value: new Intl.NumberFormat(locale.value).format(items.value.length) },
				{
					key: 'successRate',
					value: rated.length
						? new Intl.NumberFormat(locale.value, { style: 'percent' }).format(
								succeeded / rated.length,
							)
						: none,
				},
				{
					key: 'averageDuration',
					value: durations.value.length ? formatDuration(total / durations.value.length) : none,
				},
				{
					key: 'longestDuration',
					value: durations.value.length ? formatDuration(Math.max(...durations.value)) : none,
				},
			];
		});

		// Oldest first, so the chart reads left to right.
		const bars = computed(() => {
			const longest = Math.max(1, ...durations.value);
			return [...items.value].reverse().map((run) => {
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

		const topWorkflows = computed(() => {
			if (runs.value?.scope !== 'all') return [];
			const byWorkflow = new Map();
			for (const run of items.value) {
				const entry = byWorkflow.get(run.workflowId) ?? {
					workflowId: run.workflowId,
					name: workflowName(run),
					runs: 0,
					failures: 0,
				};
				entry.runs += 1;
				if (run.status === 'error' || run.status === 'crashed') entry.failures += 1;
				byWorkflow.set(run.workflowId, entry);
			}
			return [...byWorkflow.values()]
				.sort((a, b) => b.runs - a.runs || b.failures - a.failures)
				.slice(0, TOP_WORKFLOWS);
		});

		return {
			context,
			data,
			runs,
			onWorkflow,
			subtitle,
			startedAgo,
			duration,
			summary,
			bars,
			workflowName,
			topWorkflows,
			modeLabel: (mode) =>
				KNOWN_MODES.includes(mode) ? t('uiExtensions.recentRuns.mode.' + mode) : mode,
			badge: (status) => STATUS_BADGE[status] ?? 'subtle',
			refresh: () => n8n.refresh(),
			open: (run) => n8n.openExecution(run.workflowId, run.id),
			stack,
			row,
			between,
			runButton,
			tiles,
			tile,
			chart,
			bar,
			t,
		};
	},
	template: `
		<section data-test-id="recent-runs" :style="stack">
			<header :style="between" style="align-items: flex-start">
				<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs); min-width: 0">
					<N8nHeading tag="h2" size="medium" bold>{{ t('uiExtensions.recentRuns.title') }}</N8nHeading>
					<N8nText v-if="subtitle" size="small" color="text-light" data-test-id="recent-runs-subtitle" style="overflow-wrap: anywhere">{{ subtitle }}</N8nText>
				</div>
				<N8nButton v-if="context.page !== 'other'" variant="ghost" size="small" icon="refresh-cw" icon-only :aria-label="t('uiExtensions.view.refresh')" :title="t('uiExtensions.view.refresh')" data-test-id="recent-runs-refresh" @click="refresh" />
			</header>

			<N8nText v-if="context.page === 'other'" size="small" color="text-light" data-test-id="recent-runs-other-page">{{ t('uiExtensions.recentRuns.otherPage') }}</N8nText>
			<N8nText v-else-if="!data || data.state === 'loading'" size="small" color="text-light" data-test-id="recent-runs-loading">{{ t('uiExtensions.view.loading') }}</N8nText>
			<N8nCallout v-else-if="data.state === 'error'" theme="danger" data-test-id="recent-runs-error">
				<div :style="between">
					<span>{{ t('uiExtensions.view.loadError') }}</span>
					<N8nButton variant="outline" size="small" data-test-id="recent-runs-retry" @click="refresh">{{ t('uiExtensions.view.retry') }}</N8nButton>
				</div>
			</N8nCallout>
			<template v-else-if="runs">
				<N8nCallout v-if="runs.lastError" theme="danger" data-test-id="recent-runs-last-error">
					<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs)">
						<N8nText size="small" bold>{{ runs.lastError.nodeName ? t('uiExtensions.recentRuns.lastError', { node: runs.lastError.nodeName }) : t('uiExtensions.recentRuns.lastErrorNoNode') }}</N8nText>
						<N8nText size="small" style="overflow-wrap: anywhere">{{ runs.lastError.message }}</N8nText>
					</div>
				</N8nCallout>
				<template v-if="runs.items.length > 0">
					<div :style="tiles" data-test-id="recent-runs-summary">
						<div v-for="stat in summary" :key="stat.key" :style="tile" :data-test-id="'recent-runs-stat-' + stat.key">
							<N8nText size="xsmall" color="text-light">{{ t('uiExtensions.recentRuns.summary.' + stat.key) }}</N8nText>
							<N8nText size="large" bold>{{ stat.value }}</N8nText>
						</div>
					</div>
					<div style="display: flex; flex-direction: column; gap: var(--spacing--4xs)">
						<N8nText size="xsmall" color="text-light">{{ t('uiExtensions.recentRuns.chart.title') }}</N8nText>
						<div :style="chart" data-test-id="recent-runs-chart">
							<button
								v-for="entry in bars"
								:key="entry.run.id"
								type="button"
								:style="[bar, { height: entry.height + '%', backgroundColor: entry.color }]"
								:title="entry.label"
								:aria-label="entry.label"
								tabindex="-1"
								data-test-id="recent-runs-bar"
								:data-status="entry.run.status"
								@click="open(entry.run)"
							/>
						</div>
					</div>
					<div v-if="topWorkflows.length > 0" style="display: flex; flex-direction: column; gap: var(--spacing--4xs)" data-test-id="recent-runs-top-workflows">
						<N8nText size="xsmall" color="text-light">{{ t('uiExtensions.recentRuns.topWorkflows.title') }}</N8nText>
						<div v-for="workflow in topWorkflows" :key="workflow.workflowId" :style="between" data-test-id="recent-runs-top-workflow">
							<N8nText size="small" bold style="overflow-wrap: anywhere; min-width: 0">{{ workflow.name }}</N8nText>
							<span :style="row" style="flex-shrink: 0">
								<N8nBadge variant="subtle">{{ t('uiExtensions.recentRuns.topWorkflows.runs', { count: workflow.runs }) }}</N8nBadge>
								<N8nBadge v-if="workflow.failures > 0" variant="danger">{{ t('uiExtensions.recentRuns.topWorkflows.failures', { count: workflow.failures }) }}</N8nBadge>
							</span>
						</div>
					</div>
				</template>
				<N8nText v-if="runs.items.length === 0" size="small" color="text-light" data-test-id="recent-runs-empty">
					{{ runs.scope === 'workflow' ? t('uiExtensions.recentRuns.empty.workflow') : t('uiExtensions.recentRuns.empty.all') }}
				</N8nText>
				<button
					v-for="run in runs.items"
					:key="run.id"
					type="button"
					:style="runButton"
					:title="t('uiExtensions.recentRuns.openRun')"
					data-test-id="recent-runs-run"
					:data-status="run.status"
					:data-execution-id="run.id"
					@click="open(run)"
				>
					<span :style="between" style="width: 100%">
						<N8nBadge :variant="badge(run.status)" data-test-id="recent-runs-status">{{ t('uiExtensions.recentRuns.status.' + run.status) }}</N8nBadge>
						<N8nText size="small" color="text-light">{{ startedAgo(run.startedAt) }}</N8nText>
					</span>
					<N8nText v-if="runs.scope === 'all'" size="small" bold data-test-id="recent-runs-workflow" style="overflow-wrap: anywhere">{{ workflowName(run) }}</N8nText>
					<span :style="row">
						<N8nTag :text="modeLabel(run.mode)" :clickable="false" data-test-id="recent-runs-mode" />
						<span v-if="duration(run)" :style="row" style="gap: var(--spacing--4xs)">
							<N8nIcon icon="clock" size="small" color="text-light" />
							<N8nText size="small" color="text-light" data-test-id="recent-runs-duration">{{ duration(run) }}</N8nText>
						</span>
					</span>
				</button>
			</template>
		</section>
	`,
};
