<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import * as d3 from 'd3';
import type { GraphVisualizationNode, GraphVisualizationLink } from '../dependencyGraph.types';
import { useDependencyGraphStore } from '../dependencyGraph.store';
import { N8nIcon, N8nText, N8nSpinner } from '@n8n/design-system';

const store = useDependencyGraphStore();

const svgRef = ref<SVGSVGElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

const containerWidth = ref(800);
const containerHeight = ref(600);

let simulation: d3.Simulation<GraphVisualizationNode, GraphVisualizationLink> | null = null;

const filteredNodes = computed(() => store.filteredNodes);
const filteredEdges = computed(() => store.filteredEdges);
const selectedNode = computed(() => store.selectedNode);

// n8n-style node dimensions
const NODE_WIDTH = 64;
const NODE_HEIGHT = 64;
const NODE_RADIUS = 8;

function createVisualization() {
	if (!svgRef.value || !filteredNodes.value.length) return;

	// Clear previous visualization
	d3.select(svgRef.value).selectAll('*').remove();

	const svg = d3.select(svgRef.value);
	const width = containerWidth.value;
	const height = containerHeight.value;

	// Create definitions for filters and gradients
	const defs = svg.append('defs');

	// Drop shadow filter matching n8n style
	const shadow = defs
		.append('filter')
		.attr('id', 'node-shadow')
		.attr('x', '-50%')
		.attr('y', '-50%')
		.attr('width', '200%')
		.attr('height', '200%');
	shadow
		.append('feDropShadow')
		.attr('dx', '0')
		.attr('dy', '2')
		.attr('stdDeviation', '4')
		.attr('flood-color', 'rgba(0,0,0,0.08)');

	// Selection glow
	const glow = defs
		.append('filter')
		.attr('id', 'selection-glow')
		.attr('x', '-100%')
		.attr('y', '-100%')
		.attr('width', '300%')
		.attr('height', '300%');
	glow
		.append('feDropShadow')
		.attr('dx', '0')
		.attr('dy', '0')
		.attr('stdDeviation', '8')
		.attr('flood-color', 'var(--color--primary)')
		.attr('flood-opacity', '0.4');

	// Arrow markers
	const markerColors = {
		credential: '#f59e0b',
		workflow: '#6366f1',
	};

	Object.entries(markerColors).forEach(([type, color]) => {
		defs
			.append('marker')
			.attr('id', `arrow-${type}`)
			.attr('viewBox', '0 -5 10 10')
			.attr('refX', 40)
			.attr('refY', 0)
			.attr('markerWidth', 8)
			.attr('markerHeight', 8)
			.attr('orient', 'auto')
			.append('path')
			.attr('fill', color)
			.attr('d', 'M0,-4L8,0L0,4');
	});

	// Create main group for zoom/pan
	const g = svg.append('g').attr('class', 'main-group');

	// Add zoom behavior
	const zoom = d3
		.zoom<SVGSVGElement, unknown>()
		.scaleExtent([0.3, 2])
		.on('zoom', (event) => {
			g.attr('transform', event.transform);
		});

	svg.call(zoom);

	// Initial zoom to fit content
	svg.call(zoom.transform, d3.zoomIdentity.translate(width / 4, height / 4).scale(0.7));

	// Double-click to reset
	svg.on('dblclick.zoom', () => {
		svg
			.transition()
			.duration(400)
			.call(zoom.transform, d3.zoomIdentity.translate(width / 4, height / 4).scale(0.7));
	});

	// Prepare data
	const nodes: GraphVisualizationNode[] = filteredNodes.value.map((n) => ({ ...n }));
	const nodeMap = new Map(nodes.map((n) => [n.id, n]));

	const links: GraphVisualizationLink[] = filteredEdges.value
		.map((e) => ({
			source: nodeMap.get(e.source) ?? e.source,
			target: nodeMap.get(e.target) ?? e.target,
			type: e.type,
			label: e.label,
		}))
		.filter((l) => typeof l.source !== 'string' && typeof l.target !== 'string');

	// Force simulation with better spacing
	simulation = d3
		.forceSimulation<GraphVisualizationNode>(nodes)
		.force(
			'link',
			d3
				.forceLink<GraphVisualizationNode, GraphVisualizationLink>(links)
				.id((d) => d.id)
				.distance(180)
				.strength(0.3),
		)
		.force('charge', d3.forceManyBody().strength(-800).distanceMax(500))
		.force('center', d3.forceCenter(width / 2, height / 2))
		.force('collision', d3.forceCollide().radius(80))
		.force('x', d3.forceX(width / 2).strength(0.02))
		.force('y', d3.forceY(height / 2).strength(0.02));

	// Create curved links
	const link = g
		.append('g')
		.attr('class', 'links')
		.selectAll('path')
		.data(links)
		.join('path')
		.attr('fill', 'none')
		.attr('stroke', (d) => (d.type === 'uses_credential' ? '#f59e0b' : '#6366f1'))
		.attr('stroke-width', 2)
		.attr('stroke-opacity', 0.5)
		.attr('stroke-dasharray', (d) => (d.type === 'uses_credential' ? '6,4' : 'none'))
		.attr(
			'marker-end',
			(d) => `url(#arrow-${d.type === 'uses_credential' ? 'credential' : 'workflow'})`,
		);

	// Create node groups
	const node = g
		.append('g')
		.attr('class', 'nodes')
		.selectAll('g')
		.data(nodes)
		.join('g')
		.attr('class', 'node')
		.style('cursor', 'pointer')
		.call(
			d3
				.drag<SVGGElement, GraphVisualizationNode>()
				.on('start', dragstarted)
				.on('drag', dragged)
				.on('end', dragended),
		);

	// Node background (n8n-style rounded rectangle)
	node
		.append('rect')
		.attr('x', -NODE_WIDTH / 2)
		.attr('y', -NODE_HEIGHT / 2)
		.attr('width', NODE_WIDTH)
		.attr('height', NODE_HEIGHT)
		.attr('rx', NODE_RADIUS)
		.attr('ry', NODE_RADIUS)
		.attr('fill', (d) => {
			if (d.type === 'workflow') {
				return d.active ? 'var(--color--success--tint-1)' : 'var(--color--background--light-1)';
			}
			return 'var(--color--warning-tint-2)';
		})
		.attr('stroke', (d) => {
			if (d.type === 'workflow') {
				return d.active ? 'var(--color--success)' : 'var(--color--foreground--shade-1)';
			}
			return 'var(--color--warning)';
		})
		.attr('stroke-width', 2)
		.attr('filter', 'url(#node-shadow)');

	// Node icon container (circular background)
	node
		.append('circle')
		.attr('cx', 0)
		.attr('cy', -4)
		.attr('r', 18)
		.attr('fill', (d) => {
			if (d.type === 'workflow') {
				return d.active ? 'var(--color--success)' : 'var(--color--foreground--shade-1)';
			}
			return 'var(--color--warning)';
		});

	// Node icon (using foreignObject for proper icon rendering)
	node
		.append('text')
		.attr('x', 0)
		.attr('y', -1)
		.attr('text-anchor', 'middle')
		.attr('dominant-baseline', 'middle')
		.attr('font-size', '16px')
		.attr('fill', 'white')
		.attr('font-weight', '500')
		.text((d) => (d.type === 'workflow' ? '⚡' : '🔑'));

	// Status indicator for active workflows
	node
		.filter((d) => d.type === 'workflow' && d.active)
		.append('circle')
		.attr('cx', NODE_WIDTH / 2 - 6)
		.attr('cy', -NODE_HEIGHT / 2 + 6)
		.attr('r', 6)
		.attr('fill', 'var(--color--success)')
		.attr('stroke', 'white')
		.attr('stroke-width', 2);

	// Node label below the node
	node
		.append('text')
		.attr('x', 0)
		.attr('y', NODE_HEIGHT / 2 + 16)
		.attr('text-anchor', 'middle')
		.attr('font-size', '12px')
		.attr('font-weight', '500')
		.attr('fill', 'var(--color--text--shade-1)')
		.each(function (d) {
			const text = d3.select(this);
			const name = d.name;
			if (name.length > 20) {
				text.text(name.substring(0, 18) + '...');
			} else {
				text.text(name);
			}
		});

	// Type label
	node
		.append('text')
		.attr('x', 0)
		.attr('y', NODE_HEIGHT / 2 + 30)
		.attr('text-anchor', 'middle')
		.attr('font-size', '10px')
		.attr('fill', 'var(--color--text--tint-1)')
		.text((d) => (d.type === 'workflow' ? 'Workflow' : 'Credential'));

	// Interactions
	node
		.on('mouseenter', function (event, d) {
			// Highlight node
			d3.select(this)
				.select('rect')
				.transition()
				.duration(150)
				.attr('filter', 'url(#selection-glow)');

			// Highlight connected edges
			link
				.transition()
				.duration(150)
				.attr('stroke-opacity', (l) => {
					const source = l.source as GraphVisualizationNode;
					const target = l.target as GraphVisualizationNode;
					return source.id === d.id || target.id === d.id ? 0.9 : 0.15;
				})
				.attr('stroke-width', (l) => {
					const source = l.source as GraphVisualizationNode;
					const target = l.target as GraphVisualizationNode;
					return source.id === d.id || target.id === d.id ? 3 : 2;
				});

			// Dim unconnected nodes
			node
				.transition()
				.duration(150)
				.style('opacity', (n) => {
					if (n.id === d.id) return 1;
					const isConnected = links.some((l) => {
						const source = l.source as GraphVisualizationNode;
						const target = l.target as GraphVisualizationNode;
						return (
							(source.id === d.id && target.id === n.id) ||
							(target.id === d.id && source.id === n.id)
						);
					});
					return isConnected ? 1 : 0.4;
				});
		})
		.on('mouseleave', function () {
			d3.select(this).select('rect').transition().duration(150).attr('filter', 'url(#node-shadow)');

			link.transition().duration(150).attr('stroke-opacity', 0.5).attr('stroke-width', 2);

			node.transition().duration(150).style('opacity', 1);
		})
		.on('click', (event, d) => {
			event.stopPropagation();
			store.selectNode(d);
		});

	// Deselect on background click
	svg.on('click', () => {
		store.selectNode(null);
	});

	// Update selected node styling
	function updateSelection() {
		node
			.select('rect')
			.attr('stroke-width', (d) => (selectedNode.value?.id === d.id ? 3 : 2))
			.attr('stroke', (d) => {
				if (selectedNode.value?.id === d.id) {
					return 'var(--color--primary)';
				}
				if (d.type === 'workflow') {
					return d.active ? 'var(--color--success)' : 'var(--color--foreground--shade-1)';
				}
				return 'var(--color--warning)';
			});
	}

	watch(selectedNode, updateSelection, { immediate: true });

	// Simulation tick
	simulation.on('tick', () => {
		link.attr('d', (d) => {
			const source = d.source as GraphVisualizationNode;
			const target = d.target as GraphVisualizationNode;
			const dx = (target.x ?? 0) - (source.x ?? 0);
			const dy = (target.y ?? 0) - (source.y ?? 0);
			const dr = Math.sqrt(dx * dx + dy * dy) * 0.8;
			return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
		});

		node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
	});

	// Drag functions
	function dragstarted(
		event: d3.D3DragEvent<SVGGElement, GraphVisualizationNode, GraphVisualizationNode>,
	) {
		if (!event.active) simulation?.alphaTarget(0.3).restart();
		event.subject.fx = event.subject.x;
		event.subject.fy = event.subject.y;
	}

	function dragged(
		event: d3.D3DragEvent<SVGGElement, GraphVisualizationNode, GraphVisualizationNode>,
	) {
		event.subject.fx = event.x;
		event.subject.fy = event.y;
	}

	function dragended(
		event: d3.D3DragEvent<SVGGElement, GraphVisualizationNode, GraphVisualizationNode>,
	) {
		if (!event.active) simulation?.alphaTarget(0);
		event.subject.fx = null;
		event.subject.fy = null;
	}
}

function handleResize() {
	if (containerRef.value) {
		containerWidth.value = containerRef.value.clientWidth;
		containerHeight.value = containerRef.value.clientHeight;
		createVisualization();
	}
}

watch([filteredNodes, filteredEdges], () => {
	createVisualization();
});

onMounted(() => {
	handleResize();
	window.addEventListener('resize', handleResize);
	void store.fetchGraph();
});

onUnmounted(() => {
	window.removeEventListener('resize', handleResize);
	if (simulation) {
		simulation.stop();
	}
});
</script>

<template>
	<div ref="containerRef" :class="$style.container">
		<svg ref="svgRef" :width="containerWidth" :height="containerHeight" :class="$style.svg"></svg>

		<!-- Loading State -->
		<div v-if="store.isLoading" :class="$style.overlay">
			<div :class="$style.loadingState">
				<N8nSpinner size="large" />
				<N8nText color="text-base">Loading dependency graph...</N8nText>
			</div>
		</div>

		<!-- Error State -->
		<div v-else-if="store.error" :class="$style.overlay">
			<div :class="$style.errorState">
				<N8nIcon icon="triangle-alert" size="xlarge" :class="$style.errorIcon" />
				<N8nText size="large" color="text-dark" :class="$style.errorTitle"
					>Unable to load graph</N8nText
				>
				<N8nText color="text-light">{{ store.error }}</N8nText>
			</div>
		</div>

		<!-- Empty State -->
		<div v-else-if="!filteredNodes.length && !store.isLoading" :class="$style.overlay">
			<div :class="$style.emptyState">
				<div :class="$style.emptyIcon">
					<N8nIcon icon="waypoints" size="xlarge" />
				</div>
				<N8nText size="large" color="text-dark" :class="$style.emptyTitle"
					>No dependencies found</N8nText
				>
				<N8nText color="text-light" :class="$style.emptyDescription">
					Create workflows that use credentials or call other workflows to visualize dependencies
					here.
				</N8nText>
			</div>
		</div>

		<!-- Controls hint -->
		<div v-if="filteredNodes.length && !store.isLoading" :class="$style.controls">
			<span>Scroll to zoom</span>
			<span :class="$style.separator">•</span>
			<span>Drag to pan</span>
			<span :class="$style.separator">•</span>
			<span>Double-click to reset</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	width: 100%;
	height: 100%;
	position: relative;
	background: var(--color--background--light-2);
	border-radius: var(--radius--lg);
	overflow: hidden;
}

.svg {
	display: block;
	background:
		linear-gradient(90deg, var(--color--foreground) 1px, transparent 1px) 0 0 / 40px 40px,
		linear-gradient(var(--color--foreground) 1px, transparent 1px) 0 0 / 40px 40px;
	background-position: center;
}

.overlay {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--background--light-2);
}

.loadingState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--md);
}

.errorState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--s);
	padding: var(--spacing--2xl);
	max-width: 360px;
	text-align: center;
}

.errorIcon {
	color: var(--color--danger);
	margin-bottom: var(--spacing--xs);
}

.errorTitle {
	font-weight: var(--font-weight--bold);
}

.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--s);
	padding: var(--spacing--2xl);
	max-width: 400px;
	text-align: center;
}

.emptyIcon {
	width: 80px;
	height: 80px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color--background);
	border-radius: var(--radius--lg);
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--s);
}

.emptyTitle {
	font-weight: var(--font-weight--bold);
}

.emptyDescription {
	line-height: 1.5;
}

.controls {
	position: absolute;
	bottom: var(--spacing--s);
	left: 50%;
	transform: translateX(-50%);
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--s);
	background: var(--color--background--light-1);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--base);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.separator {
	color: var(--color--foreground--shade-1);
}
</style>
