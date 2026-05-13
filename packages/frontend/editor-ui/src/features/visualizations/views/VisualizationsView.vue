<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch, nextTick } from 'vue';
import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
import { useRootStore } from '@n8n/stores/useRootStore';
import { makeRestApiRequest } from '@n8n/rest-api-client';

type Bucket = 'internal' | 'external-known' | 'external-dynamic' | 'external-unverified';

interface ClassifiedNode {
	id: string;
	name: string;
	type: string;
	bucket: Bucket;
	vendor: string | null;
	destination: string | null;
}
interface ClassifiedEdge {
	from: string;
	to: string;
	port: string;
}
interface ClassifiedWorkflow {
	id: string;
	name: string;
	active: boolean;
	nodes: ClassifiedNode[];
	edges: ClassifiedEdge[];
}

const rootStore = useRootStore();
const workflows = ref<ClassifiedWorkflow[]>([]);
const selectedId = ref<string | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const cyContainer = ref<HTMLElement | null>(null);
let cy: Core | null = null;

const selected = computed(() => workflows.value.find((w) => w.id === selectedId.value) ?? null);

const summary = computed(() => {
	const counts: Record<Bucket, number> = {
		internal: 0,
		'external-known': 0,
		'external-dynamic': 0,
		'external-unverified': 0,
	};
	let stickyCount = 0;
	for (const wf of workflows.value) {
		for (const n of wf.nodes) {
			if (n.type === 'n8n-nodes-base.stickyNote') {
				stickyCount++;
				continue;
			}
			counts[n.bucket]++;
		}
	}
	return { counts, stickyCount };
});

const fetchData = async () => {
	loading.value = true;
	try {
		workflows.value = await makeRestApiRequest<ClassifiedWorkflow[]>(
			rootStore.restApiContext,
			'GET',
			'/visualizations/workflows',
		);
		if (workflows.value.length && !selectedId.value) {
			selectedId.value = workflows.value[0].id;
		}
	} catch (e) {
		error.value = String(e);
	} finally {
		loading.value = false;
	}
};

const COLOR: Record<Bucket, string> = {
	internal: '#22c55e',
	'external-known': '#ef4444',
	'external-dynamic': '#f59e0b',
	'external-unverified': '#a855f7',
};

const renderGraph = () => {
	if (!cyContainer.value || !selected.value) return;
	const wf = selected.value;
	const visibleNodes = wf.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote');
	const visibleIds = new Set(visibleNodes.map((n) => n.id));

	const elements: ElementDefinition[] = [];
	for (const n of visibleNodes) {
		const label = `${n.name}\n[${n.bucket}${n.vendor ? ` · ${n.vendor}` : ''}]`;
		elements.push({
			data: {
				id: n.id,
				label,
				bucket: n.bucket,
				type: n.type,
				vendor: n.vendor,
				dest: n.destination,
			},
		});
	}
	for (const e of wf.edges) {
		if (!visibleIds.has(e.from) || !visibleIds.has(e.to)) continue;
		elements.push({
			data: { id: `${e.from}->${e.to}:${e.port}`, source: e.from, target: e.to, port: e.port },
		});
	}

	if (cy) {
		cy.destroy();
		cy = null;
	}

	cy = cytoscape({
		container: cyContainer.value,
		elements,
		layout: { name: 'breadthfirst', directed: true, padding: 30, spacingFactor: 1.2 },
		style: [
			{
				selector: 'node',
				style: {
					'background-color': (ele: cytoscape.NodeSingular) =>
						COLOR[ele.data('bucket') as Bucket] ?? '#888',
					label: 'data(label)',
					'text-wrap': 'wrap',
					'text-max-width': '180px',
					'font-size': '10px',
					color: '#111',
					'text-valign': 'center',
					'text-halign': 'center',
					width: 'label',
					height: 'label',
					padding: '8px',
					shape: 'round-rectangle',
					'border-width': 1,
					'border-color': '#333',
				},
			},
			{
				selector: 'edge',
				style: {
					width: 2,
					'line-color': (ele: cytoscape.EdgeSingular) =>
						ele.data('port') !== 'main' ? '#9ca3af' : '#374151',
					'line-style': (ele: cytoscape.EdgeSingular) =>
						ele.data('port') !== 'main' ? 'dashed' : 'solid',
					'target-arrow-shape': 'triangle',
					'target-arrow-color': '#374151',
					'curve-style': 'bezier',
				},
			},
		],
	});
};

watch(selected, async () => {
	await nextTick();
	renderGraph();
});

onMounted(async () => {
	await fetchData();
	await nextTick();
	renderGraph();
});

onBeforeUnmount(() => {
	cy?.destroy();
	cy = null;
});
</script>

<template>
	<div class="viz-root">
		<aside class="viz-sidebar">
			<h2 class="viz-title">Visualizations</h2>
			<div class="viz-summary">
				<div>
					<span class="dot" :style="{ background: COLOR.internal }"></span>Internal:
					{{ summary.counts.internal }}
				</div>
				<div>
					<span class="dot" :style="{ background: COLOR['external-known'] }"></span>External
					(known): {{ summary.counts['external-known'] }}
				</div>
				<div>
					<span class="dot" :style="{ background: COLOR['external-dynamic'] }"></span>External
					(dynamic URL): {{ summary.counts['external-dynamic'] }}
				</div>
				<div>
					<span class="dot" :style="{ background: COLOR['external-unverified'] }"></span>Code w/
					network calls: {{ summary.counts['external-unverified'] }}
				</div>
				<div class="muted">sticky notes hidden: {{ summary.stickyCount }}</div>
			</div>
			<ul class="viz-list">
				<li
					v-for="wf in workflows"
					:key="wf.id"
					:class="{ active: wf.id === selectedId }"
					@click="selectedId = wf.id"
				>
					{{ wf.name }}
					<span class="muted"
						>({{ wf.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote').length }})</span
					>
				</li>
			</ul>
		</aside>
		<main class="viz-main">
			<div v-if="loading">Loading…</div>
			<div v-else-if="error" class="error">Failed to load: {{ error }}</div>
			<div v-else-if="!selected">No workflows.</div>
			<template v-else>
				<header class="viz-header">
					<strong>{{ selected.name }}</strong>
					<span class="muted"
						>{{ selected.active ? 'active' : 'inactive' }} · {{ selected.id }}</span
					>
				</header>
				<div ref="cyContainer" class="cy-canvas"></div>
			</template>
		</main>
	</div>
</template>

<style scoped lang="scss">
.viz-root {
	display: grid;
	grid-template-columns: 320px 1fr;
	height: 100%;
	width: 100%;
	background: var(--color-background-base, #fff);
	color: var(--color-text-base, #111);
}
.viz-sidebar {
	border-right: 1px solid var(--color-foreground-base, #ddd);
	padding: 16px;
	overflow-y: auto;
}
.viz-title {
	font-size: 18px;
	margin: 0 0 12px;
}
.viz-summary {
	font-size: 12px;
	margin-bottom: 16px;
	div {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 4px;
	}
}
.dot {
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
}
.viz-list {
	list-style: none;
	padding: 0;
	margin: 0;
	font-size: 13px;
	li {
		padding: 6px 8px;
		border-radius: 4px;
		cursor: pointer;
		&:hover {
			background: var(--color-foreground-light, #f0f0f0);
		}
		&.active {
			background: var(--color-primary-tint-3, #e3edff);
			font-weight: 600;
		}
	}
}
.viz-main {
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
}
.viz-header {
	padding: 12px 16px;
	border-bottom: 1px solid var(--color-foreground-base, #ddd);
	display: flex;
	align-items: baseline;
	gap: 12px;
}
.cy-canvas {
	flex: 1;
	min-height: 0;
	width: 100%;
}
.muted {
	color: var(--color-text-light, #888);
	font-weight: normal;
}
.error {
	padding: 16px;
	color: #c33;
}
</style>
