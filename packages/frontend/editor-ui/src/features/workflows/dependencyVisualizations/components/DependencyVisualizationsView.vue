<script lang="ts" setup>
import { computed, onBeforeMount, ref, defineAsyncComponent } from 'vue';

import { N8nButton, N8nHeading, N8nIcon, N8nLoading, N8nTabs, N8nText } from '@n8n/design-system';

import { useDependencyGraph } from '../useDependencyGraph';

const ForceGraphView = defineAsyncComponent(async () => await import('./ForceGraphView.vue'));
const CliqueHeatmapView = defineAsyncComponent(async () => await import('./CliqueHeatmapView.vue'));
const ProjectChordView = defineAsyncComponent(async () => await import('./ProjectChordView.vue'));
const CommunityAtlasView = defineAsyncComponent(
	async () => await import('./CommunityAtlasView.vue'),
);
const ExecutionsTreemapView = defineAsyncComponent(
	async () => await import('./ExecutionsTreemapView.vue'),
);

const { graph, loading, error, fetchGraph } = useDependencyGraph();

const activeTab = ref<'atlas' | 'force' | 'clique' | 'chord' | 'executions'>('atlas');

const tabs = computed(() => [
	{ value: 'atlas' as const, label: 'Force atlas' },
	{ value: 'force' as const, label: 'Force network' },
	{ value: 'clique' as const, label: 'Clique heatmap' },
	{ value: 'chord' as const, label: 'Project chord' },
	{ value: 'executions' as const, label: 'Executions treemap' },
]);

const statItems = computed(() => {
	if (!graph.value) return [];
	const counts = { workflow: 0, credential: 0, dataTable: 0, restricted: 0 };
	for (const node of graph.value.nodes) {
		counts[node.kind]++;
		if (node.restricted) counts.restricted++;
	}
	const items: Array<{
		key: string;
		value: number;
		label: string;
		icon: 'workflow' | 'key-round' | 'table' | 'lock' | 'git-branch';
		tone: string;
	}> = [
		{
			key: 'workflow',
			value: counts.workflow,
			label: 'Workflows',
			icon: 'workflow',
			tone: '#3b82f6',
		},
		{
			key: 'credential',
			value: counts.credential,
			label: 'Credentials',
			icon: 'key-round',
			tone: '#10b981',
		},
		{
			key: 'dataTable',
			value: counts.dataTable,
			label: 'Data tables',
			icon: 'table',
			tone: '#f59e0b',
		},
	];
	if (counts.restricted > 0) {
		items.push({
			key: 'restricted',
			value: counts.restricted,
			label: 'Restricted',
			icon: 'lock',
			tone: '#94a3b8',
		});
	}
	items.push({
		key: 'edges',
		value: graph.value.edges.length,
		label: 'Edges',
		icon: 'git-branch',
		tone: '#8b5cf6',
	});
	return items;
});

onBeforeMount(async () => {
	await fetchGraph();
});

async function refresh() {
	await fetchGraph(true);
}
</script>

<template>
	<div :class="$style.page">
		<header :class="$style.header">
			<div :class="$style.title">
				<N8nHeading tag="h2" size="xlarge" bold>Resource relations</N8nHeading>
				<N8nText color="text-light" size="small">
					Explore how your workflows, credentials, data tables and projects are linked.
				</N8nText>
			</div>
			<div v-if="statItems.length > 0" :class="$style.headerActions">
				<div :class="$style.stats">
					<div v-for="stat in statItems" :key="stat.key" :class="$style.stat">
						<span :class="$style.statIcon" :style="{ color: stat.tone }">
							<N8nIcon :icon="stat.icon" size="small" />
						</span>
						<span :class="$style.statValue">{{ stat.value }}</span>
						<span :class="$style.statLabel">{{ stat.label }}</span>
					</div>
				</div>
				<N8nButton
					type="tertiary"
					size="small"
					icon="refresh-cw"
					:loading="loading"
					@click="refresh"
				>
					Refresh
				</N8nButton>
			</div>
		</header>

		<div :class="$style.tabs">
			<N8nTabs v-model="activeTab" :options="tabs" />
		</div>

		<div :class="$style.body">
			<div v-if="loading" :class="$style.center">
				<N8nLoading :rows="6" />
			</div>
			<div v-else-if="error" :class="$style.error">
				<N8nText color="danger">Failed to load dependency graph: {{ error }}</N8nText>
			</div>
			<div v-else-if="graph && graph.nodes.length === 0" :class="$style.empty">
				<N8nText color="text-light">
					No workflow dependencies have been indexed yet. Run or save some workflows that share
					credentials, sub-workflows or data tables, then come back.
				</N8nText>
			</div>
			<template v-else-if="graph">
				<CommunityAtlasView v-if="activeTab === 'atlas'" :graph="graph" />
				<ForceGraphView v-else-if="activeTab === 'force'" :graph="graph" />
				<CliqueHeatmapView v-else-if="activeTab === 'clique'" :graph="graph" />
				<ProjectChordView v-else-if="activeTab === 'chord'" :graph="graph" />
				<ExecutionsTreemapView v-else-if="activeTab === 'executions'" />
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	padding: var(--spacing--md) var(--spacing--lg);
	gap: var(--spacing--sm);
	box-sizing: border-box;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--md);
	flex-wrap: wrap;
}

.title {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.stats {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: stretch;
}

.stat {
	display: grid;
	grid-template-columns: auto auto;
	grid-template-rows: auto auto;
	column-gap: var(--spacing--3xs);
	row-gap: 0;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--sm);
	background: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	min-width: 96px;
}

.statIcon {
	grid-row: 1 / span 2;
	display: flex;
	align-items: center;
	justify-content: center;
}

.statValue {
	grid-column: 2;
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--bold);
	color: var(--color-text-dark);
	line-height: 1.1;
}

.statLabel {
	grid-column: 2;
	font-size: var(--font-size--3xs);
	color: var(--color-text-light);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	white-space: nowrap;
}

.tabs {
	border-bottom: 1px solid var(--color-foreground-base);
}

.body {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.center,
.error,
.empty {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--lg);
	text-align: center;
}
</style>
