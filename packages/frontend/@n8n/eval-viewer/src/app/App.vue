<script setup lang="ts">
import { N8nCallout, N8nLoading2 } from '@n8n/design-system';
import { computed, onMounted, provide, ref, watch } from 'vue';

import type { ViewerIndex } from '../schema';
import { iterationsOfArm } from '../metrics';
import { ToolNamesKey } from './colors';
import CaseView from './components/CaseView.vue';
import RunTree from './components/RunTree.vue';
import SummaryView from './components/SummaryView.vue';
import { loadIndex } from './data';
import { useSelection } from './selection';

const index = ref<ViewerIndex>();
const loadError = ref<string>();
const { selection, select } = useSelection();

/** Tool names by total calls, so the busiest tools get the first palette colours. */
const toolNames = computed(() => {
	const calls = new Map<string, number>();
	for (const iteration of (index.value?.arms ?? []).flatMap(iterationsOfArm)) {
		for (const stat of iteration.toolStats) {
			calls.set(stat.tool, (calls.get(stat.tool) ?? 0) + stat.calls);
		}
	}
	return [...calls.entries()].sort((a, b) => b[1] - a[1]).map(([tool]) => tool);
});
provide(ToolNamesKey, toolNames);

/** A case page compares two columns side by side, so it gets the wide column. */
const wide = computed(() => selection.value.kind === 'case');

/** A new page opens at the top; a change of the compared attempts keeps the scroll position. */
const mainPane = ref<HTMLElement>();
watch(
	() => (selection.value.kind === 'case' ? `case:${selection.value.caseName}` : 'summary'),
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
			<N8nLoading2 v-else-if="!loadError" :rows="8" />
		</aside>
		<main ref="mainPane" :class="$style.main">
			<div :class="[$style.column, wide && $style.wide]">
				<N8nCallout v-if="loadError" theme="danger">{{ loadError }}</N8nCallout>
				<N8nLoading2 v-else-if="!index" :rows="6" />
				<template v-else>
					<SummaryView v-if="selection.kind === 'summary'" :index="index" @select="select" />
					<CaseView
						v-else-if="selection.kind === 'case'"
						:key="selection.caseName"
						:index="index"
						:selection="selection"
						@select="select"
					/>
					<N8nCallout v-else theme="warning">
						The selected item is not in this data. Pick an item in the tree.
					</N8nCallout>
				</template>
			</div>
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
	padding: var(--spacing--xl) var(--spacing--lg) var(--spacing--2xl);
	min-width: 0;
}

/* The design system has no content-width token. 64rem keeps tables and text readable;
   the compare tabs need room for two columns. */
.column {
	max-width: 64rem;
	margin-inline: auto;
}

.wide {
	max-width: 100rem;
}
</style>
