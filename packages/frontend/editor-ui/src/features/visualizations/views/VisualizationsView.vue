<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import cytoscape from 'cytoscape';
import type { Core, ElementDefinition } from 'cytoscape';
// @ts-expect-error -- no types shipped
import dagre from 'cytoscape-dagre';
import { useRootStore } from '@n8n/stores/useRootStore';
import { makeRestApiRequest } from '@n8n/rest-api-client';

cytoscape.use(dagre);

type Bucket = 'internal' | 'external-known' | 'external-dynamic' | 'external-unverified';

interface ClassifiedNode {
	id: string;
	name: string;
	type: string;
	bucket: Bucket;
	vendor: string | null;
	destination: string | null;
	propagated?: boolean;
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
const route = useRoute();
const router = useRouter();
const workflows = ref<ClassifiedWorkflow[]>([]);
const initialWf = typeof route.query.wf === 'string' ? route.query.wf : null;
const selectedId = ref<string | null>(initialWf);
const loading = ref(true);
const error = ref<string | null>(null);
const cyContainer = ref<HTMLElement | null>(null);
let cy: Core | null = null;

const selected = computed(() => workflows.value.find((w) => w.id === selectedId.value) ?? null);

interface EgressEntry {
	key: string;
	label: string;
	detail: string | null;
	bucket: Bucket;
	count: number;
	nodeIds: string[];
}

// Human-readable bucket label used as the coloured tag in the list.
const BUCKET_LABEL: Record<Bucket, string> = {
	internal: 'internal',
	'external-known': 'external',
	'external-dynamic': 'dynamic URL',
	'external-unverified': 'code call',
};

// Per-workflow count of nodes that make a real external call (skipping propagated + sticky notes).
const externalCountFor = (wf: ClassifiedWorkflow): number =>
	wf.nodes.filter(
		(n) => n.bucket !== 'internal' && n.type !== 'n8n-nodes-base.stickyNote' && !n.propagated,
	).length;

const visibleNodeCountFor = (wf: ClassifiedWorkflow): number =>
	wf.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote').length;

const egressList = computed<EgressEntry[]>(() => {
	if (!selected.value) return [];
	const groups = new Map<string, EgressEntry>();
	for (const n of selected.value.nodes) {
		if (n.bucket === 'internal') continue;
		if (n.type === 'n8n-nodes-base.stickyNote') continue;
		// Nodes that only became external via propagation (e.g. a chain that uses an external model)
		// don't make the call themselves — their subordinate already accounts for it.
		if (n.propagated) continue;
		// Group by the most specific signal: explicit destination first, then vendor, then type.
		const key = n.destination || n.vendor || n.type;
		const label = n.vendor || n.destination || n.type.split('.').pop() || n.type;
		const detail =
			n.destination && n.destination !== n.vendor && n.destination !== 'inbound'
				? n.destination
				: null;
		const existing = groups.get(key);
		if (existing) {
			existing.count++;
			existing.nodeIds.push(n.id);
		} else {
			groups.set(key, { key, label, detail, bucket: n.bucket, count: 1, nodeIds: [n.id] });
		}
	}
	// Sort: external-known first, then dynamic, then unverified; within group by count desc.
	const order: Record<Bucket, number> = {
		'external-known': 0,
		'external-dynamic': 1,
		'external-unverified': 2,
		internal: 3,
	};
	return Array.from(groups.values()).sort(
		(a, b) => order[a.bucket] - order[b.bucket] || b.count - a.count,
	);
});

const tally = (wfs: ClassifiedWorkflow[]) => {
	const counts: Record<Bucket, number> = {
		internal: 0,
		'external-known': 0,
		'external-dynamic': 0,
		'external-unverified': 0,
	};
	let stickyCount = 0;
	for (const wf of wfs) {
		for (const n of wf.nodes) {
			if (n.type === 'n8n-nodes-base.stickyNote') {
				stickyCount++;
				continue;
			}
			counts[n.bucket]++;
		}
	}
	return { counts, stickyCount };
};

// Per-workflow stats when one is selected, fleet-wide otherwise.
const summary = computed(() => (selected.value ? tally([selected.value]) : tally(workflows.value)));

// Always-available fleet total (shown as a small footer line below the summary).
const fleetTotal = computed(() => {
	const t = tally(workflows.value);
	return (
		t.counts.internal +
		t.counts['external-known'] +
		t.counts['external-dynamic'] +
		t.counts['external-unverified']
	);
});

const fetchData = async () => {
	loading.value = true;
	try {
		workflows.value = await makeRestApiRequest<ClassifiedWorkflow[]>(
			rootStore.restApiContext,
			'GET',
			'/visualizations/workflows',
		);
		// Keep the URL-supplied selection if it points to a real workflow; otherwise fall back to first.
		const exists = selectedId.value && workflows.value.some((w) => w.id === selectedId.value);
		if (!exists && workflows.value.length) {
			selectedId.value = workflows.value[0].id;
		}
	} catch (e) {
		error.value = String(e);
	} finally {
		loading.value = false;
	}
};

// Sync selection -> URL (replace so we don't pile up history entries).
watch(selectedId, (id) => {
	if (!id) return;
	if (route.query.wf === id) return;
	void router.replace({ query: { ...route.query, wf: id } });
});

// Sync URL -> selection (in case the user edits the URL or hits back/forward).
watch(
	() => route.query.wf,
	(wf) => {
		if (typeof wf === 'string' && wf !== selectedId.value) {
			if (workflows.value.some((w) => w.id === wf)) {
				selectedId.value = wf;
			}
		}
	},
);

// Soft fill + saturated border per bucket, n8n-flavoured.
const FILL: Record<Bucket, string> = {
	internal: '#e8f5ee',
	'external-known': '#fde8e8',
	'external-dynamic': '#fef4e2',
	'external-unverified': '#f3e8fd',
};
const STROKE: Record<Bucket, string> = {
	internal: '#22c55e',
	'external-known': '#ef4444',
	'external-dynamic': '#f59e0b',
	'external-unverified': '#a855f7',
};

const isAiPort = (port: string) => port.startsWith('ai_');

// Reverse index: which egress entry does a given graph node belong to (if any)?
const nodeIdToEgressKey = computed(() => {
	const m = new Map<string, string>();
	for (const entry of egressList.value) {
		for (const id of entry.nodeIds) m.set(id, entry.key);
	}
	return m;
});

// Set by graph hover; the matching egress card highlights and scrolls into view.
const hoveredEgressKey = ref<string | null>(null);

const focusEgressCard = (key: string | null) => {
	hoveredEgressKey.value = key;
	if (!key) return;
	// Defer to next tick so the highlight class is on the DOM before we scroll.
	void nextTick(() => {
		const el = document.querySelector<HTMLElement>(`[data-egress-key="${CSS.escape(key)}"]`);
		el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	});
};

const highlightNodes = (ids: string[] | null) => {
	if (!cy) return;
	cy.elements().removeClass('hl dim');
	if (!ids?.length) return;
	const idSet = new Set(ids);
	const matched = cy.nodes().filter((n) => idSet.has(n.id()));
	if (matched.empty()) return;
	const keep = matched.union(matched.connectedEdges());
	cy.elements().difference(keep).addClass('dim');
	matched.addClass('hl');
};

const renderGraph = () => {
	if (!cyContainer.value || !selected.value) return;
	const wf = selected.value;
	const visibleNodes = wf.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote');
	const visibleIds = new Set(visibleNodes.map((n) => n.id));

	// Distinguish AI subordinate nodes (model/tool/memory) from the main flow.
	// In n8n's canvas they hang BELOW their agent — we'll do the same with manual positioning.
	const aiSubordinateIds = new Set<string>();
	// parent agent -> [direct AI subordinates], used to stack them below the parent.
	const parentToChildren = new Map<string, string[]>();
	for (const e of wf.edges) {
		if (isAiPort(e.port) && visibleIds.has(e.from) && visibleIds.has(e.to)) {
			// In the workflow JSON the subordinate is the `from`, the agent is the `to`.
			aiSubordinateIds.add(e.from);
			const kids = parentToChildren.get(e.to) ?? [];
			if (!kids.includes(e.from)) kids.push(e.from);
			parentToChildren.set(e.to, kids);
		}
	}

	const elements: ElementDefinition[] = [];
	for (const n of visibleNodes) {
		const sub =
			n.bucket === 'internal' ? '' : (n.vendor ?? n.bucket.replace('external-', 'ext · '));
		elements.push({
			data: {
				id: n.id,
				name: n.name,
				sub,
				bucket: n.bucket,
				type: n.type,
				vendor: n.vendor,
				dest: n.destination,
				isAi: aiSubordinateIds.has(n.id) ? 1 : 0,
			},
			classes: aiSubordinateIds.has(n.id) ? 'ai-sub' : '',
		});
	}
	for (const e of wf.edges) {
		if (!visibleIds.has(e.from) || !visibleIds.has(e.to)) continue;
		const ai = isAiPort(e.port);
		elements.push({
			data: {
				id: `${e.from}->${e.to}:${e.port}`,
				// Render AI subordinates as flowing INTO the agent: from subordinate up to agent.
				// Already matches workflow JSON convention (source = subordinate).
				source: e.from,
				target: e.to,
				port: e.port,
				ai: ai ? 1 : 0,
			},
			classes: ai ? 'ai-edge' : 'main-edge',
		});
	}

	if (cy) {
		cy.destroy();
		cy = null;
	}

	cy = cytoscape({
		container: cyContainer.value,
		elements,
		wheelSensitivity: 0.2,
		style: [
			// Base node — name on top line, vendor/bucket on second line via "\n".
			{
				selector: 'node',
				style: {
					shape: 'round-rectangle',
					width: 180,
					height: 56,
					'background-color': (ele) => FILL[ele.data('bucket') as Bucket] ?? '#eef0f4',
					'border-width': 2,
					'border-color': (ele) => STROKE[ele.data('bucket') as Bucket] ?? '#94a3b8',
					'corner-radius': '8px',
					'text-valign': 'center',
					'text-halign': 'center',
					'text-wrap': 'wrap',
					'text-max-width': '160px',
					label: (ele) => {
						const name: string = ele.data('name');
						const sub: string = ele.data('sub') ?? '';
						return sub ? `${name}\n${sub}` : name;
					},
					'font-size': '11px',
					'font-weight': 600,
					color: '#0f172a',
					'line-height': 1.3,
				},
			},
			// Subordinate AI nodes: tighter, italic-ish, smaller
			{
				selector: 'node.ai-sub',
				style: {
					width: 150,
					height: 44,
					'font-size': '11px',
					'border-style': 'dashed',
					opacity: 0.92,
				},
			},
			// Main data-flow edges
			{
				selector: 'edge.main-edge',
				style: {
					width: 2.5,
					'line-color': '#475569',
					'target-arrow-color': '#475569',
					'target-arrow-shape': 'triangle',
					'curve-style': 'bezier',
					'control-point-step-size': 40,
				},
			},
			// AI subordinate edges (model/tool/memory feeding an agent) — straight, no curving.
			{
				selector: 'edge.ai-edge',
				style: {
					width: 1.5,
					'line-color': '#a855f7',
					'line-style': 'dashed',
					'target-arrow-color': '#a855f7',
					'target-arrow-shape': 'triangle',
					'arrow-scale': 0.8,
					'curve-style': 'straight',
					opacity: 0.85,
				},
			},
			// Egress hover: highlighted nodes pop, everything else fades.
			{
				selector: 'node.hl',
				style: {
					'border-width': 4,
					'z-index': 999,
				},
			},
			{
				selector: '.dim',
				style: {
					opacity: 0.18,
				},
			},
		],
	});

	const MAIN_W = 180;
	const MAIN_H = 56;
	const SUB_W = 150;
	const SUB_H = 44;
	const H_GAP = 28;
	const V_GAP = 48;

	// Recursive cluster width: horizontal footprint of the subtree rooted at this node.
	const widthCache = new Map<string, number>();
	const ownWidth = (id: string) => (aiSubordinateIds.has(id) ? SUB_W : MAIN_W);
	const clusterWidth = (id: string): number => {
		const cached = widthCache.get(id);
		if (cached !== undefined) return cached;
		const kids = parentToChildren.get(id) ?? [];
		const base = ownWidth(id);
		if (!kids.length) {
			widthCache.set(id, base);
			return base;
		}
		const childTotal =
			kids.reduce((sum, k) => sum + clusterWidth(k), 0) + (kids.length - 1) * H_GAP;
		const w = Math.max(base, childTotal);
		widthCache.set(id, w);
		return w;
	};

	// Vertical extent BELOW the node: how far the AI subtree drops down.
	const extentCache = new Map<string, number>();
	const verticalExtent = (id: string): number => {
		const cached = extentCache.get(id);
		if (cached !== undefined) return cached;
		const kids = parentToChildren.get(id) ?? [];
		if (!kids.length) {
			extentCache.set(id, 0);
			return 0;
		}
		const deepest = Math.max(...kids.map(verticalExtent));
		const ext = V_GAP + SUB_H + deepest;
		extentCache.set(id, ext);
		return ext;
	};

	// 1. Inflate each main-flow node's layout width AND height to its cluster footprint.
	//    Width: dagre needs horizontal room for the children fan-out.
	//    Height: 2× verticalExtent so the symmetric bounding box dagre allocates is tall enough.
	for (const n of visibleNodes) {
		if (aiSubordinateIds.has(n.id)) continue;
		const w = clusterWidth(n.id);
		const ext = verticalExtent(n.id);
		const node = cy.getElementById(n.id);
		if (w > MAIN_W) node.style('width', w);
		if (ext > 0) node.style('height', MAIN_H + 2 * ext);
	}

	// 2. Lay out the main flow with dagre (LR). AI nodes and AI edges are excluded.
	const mainEles = cy.elements().not('.ai-sub').not('.ai-edge');
	mainEles
		.layout({
			name: 'dagre',
			rankDir: 'LR',
			ranker: 'network-simplex',
			nodeSep: 40,
			rankSep: 90,
			edgeSep: 18,
			marginX: 24,
			marginY: 24,
			animate: false,
		} as unknown as cytoscape.LayoutOptions)
		.run();

	// 3. Restore visual width/height, then shift each clustered node up by its extent so the
	//    visual node sits at the TOP of its reserved slot and the cluster fills the bottom half.
	for (const n of visibleNodes) {
		if (aiSubordinateIds.has(n.id)) continue;
		const node = cy.getElementById(n.id);
		node.removeStyle('width');
		node.removeStyle('height');
		const ext = verticalExtent(n.id);
		if (ext > 0) {
			const p = node.position();
			node.position({ x: p.x, y: p.y - ext });
		}
	}

	// 4. Place AI subordinates beneath their (now-shifted) parents.
	const positionChildren = (parentId: string, parentCx: number, parentBottom: number) => {
		const kids = parentToChildren.get(parentId);
		if (!kids?.length) return;
		const widths = kids.map(clusterWidth);
		const totalRow = widths.reduce((a, b) => a + b, 0) + (kids.length - 1) * H_GAP;
		let cursorLeft = parentCx - totalRow / 2;
		const y = parentBottom + V_GAP + SUB_H / 2;
		kids.forEach((kid, i) => {
			const cx = cursorLeft + widths[i] / 2;
			const node = cy!.getElementById(kid);
			if (!node.empty()) node.position({ x: cx, y });
			positionChildren(kid, cx, y + SUB_H / 2);
			cursorLeft += widths[i] + H_GAP;
		});
	};

	for (const n of visibleNodes) {
		if (aiSubordinateIds.has(n.id)) continue;
		const node = cy.getElementById(n.id);
		if (node.empty()) continue;
		const p = node.position();
		positionChildren(n.id, p.x, p.y + MAIN_H / 2);
	}

	cy.fit(undefined, 40);

	// Reverse interaction: hovering a graph node flashes the matching egress card.
	cy.on('mouseover', 'node', (evt) => {
		const key = nodeIdToEgressKey.value.get(evt.target.id()) ?? null;
		focusEgressCard(key);
	});
	cy.on('mouseout', 'node', () => {
		focusEgressCard(null);
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
					<span class="dot" :style="{ background: STROKE.internal }"></span>Internal:
					{{ summary.counts.internal }}
				</div>
				<div>
					<span class="dot" :style="{ background: STROKE['external-known'] }"></span>External
					(known): {{ summary.counts['external-known'] }}
				</div>
				<div>
					<span class="dot" :style="{ background: STROKE['external-dynamic'] }"></span>External
					(dynamic URL): {{ summary.counts['external-dynamic'] }}
				</div>
				<div>
					<span class="dot" :style="{ background: STROKE['external-unverified'] }"></span>Code w/
					network calls: {{ summary.counts['external-unverified'] }}
				</div>
				<div class="muted">sticky notes hidden: {{ summary.stickyCount }}</div>
				<div class="muted summary-fleet">
					{{ selected ? `selected workflow · fleet: ${fleetTotal} nodes` : 'across all workflows' }}
				</div>
			</div>
			<ul class="viz-list">
				<li
					v-for="wf in workflows"
					:key="wf.id"
					:class="{ active: wf.id === selectedId }"
					@click="selectedId = wf.id"
				>
					<div class="wf-name">{{ wf.name }}</div>
					<div class="wf-meta">
						<span class="muted">{{ visibleNodeCountFor(wf) }} nodes</span>
						<span
							v-if="externalCountFor(wf) > 0"
							class="wf-ext"
							:style="{ color: STROKE['external-known'] }"
						>
							{{ externalCountFor(wf) }} external
						</span>
					</div>
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
		<aside v-if="selected && !loading" class="viz-egress">
			<h3 class="viz-egress-title">External calls</h3>
			<div v-if="egressList.length === 0" class="muted egress-empty">No external destinations.</div>
			<ul v-else class="egress-list">
				<li
					v-for="entry in egressList"
					:key="entry.key"
					:data-egress-key="entry.key"
					:class="['egress-card', { 'egress-card--flash': hoveredEgressKey === entry.key }]"
					@mouseenter="highlightNodes(entry.nodeIds)"
					@mouseleave="highlightNodes(null)"
				>
					<div class="egress-card-head">
						<div class="egress-label">{{ entry.label }}</div>
						<span v-if="entry.count > 1" class="egress-chip">×{{ entry.count }}</span>
					</div>
					<div
						class="egress-bucket"
						:style="{
							color: STROKE[entry.bucket],
							background: FILL[entry.bucket],
							borderColor: STROKE[entry.bucket],
						}"
					>
						{{ BUCKET_LABEL[entry.bucket] }}
					</div>
					<div v-if="entry.detail" class="muted egress-detail" :title="entry.detail">
						{{ entry.detail }}
					</div>
				</li>
			</ul>
		</aside>
	</div>
</template>

<style scoped lang="scss">
.viz-root {
	display: grid;
	grid-template-columns: 320px 1fr 280px;
	height: 100%;
	width: 100%;
	background: var(--color-background-base, #fff);
	color: var(--color-text-base, #111);
}
.viz-egress {
	border-left: 1px solid var(--color-foreground-base, #ddd);
	padding: 16px;
	overflow-y: auto;
	background: var(--color-background-light, #fbfbfc);
}
.viz-egress-title {
	font-size: 11px;
	margin: 0 0 12px;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	font-weight: 700;
	color: var(--color-text-light, #888);
}
.egress-empty {
	font-size: 12px;
	font-style: italic;
}
.egress-list {
	list-style: none;
	padding: 0;
	margin: 0;
}
.egress-card {
	padding: 10px 12px;
	margin-bottom: 8px;
	border: 1px solid var(--color-foreground-base, #e2e2e6);
	border-radius: 8px;
	background: var(--color-background-xlight, #fff);
	font-size: 13px;
	cursor: pointer;
	transition:
		background 100ms ease,
		border-color 100ms ease;
	&:hover {
		background: var(--color-foreground-light, #f5f6f8);
		border-color: var(--color-text-light, #b0b4bd);
	}
}
.egress-card--flash {
	background: var(--color-primary-tint-3, #eef2ff);
	border-color: var(--color-primary, #6366f1);
	box-shadow: 0 0 0 1px var(--color-primary, #6366f1);
}
.egress-card-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
}
.egress-label {
	font-weight: 600;
	color: var(--color-text-base, #0f172a);
	overflow-wrap: anywhere;
}
.egress-chip {
	flex: 0 0 auto;
	font-size: 11px;
	font-weight: 600;
	padding: 2px 6px;
	border-radius: 10px;
	background: var(--color-foreground-light, #eef0f3);
	color: var(--color-text-light, #555);
}
.egress-bucket {
	display: inline-block;
	margin-top: 6px;
	padding: 1px 8px;
	font-size: 10px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	border-radius: 4px;
	border: 1px solid;
}
.egress-detail {
	margin-top: 6px;
	font-size: 11px;
	font-family: var(--font-family-monospace, monospace);
	overflow-wrap: anywhere;
	color: var(--color-text-light, #777);
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
.summary-fleet {
	font-size: 10px;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	margin-top: 4px;
	padding-top: 6px;
	border-top: 1px solid var(--color-foreground-light, #eee);
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
		padding: 8px 10px;
		margin-bottom: 4px;
		border-radius: 6px;
		cursor: pointer;
		border: 1px solid transparent;
		transition: background 120ms ease;
		&:hover {
			background: var(--color-foreground-light, #f0f0f0);
		}
		&.active {
			background: var(--color-primary-tint-3, #e3edff);
			border-color: var(--color-primary-tint-2, #c7d8ff);
		}
	}
}
.wf-name {
	font-weight: 600;
	line-height: 1.25;
	overflow-wrap: anywhere;
}
.wf-meta {
	margin-top: 3px;
	display: flex;
	gap: 8px;
	font-size: 11px;
	align-items: center;
}
.wf-ext {
	font-weight: 600;
	letter-spacing: 0.01em;
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
	background:
		radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.07) 1px, transparent 0) 0 0 / 18px 18px,
		var(--color-background-light, #fafafa);
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
