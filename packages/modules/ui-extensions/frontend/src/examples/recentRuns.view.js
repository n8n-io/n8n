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
const UNITS = [
	['day', 86400],
	['hour', 3600],
	['minute', 60],
];

const stack = 'display: flex; flex-direction: column; gap: var(--spacing--xs)';
const row = 'display: flex; align-items: center; gap: var(--spacing--2xs)';
const between =
	'display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--2xs)';
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

		function duration(run) {
			if (!run.startedAt || !run.stoppedAt) return '';
			const ms = Math.max(0, new Date(run.stoppedAt).getTime() - new Date(run.startedAt).getTime());
			const inSeconds = ms >= 1000;
			return new Intl.NumberFormat(locale.value, {
				style: 'unit',
				unit: inSeconds ? 'second' : 'millisecond',
				unitDisplay: 'short',
				maximumFractionDigits: 1,
			}).format(inSeconds ? ms / 1000 : ms);
		}

		return {
			context,
			data,
			runs,
			onWorkflow,
			subtitle,
			startedAgo,
			duration,
			modeLabel: (mode) =>
				KNOWN_MODES.includes(mode) ? t('uiExtensions.recentRuns.mode.' + mode) : mode,
			badge: (status) => STATUS_BADGE[status] ?? 'subtle',
			refresh: () => n8n.refresh(),
			open: (run) => n8n.openExecution(run.workflowId, run.id),
			stack,
			row,
			between,
			runButton,
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
					<N8nText v-if="runs.scope === 'all'" size="small" bold data-test-id="recent-runs-workflow" style="overflow-wrap: anywhere">{{ run.workflowName }}</N8nText>
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
