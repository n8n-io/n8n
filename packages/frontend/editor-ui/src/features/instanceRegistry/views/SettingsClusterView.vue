<script setup lang="ts">
import { computed, onBeforeMount, ref } from 'vue';
import { useCssVar, useIntervalFn } from '@vueuse/core';
import type { ChartData, ChartOptions } from 'chart.js';
import { Line } from 'vue-chartjs';
import { N8nHeading, N8nText, N8nBadge } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { CLUSTER_INFO_POLL_INTERVAL } from '@/app/constants';
import { useInstanceRegistryStore } from '@/features/instanceRegistry/stores/instanceRegistry.store';

// Rolling window of memory samples collected while the page is open — no history
// from before it was opened. At a 1s poll this is ~2 minutes of trend.
const MAX_SAMPLES = 120;
// One color per process line; index-based, wraps if more than 6 processes.
const LINE_COLORS = ['#ff6f5c', '#13cd67', '#5a67d8', '#f0a020', '#8b5cf6', '#0ea5e9'];

const i18n = useI18n();
const store = useInstanceRegistryStore();

const instances = computed(() => store.clusterInfo?.instances ?? []);
const localProcess = computed(() => store.clusterProcessInfo?.self ?? null);
const processes = computed(() => store.clusterProcessInfo?.processes ?? []);
const transports = computed(() => Object.entries(localProcess.value?.transports ?? {}));

// pid → memory (MiB) samples. Reassigned each tick so the chart data is reactive;
// only pids present in the latest sample are kept, so a dead process's line drops.
const history = ref<Record<number, number[]>>({});
function recordSample() {
	const next: Record<number, number[]> = {};
	for (const process of processes.value) {
		const prev = history.value[process.pid] ?? [];
		next[process.pid] = [...prev, process.memoryUsageMb].slice(-MAX_SAMPLES);
	}
	history.value = next;
}

const textColor = useCssVar('--color--text--tint-1', document.body);
const gridColor = useCssVar('--color--foreground', document.body);

const memoryChartData = computed<ChartData<'line'>>(() => {
	const maxLen = Math.max(0, ...Object.values(history.value).map((v) => v.length));
	return {
		labels: Array.from({ length: maxLen }, () => ''),
		datasets: processes.value.map((process, i) => {
			const samples = history.value[process.pid] ?? [];
			// Left-pad with nulls so every series is right-aligned to "now".
			const data = [...Array<null>(maxLen - samples.length).fill(null), ...samples];
			return {
				label: `${process.role} (${process.pid})`,
				data,
				borderColor: LINE_COLORS[i % LINE_COLORS.length],
				backgroundColor: LINE_COLORS[i % LINE_COLORS.length],
				tension: 0.3,
				pointRadius: 0,
				fill: false,
			};
		}),
	};
});

const memoryChartOptions = computed<ChartOptions<'line'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	animation: false,
	plugins: {
		legend: {
			display: true,
			position: 'top',
			align: 'end',
			labels: { boxWidth: 8, boxHeight: 8, color: textColor.value },
		},
		tooltip: {
			callbacks: { label: (ctx) => `${ctx.dataset.label ?? ''}: ${ctx.parsed.y} MiB` },
		},
	},
	scales: {
		x: { display: false, grid: { display: false } },
		y: {
			beginAtZero: true,
			title: { display: true, text: 'MiB', color: textColor.value },
			grid: { color: gridColor.value },
			ticks: { maxTicksLimit: 4, color: textColor.value },
		},
	},
}));

onBeforeMount(async () => {
	await Promise.all([store.fetchClusterInfo(), store.fetchClusterProcessInfo()]);
	recordSample();
});

// Repeated polls legitimately answer from different PIDs (HTTP round-robin) — that
// rotation is expected, not a bug.
useIntervalFn(async () => {
	await store.fetchClusterProcessInfo();
	recordSample();
}, CLUSTER_INFO_POLL_INTERVAL);
</script>

<template>
	<div :class="$style.container">
		<N8nHeading size="2xlarge" tag="h1">{{ i18n.baseText('settings.cluster') }}</N8nHeading>
		<N8nText color="text-light">{{ i18n.baseText('settings.cluster.description') }}</N8nText>

		<section :class="$style.section">
			<N8nHeading size="large" tag="h2">{{
				i18n.baseText('settings.cluster.thisProcess')
			}}</N8nHeading>
			<N8nText color="text-light" size="small">{{
				i18n.baseText('settings.cluster.pidRotationNote')
			}}</N8nText>

			<dl v-if="localProcess" :class="$style.grid">
				<div :class="$style.field">
					<dt><N8nText color="text-light" size="small">PID</N8nText></dt>
					<dd>
						<N8nText bold>{{ localProcess.pid }}</N8nText>
						<N8nBadge v-if="localProcess.isLeader" theme="primary">{{
							i18n.baseText('settings.cluster.leader')
						}}</N8nBadge>
					</dd>
				</div>
				<div :class="$style.field">
					<dt><N8nText color="text-light" size="small">Role</N8nText></dt>
					<dd>
						<N8nText>{{ localProcess.role }}</N8nText>
					</dd>
				</div>
				<div :class="$style.field">
					<dt>
						<N8nText color="text-light" size="small">{{
							i18n.baseText('settings.cluster.memory')
						}}</N8nText>
					</dt>
					<dd>
						<N8nText>{{ localProcess.memoryUsageMb }} MiB</N8nText>
					</dd>
				</div>
				<div :class="$style.field">
					<dt>
						<N8nText color="text-light" size="small">{{
							i18n.baseText('settings.cluster.uptime')
						}}</N8nText>
					</dt>
					<dd>
						<N8nText>{{ localProcess.uptimeSeconds }}s</N8nText>
					</dd>
				</div>
				<div v-if="localProcess.respawnCount !== undefined" :class="$style.field">
					<dt>
						<N8nText color="text-light" size="small">{{
							i18n.baseText('settings.cluster.respawns')
						}}</N8nText>
					</dt>
					<dd>
						<N8nText>{{ localProcess.respawnCount }}</N8nText>
					</dd>
				</div>
			</dl>

			<div :class="$style.transports">
				<N8nText color="text-light" size="small">{{
					i18n.baseText('settings.cluster.transports')
				}}</N8nText>
				<div :class="$style.badges">
					<N8nBadge v-for="[subsystem, mode] in transports" :key="subsystem" theme="tertiary">
						{{ subsystem }}: {{ mode }}
					</N8nBadge>
				</div>
			</div>
		</section>

		<section v-if="processes.length" :class="$style.section">
			<N8nHeading size="large" tag="h2">{{
				i18n.baseText('settings.cluster.memoryChart')
			}}</N8nHeading>
			<N8nText color="text-light" size="small">{{
				i18n.baseText('settings.cluster.memoryChartNote')
			}}</N8nText>
			<div :class="$style.chart">
				<Line :data="memoryChartData" :options="memoryChartOptions" />
			</div>
		</section>

		<section v-if="processes.length" :class="$style.section">
			<N8nHeading size="large" tag="h2">{{
				i18n.baseText('settings.cluster.allProcesses')
			}}</N8nHeading>
			<table :class="$style.table">
				<thead>
					<tr>
						<th><N8nText color="text-light" size="small">PID</N8nText></th>
						<th><N8nText color="text-light" size="small">Role</N8nText></th>
						<th><N8nText color="text-light" size="small">Leader</N8nText></th>
						<th>
							<N8nText color="text-light" size="small">{{
								i18n.baseText('settings.cluster.memory')
							}}</N8nText>
						</th>
						<th>
							<N8nText color="text-light" size="small">{{
								i18n.baseText('settings.cluster.uptime')
							}}</N8nText>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="process in processes" :key="process.pid">
						<td>
							<N8nText :bold="process.pid === localProcess?.pid">{{ process.pid }}</N8nText>
						</td>
						<td>
							<N8nText>{{ process.role }}</N8nText>
						</td>
						<td>
							<N8nBadge v-if="process.isLeader" theme="primary">{{
								i18n.baseText('settings.cluster.leader')
							}}</N8nBadge>
							<N8nText v-else color="text-light">—</N8nText>
						</td>
						<td>
							<N8nText>{{ process.memoryUsageMb }} MiB</N8nText>
						</td>
						<td>
							<N8nText>{{ process.uptimeSeconds }}s</N8nText>
						</td>
					</tr>
				</tbody>
			</table>
		</section>

		<section :class="$style.section">
			<N8nHeading size="large" tag="h2">{{
				i18n.baseText('settings.cluster.instances')
			}}</N8nHeading>
			<table :class="$style.table">
				<thead>
					<tr>
						<th><N8nText color="text-light" size="small">Host</N8nText></th>
						<th><N8nText color="text-light" size="small">PID</N8nText></th>
						<th><N8nText color="text-light" size="small">Role</N8nText></th>
						<th><N8nText color="text-light" size="small">Leader</N8nText></th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="instance in instances" :key="instance.instanceKey">
						<td>
							<N8nText>{{ instance.hostId }}</N8nText>
						</td>
						<td>
							<N8nText>{{ instance.pid ?? '—' }}</N8nText>
						</td>
						<td>
							<N8nText>{{ instance.instanceType }}</N8nText>
						</td>
						<td>
							<N8nBadge v-if="instance.instanceRole === 'leader'" theme="primary">{{
								i18n.baseText('settings.cluster.leader')
							}}</N8nBadge>
							<N8nText v-else color="text-light">—</N8nText>
						</td>
					</tr>
				</tbody>
			</table>
		</section>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-l);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: var(--spacing-s);
	margin: var(--spacing-xs) 0 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-4xs);

	dd {
		display: flex;
		align-items: center;
		gap: var(--spacing-2xs);
		margin: 0;
	}
}

.transports {
	margin-top: var(--spacing-xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}

.badges {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-2xs);
}

.chart {
	position: relative;
	height: 240px;
	margin-top: var(--spacing-xs);
}

.table {
	width: 100%;
	border-collapse: collapse;
	margin-top: var(--spacing-xs);

	th,
	td {
		text-align: left;
		padding: var(--spacing-2xs) var(--spacing-xs);
		border-bottom: var(--border-base);
	}
}
</style>
