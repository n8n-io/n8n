<script setup lang="ts">
import { N8nCallout, N8nLoading } from '@n8n/design-system';
import { computed, onMounted, provide, ref, watch } from 'vue';

import type { IterationSummary, ViewerIndex } from '../schema';
import { iterationsOfArm } from '../metrics';
import { ToolNamesKey } from './colors';
import CaseView from './components/CaseView.vue';
import IterationView from './components/IterationView.vue';
import RunTree from './components/RunTree.vue';
import ScenarioView from './components/ScenarioView.vue';
import SummaryView from './components/SummaryView.vue';
import { loadIndex } from './data';
import { useSelection } from './selection';

const index = ref<ViewerIndex>();
const loadError = ref<string>();
const { selection, select } = useSelection();

const iterationsById = computed(
	() =>
		new Map<string, IterationSummary>(
			(index.value?.arms ?? [])
				.flatMap(iterationsOfArm)
				.map((iteration) => [iteration.id, iteration]),
		),
);

/** Tool names by total calls, so the busiest tools get the first palette colours. */
const toolNames = computed(() => {
	const calls = new Map<string, number>();
	for (const iteration of iterationsById.value.values()) {
		for (const stat of iteration.toolStats) {
			calls.set(stat.tool, (calls.get(stat.tool) ?? 0) + stat.calls + 1);
		}
	}
	return [...calls.entries()].sort((a, b) => b[1] - a[1]).map(([tool]) => tool);
});
provide(ToolNamesKey, toolNames);

const selectedIteration = computed(() =>
	selection.value.kind === 'iteration' || selection.value.kind === 'scenario'
		? iterationsById.value.get(selection.value.id)
		: undefined,
);

/** A new item opens at the top; a tab change keeps the scroll position. */
const mainPane = ref<HTMLElement>();
watch(
	() =>
		selection.value.kind === 'iteration'
			? `iteration:${selection.value.id}`
			: JSON.stringify(selection.value),
	() => mainPane.value?.scrollTo({ top: 0 }),
);

onMounted(async () => {
	try {
		index.value = await loadIndex();
	} catch (error) {
		loadError.value = error instanceof Error ? error.message : String(error);
	}
});
</script>

<template>
	<div :class="$style.layout">
		<aside :class="$style.sidebar" aria-label="Runs">
			<RunTree v-if="index" :index="index" :selection="selection" @select="select" />
			<N8nLoading v-else-if="!loadError" :rows="8" />
		</aside>
		<main ref="mainPane" :class="$style.main">
			<N8nCallout v-if="loadError" theme="danger">{{ loadError }}</N8nCallout>
			<N8nLoading v-else-if="!index" :rows="6" />
			<template v-else>
				<SummaryView v-if="selection.kind === 'summary'" :index="index" @select="select" />
				<CaseView
					v-else-if="selection.kind === 'case'"
					:key="selection.caseName"
					:index="index"
					:case-name="selection.caseName"
					@select="select"
				/>
				<IterationView
					v-else-if="selection.kind === 'iteration' && selectedIteration"
					:key="selectedIteration.id"
					:index="index"
					:iteration="selectedIteration"
					:tab="selection.tab"
					@select="select"
				/>
				<ScenarioView
					v-else-if="selection.kind === 'scenario' && selectedIteration"
					:key="`${selectedIteration.id}-${selection.scenario}`"
					:index="index"
					:iteration="selectedIteration"
					:scenario-index="selection.scenario"
					@select="select"
				/>
				<N8nCallout v-else theme="warning">
					The selected item is not in this data. Pick an item in the tree.
				</N8nCallout>
			</template>
		</main>
	</div>
</template>

<style module>
:global(body) {
	margin: 0;
	padding: 0;
	background-color: var(--background--surface);
	color: var(--text-color);
	font-family: var(--font-family);
	text-rendering: optimizeLegibility;
}

.layout {
	display: grid;
	grid-template-columns: minmax(var(--spacing--5xl), 22%) 1fr;
	height: 100vh;
}

.sidebar {
	overflow: auto;
	border-right: var(--border);
	padding: var(--spacing--xs) var(--spacing--2xs);
}

.main {
	overflow: auto;
	padding: var(--spacing--lg);
	min-width: 0;
}
</style>
