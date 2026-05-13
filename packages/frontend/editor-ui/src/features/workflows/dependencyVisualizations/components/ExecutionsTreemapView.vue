<script lang="ts" setup>
import type { InsightsByWorkflow } from '@n8n/api-types';
import * as d3 from 'd3';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

import { N8nButton, N8nIcon, N8nLoading, N8nText } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';

import {
	fetchInsightsByWorkflow,
	triggerInsightsCompaction,
} from '@/features/execution/insights/insights.api';

type WorkflowRow = InsightsByWorkflow['data'][number];

type SizeMetric = 'count' | 'runtime';

interface RangeOption {
	value: '7' | '30' | '90';
	label: string;
	days: number;
}

const RANGES: RangeOption[] = [
	{ value: '7', label: 'Last 7 days', days: 7 },
	{ value: '30', label: 'Last 30 days', days: 30 },
	{ value: '90', label: 'Last 90 days', days: 90 },
];

const rootStore = useRootStore();

const container = useTemplateRef<HTMLDivElement>('container');
const sizeMetric = ref<SizeMetric>('count');
const range = ref<RangeOption['value']>('7');
const rows = ref<WorkflowRow[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const lastUpdatedAt = ref<Date | null>(null);
const error = ref<string | null>(null);
const selectedWorkflowId = ref<string | null>(null);

let resizeObserver: ResizeObserver | null = null;

const PALETTE = [
	'#3b82f6',
	'#ef4444',
	'#22c55e',
	'#f59e0b',
	'#a855f7',
	'#06b6d4',
	'#ec4899',
	'#84cc16',
	'#f97316',
	'#8b5cf6',
	'#14b8a6',
	'#eab308',
];

function palette(i: number): string {
	if (i < PALETTE.length) return PALETTE[i];
	const hue = (i * 137.508) % 360;
	return `hsl(${hue}, 70%, 60%)`;
}

const projectStats = computed(() => {
	const stats = new Map<
		string,
		{ id: string | null; name: string; count: number; runtime: number }
	>();
	for (const row of rows.value) {
		const key = row.projectId ?? '__unprojected__';
		const existing = stats.get(key) ?? {
			id: row.projectId,
			name: row.projectName || (row.projectId ? row.projectId : '(no project)'),
			count: 0,
			runtime: 0,
		};
		existing.count += row.total;
		existing.runtime += row.runTime;
		stats.set(key, existing);
	}
	return [...stats.values()].sort((a, b) =>
		sizeMetric.value === 'count' ? b.count - a.count : b.runtime - a.runtime,
	);
});

/**
 * Palette index per project — ordered by total **execution count** regardless
 * of which size metric the user is viewing. This keeps each project tied to a
 * stable colour: switching count ↔ runtime reorders the tiles but never
 * repaints them. Largest project still gets palette slot 0 (maximally
 * distinct) so the top of the chart is also the top of the palette.
 */
const projectIndex = computed(() => {
	const sorted = [...projectStats.value].sort((a, b) => b.count - a.count);
	const map = new Map<string, number>();
	sorted.forEach((p, i) => map.set(p.id ?? '__unprojected__', i));
	return map;
});

const totals = computed(() => {
	let count = 0;
	let runtime = 0;
	for (const row of rows.value) {
		count += row.total;
		runtime += row.runTime;
	}
	return { count, runtime };
});

const selectedRow = computed(() => {
	if (!selectedWorkflowId.value) return null;
	return rows.value.find((r) => r.workflowId === selectedWorkflowId.value) ?? null;
});

function fmtRuntime(ms: number): string {
	if (ms < 1) return '0ms';
	if (ms < 1000) return `${ms.toFixed(0)}ms`;
	if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
	if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
	return `${(ms / 3_600_000).toFixed(1)}h`;
}

function fmtCount(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return `${n}`;
}

interface HierarchyDatum {
	id: string;
	name: string;
	projectId: string | null;
	row?: WorkflowRow;
	children?: HierarchyDatum[];
}

function buildHierarchy(): HierarchyDatum {
	// Group workflows by project. Workflows with zero value for the active
	// metric are dropped — they'd render as 0-area tiles anyway.
	const projects = new Map<string, HierarchyDatum>();
	for (const row of rows.value) {
		const value = sizeMetric.value === 'count' ? row.total : row.runTime;
		if (value <= 0) continue;
		const projectKey = row.projectId ?? '__unprojected__';
		let project = projects.get(projectKey);
		if (!project) {
			project = {
				id: projectKey,
				name: row.projectName || (row.projectId ? row.projectId : '(no project)'),
				projectId: row.projectId,
				children: [],
			};
			projects.set(projectKey, project);
		}
		project.children!.push({
			id: row.workflowId ?? `deleted:${row.workflowName}`,
			name: row.workflowName || '(unnamed)',
			projectId: row.projectId,
			row,
		});
	}
	return {
		id: 'root',
		name: 'All executions',
		projectId: null,
		children: [...projects.values()],
	};
}

async function load() {
	loading.value = true;
	error.value = null;
	selectedWorkflowId.value = null;
	try {
		const days = RANGES.find((r) => r.value === range.value)?.days ?? 7;
		const now = new Date();
		const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
		const response = await fetchInsightsByWorkflow(rootStore.restApiContext, {
			startDate: start,
			endDate: now,
			skip: 0,
			take: 100,
			sortBy: sizeMetric.value === 'runtime' ? 'runTime:desc' : 'total:desc',
		});
		rows.value = response.data;
		lastUpdatedAt.value = new Date();
	} catch (e) {
		error.value = e instanceof Error ? e.message : String(e);
		rows.value = [];
	} finally {
		loading.value = false;
	}
}

/**
 * Trigger a buffer flush + compaction on the backend, then re-read. Without
 * this, executions that finished after the last scheduled compaction (up to
 * 60 min by default) wouldn't appear in the treemap.
 */
async function refresh() {
	if (refreshing.value) return;
	refreshing.value = true;
	try {
		try {
			await triggerInsightsCompaction(rootStore.restApiContext);
		} catch {
			// If compaction isn't available (insights module disabled, license, etc.)
			// fall through to a plain re-read so the UI still updates.
		}
		await load();
		render();
	} finally {
		refreshing.value = false;
	}
}

function fmtRelative(when: Date | null): string {
	if (!when) return 'never';
	const diff = (Date.now() - when.getTime()) / 1000;
	if (diff < 5) return 'just now';
	if (diff < 60) return `${Math.floor(diff)}s ago`;
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	return `${Math.floor(diff / 3600)}h ago`;
}

function render() {
	if (!container.value) return;
	const host = container.value;
	host.innerHTML = '';

	const width = host.clientWidth || 800;
	const height = host.clientHeight || 600;

	if (rows.value.length === 0) return;

	const data = buildHierarchy();
	const hierarchy = d3
		.hierarchy<HierarchyDatum>(data)
		.sum((d) => {
			if (!d.row) return 0;
			return sizeMetric.value === 'count' ? d.row.total : d.row.runTime;
		})
		.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

	// Reserve a 20px label band at the top of every project tile so workflow
	// children get laid out below the label instead of underneath it.
	const PROJECT_LABEL_BAND = 20;
	const root = d3
		.treemap<HierarchyDatum>()
		.size([width, height])
		.paddingTop((d) => (d.depth === 1 ? PROJECT_LABEL_BAND : 0))
		.paddingInner(2)
		.paddingOuter(2)
		.round(true)(hierarchy);

	const svg = d3
		.select(host)
		.append<SVGSVGElement>('svg')
		.attr('width', width)
		.attr('height', height)
		.attr('viewBox', [0, 0, width, height])
		.style('width', '100%')
		.style('height', '100%')
		.style('background', 'var(--color-background-xlight)');

	const projectIdx = projectIndex.value;

	// Project headers (with labels)
	const projectGroups = svg
		.selectAll<SVGGElement, d3.HierarchyRectangularNode<HierarchyDatum>>('g.project')
		.data(root.children ?? [])
		.join('g')
		.attr('class', 'project');

	projectGroups
		.append('rect')
		.attr('x', (d) => d.x0)
		.attr('y', (d) => d.y0)
		.attr('width', (d) => d.x1 - d.x0)
		.attr('height', (d) => d.y1 - d.y0)
		.attr('fill', (d) => {
			const idx = projectIdx.get(d.data.id) ?? 0;
			return d3.color(palette(idx))?.copy({ opacity: 0.18 })?.toString() ?? 'transparent';
		})
		.attr('stroke', (d) => palette(projectIdx.get(d.data.id) ?? 0))
		.attr('stroke-width', 1);

	// Project label band — only when the rect is taller than the band and wide
	// enough to fit a meaningful slice of the project name.
	projectGroups
		.filter((d) => d.x1 - d.x0 > 70 && d.y1 - d.y0 > PROJECT_LABEL_BAND + 4)
		.append('text')
		.attr('x', (d) => d.x0 + 6)
		.attr('y', (d) => d.y0 + 14)
		.attr('font-size', 11)
		.attr('font-weight', 600)
		.attr('fill', (d) => palette(projectIdx.get(d.data.id) ?? 0))
		.text((d) => {
			const value =
				sizeMetric.value === 'count' ? fmtCount(d.value ?? 0) : fmtRuntime(d.value ?? 0);
			const label = `${d.data.name} · ${value}`;
			// Roughly 6.2px per char at 11px bold; leave 12px breathing room on the right.
			const availableChars = Math.max(3, Math.floor((d.x1 - d.x0 - 18) / 6.2));
			return label.length > availableChars ? `${label.slice(0, availableChars - 1)}…` : label;
		});

	const leaves = root.leaves();

	const tiles = svg
		.selectAll<SVGGElement, d3.HierarchyRectangularNode<HierarchyDatum>>('g.tile')
		.data(leaves)
		.join('g')
		.attr('class', 'tile')
		.style('cursor', 'pointer')
		.on('click', (_event, d) => {
			selectedWorkflowId.value =
				selectedWorkflowId.value === d.data.row?.workflowId
					? null
					: (d.data.row?.workflowId ?? null);
		});

	tiles
		.append('rect')
		.attr('x', (d) => d.x0)
		.attr('y', (d) => d.y0)
		.attr('width', (d) => Math.max(0, d.x1 - d.x0))
		.attr('height', (d) => Math.max(0, d.y1 - d.y0))
		.attr('fill', (d) => palette(projectIdx.get(d.data.projectId ?? '__unprojected__') ?? 0))
		.attr('fill-opacity', (d) =>
			selectedWorkflowId.value && selectedWorkflowId.value !== d.data.row?.workflowId ? 0.35 : 0.85,
		)
		.attr('stroke', (d) =>
			selectedWorkflowId.value === d.data.row?.workflowId ? '#0f172a' : 'rgba(0,0,0,0.15)',
		)
		.attr('stroke-width', (d) => (selectedWorkflowId.value === d.data.row?.workflowId ? 2 : 0.5));

	tiles.append('title').text((d) => {
		const r = d.data.row;
		if (!r) return d.data.name;
		return [
			r.workflowName || '(unnamed)',
			r.projectName ? `Project: ${r.projectName}` : null,
			`Executions: ${r.total} (${r.succeeded} ok / ${r.failed} fail)`,
			`Total runtime: ${fmtRuntime(r.runTime)}`,
			`Avg runtime: ${fmtRuntime(r.averageRunTime)}`,
		]
			.filter(Boolean)
			.join('\n');
	});

	// Workflow labels — only on tiles big enough to read them.
	tiles
		.filter((d) => d.x1 - d.x0 > 50 && d.y1 - d.y0 > 30)
		.append('text')
		.attr('x', (d) => d.x0 + 6)
		.attr('y', (d) => d.y0 + 16)
		.attr('font-size', 11)
		.attr('fill', '#0f172a')
		.attr('pointer-events', 'none')
		.text((d) => {
			const w = d.x1 - d.x0;
			const maxChars = Math.max(3, Math.floor(w / 7));
			const name = d.data.name;
			return name.length > maxChars ? `${name.slice(0, maxChars - 1)}…` : name;
		});

	tiles
		.filter((d) => d.x1 - d.x0 > 70 && d.y1 - d.y0 > 46)
		.append('text')
		.attr('x', (d) => d.x0 + 6)
		.attr('y', (d) => d.y0 + 30)
		.attr('font-size', 10)
		.attr('fill', 'rgba(15, 23, 42, 0.65)')
		.attr('pointer-events', 'none')
		.text((d) => {
			const r = d.data.row;
			if (!r) return '';
			return sizeMetric.value === 'count' ? `${fmtCount(r.total)} runs` : fmtRuntime(r.runTime);
		});
}

onMounted(async () => {
	await load();
	render();
	if (container.value) {
		resizeObserver = new ResizeObserver(() => render());
		resizeObserver.observe(container.value);
	}
});

onBeforeUnmount(() => {
	resizeObserver?.disconnect();
	resizeObserver = null;
});

watch([range], async () => {
	await load();
	render();
});
watch([sizeMetric, selectedWorkflowId], () => render());
</script>

<template>
	<div :class="$style.wrapper">
		<aside :class="$style.sidebar">
			<section :class="$style.section">
				<span :class="$style.sectionTitle">Size by</span>
				<div :class="$style.segmented" role="tablist">
					<button
						type="button"
						role="tab"
						:aria-selected="sizeMetric === 'count'"
						:class="[$style.segment, sizeMetric === 'count' && $style.segmentActive]"
						@click="sizeMetric = 'count'"
					>
						Execution count
					</button>
					<button
						type="button"
						role="tab"
						:aria-selected="sizeMetric === 'runtime'"
						:class="[$style.segment, sizeMetric === 'runtime' && $style.segmentActive]"
						@click="sizeMetric = 'runtime'"
					>
						Total runtime
					</button>
				</div>
			</section>

			<section :class="$style.section">
				<span :class="$style.sectionTitle">Range</span>
				<div :class="$style.segmented" role="tablist">
					<button
						v-for="r in RANGES"
						:key="r.value"
						type="button"
						role="tab"
						:aria-selected="range === r.value"
						:class="[$style.segment, range === r.value && $style.segmentActive]"
						@click="range = r.value"
					>
						{{ r.days }}d
					</button>
				</div>
			</section>

			<section :class="$style.section">
				<header :class="$style.sectionHeader">
					<span :class="$style.sectionTitle">Data</span>
					<span :class="$style.subtle">Updated {{ fmtRelative(lastUpdatedAt) }}</span>
				</header>
				<N8nButton
					type="tertiary"
					size="small"
					icon="refresh-cw"
					:loading="refreshing || loading"
					full-width
					@click="refresh"
				>
					Refresh
				</N8nButton>
				<p :class="$style.hint">
					Insights are aggregated every 60 min by default — clicking Refresh forces a flush +
					compaction so executions that just finished show up immediately.
				</p>
			</section>

			<section :class="$style.section">
				<header :class="$style.sectionHeader">
					<span :class="$style.sectionTitle">Totals</span>
				</header>
				<dl :class="$style.totals">
					<dt>Executions</dt>
					<dd>{{ fmtCount(totals.count) }}</dd>
					<dt>Total runtime</dt>
					<dd>{{ fmtRuntime(totals.runtime) }}</dd>
					<dt>Workflows</dt>
					<dd>{{ rows.length }}</dd>
					<dt>Projects</dt>
					<dd>{{ projectStats.length }}</dd>
				</dl>
			</section>

			<section v-if="selectedRow" :class="$style.section">
				<header :class="$style.sectionHeader">
					<span :class="$style.sectionTitle">Selected</span>
					<button type="button" :class="$style.linkButton" @click="selectedWorkflowId = null">
						Clear
					</button>
				</header>
				<div :class="$style.selectedCard">
					<div :class="$style.selectedName">{{ selectedRow.workflowName || '(unnamed)' }}</div>
					<dl :class="$style.metaList">
						<dt>Project</dt>
						<dd>{{ selectedRow.projectName || '—' }}</dd>
						<dt>Executions</dt>
						<dd>
							{{ selectedRow.total }} ({{ selectedRow.succeeded }} ok ·
							{{ selectedRow.failed }} fail)
						</dd>
						<dt>Total runtime</dt>
						<dd>{{ fmtRuntime(selectedRow.runTime) }}</dd>
						<dt>Avg runtime</dt>
						<dd>{{ fmtRuntime(selectedRow.averageRunTime) }}</dd>
						<dt>Failure rate</dt>
						<dd>{{ (selectedRow.failureRate * 100).toFixed(1) }}%</dd>
					</dl>
				</div>
			</section>

			<section :class="$style.section">
				<header :class="$style.sectionHeader">
					<span :class="$style.sectionTitle">Projects</span>
				</header>
				<div :class="$style.projectList">
					<div v-for="p in projectStats" :key="p.id ?? '__nop__'" :class="$style.projectRow">
						<span
							:class="$style.projectSwatch"
							:style="{
								background: palette(projectIndex.get(p.id ?? '__unprojected__') ?? 0),
							}"
						/>
						<span :class="$style.projectName" :title="p.name">{{ p.name }}</span>
						<span :class="$style.projectValue">
							{{ sizeMetric === 'count' ? fmtCount(p.count) : fmtRuntime(p.runtime) }}
						</span>
					</div>
				</div>
			</section>

			<section :class="$style.section">
				<p :class="$style.hint">
					Each tile is a workflow, sized by its share of
					{{ sizeMetric === 'count' ? 'execution count' : 'total runtime' }}. Tiles are grouped and
					coloured by project so coupling and load distribution are visible at a glance.
				</p>
			</section>
		</aside>
		<div :class="$style.canvasWrapper">
			<div v-if="loading" :class="$style.center">
				<N8nLoading :rows="4" />
			</div>
			<div v-else-if="error" :class="$style.center">
				<N8nIcon icon="triangle-alert" :class="$style.errorIcon" />
				<N8nText color="danger"> Couldn't load execution insights: {{ error }} </N8nText>
				<N8nText color="text-light" size="small">
					This view requires the insights module to be enabled.
				</N8nText>
			</div>
			<div v-else-if="rows.length === 0" :class="$style.center">
				<N8nText color="text-light"> No executions in the selected range. </N8nText>
			</div>
			<div v-else ref="container" :class="$style.canvas" />
		</div>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	height: 100%;
	min-height: 0;
	gap: var(--spacing--sm);
}

.sidebar {
	flex: 0 0 272px;
	overflow-y: auto;
	padding: var(--spacing--md);
	background: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size--2xs);
	color: var(--color-text-base);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);

	& + & {
		padding-top: var(--spacing--md);
		border-top: 1px solid var(--color-foreground-base);
	}
}

.sectionHeader {
	display: flex;
	justify-content: space-between;
	align-items: baseline;
	gap: var(--spacing--2xs);
}

.sectionTitle {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	color: var(--color-text-light);
	letter-spacing: 0.08em;
}

.linkButton {
	background: transparent;
	border: 0;
	color: var(--color--primary);
	font-size: var(--font-size--3xs);
	cursor: pointer;
	padding: 0;

	&:hover {
		text-decoration: underline;
	}
}

.segmented {
	display: flex;
	padding: 2px;
	background: var(--color-background-light);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	gap: 2px;
}

.segment {
	flex: 1;
	background: transparent;
	border: 0;
	border-radius: 4px;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--color-text-light);
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		color 0.15s ease;

	&:hover {
		color: var(--color-text-base);
		background: var(--color-background-base);
	}
}

.segmentActive {
	background: var(--color--primary);
	color: var(--color--neutral-white);
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);

	&:hover {
		color: var(--color--neutral-white);
		background: var(--color--primary);
	}
}

.totals {
	display: grid;
	grid-template-columns: max-content 1fr;
	row-gap: var(--spacing--3xs);
	column-gap: var(--spacing--sm);
	margin: 0;

	dt {
		color: var(--color-text-light);
		font-size: var(--font-size--3xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	dd {
		margin: 0;
		color: var(--color-text-dark);
		font-size: var(--font-size--2xs);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
}

.selectedCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	background: var(--color-background-light);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
}

.selectedName {
	font-weight: var(--font-weight--bold);
	color: var(--color-text-dark);
	word-break: break-word;
	font-size: var(--font-size--sm);
	line-height: 1.35;
}

.metaList {
	display: grid;
	grid-template-columns: max-content 1fr;
	row-gap: var(--spacing--3xs);
	column-gap: var(--spacing--sm);
	margin: 0;
	padding-top: var(--spacing--2xs);
	border-top: 1px solid var(--color-foreground-base);

	dt {
		color: var(--color-text-light);
		font-size: var(--font-size--3xs);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	dd {
		margin: 0;
		color: var(--color-text-base);
		font-size: var(--font-size--2xs);
		word-break: break-word;
	}
}

.projectList {
	display: flex;
	flex-direction: column;
	max-height: 240px;
	overflow-y: auto;
}

.projectRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	border-radius: var(--border-radius-base);

	&:hover {
		background: var(--color-background-base);
	}
}

.projectSwatch {
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 2px;
	flex-shrink: 0;
}

.projectName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.projectValue {
	flex-shrink: 0;
	color: var(--color-text-light);
	font-size: var(--font-size--3xs);
	font-variant-numeric: tabular-nums;
}

.hint {
	color: var(--color-text-light);
	font-size: var(--font-size--3xs);
	margin: var(--spacing--2xs) 0 0;
	line-height: 1.55;
}

.subtle {
	color: var(--color-text-light);
	font-size: var(--font-size--3xs);
	font-variant-numeric: tabular-nums;
}

.canvasWrapper {
	flex: 1;
	min-width: 0;
	min-height: 0;
	position: relative;
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	background: var(--color-background-xlight);
	display: flex;
}

.canvas {
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.center {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--lg);
	text-align: center;
}

.errorIcon {
	color: var(--color-danger);
	font-size: 24px;
}
</style>
