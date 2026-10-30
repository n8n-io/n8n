<script setup lang="ts">
import { N8nIcon, N8nLoading, N8nNodeCreatorNode } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { useStaggeredList } from '../composables/useStaggeredList';
import { useTypewriter } from '../composables/useTypewriter';
import type { NodeSearchPanel } from '../instanceAi.workflowStaging';

const MAX_RESULTS = 8;

const props = defineProps<{ panel: NodeSearchPanel }>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const query = useTypewriter(() => props.panel.queries.join(', '));

const results = computed(() => {
	const picked = new Set(props.panel.picked);
	return props.panel.results
		.flatMap((name) => {
			const nodeType = nodeTypesStore.getNodeType(name);
			return nodeType ? [{ name, nodeType, picked: picked.has(name) }] : [];
		})
		.slice(0, MAX_RESULTS);
});
// Rows join one at a time, like the nodes on the canvas.
const visibleResults = useStaggeredList(() => results.value, { key: (result) => result.name });
</script>

<template>
	<aside
		:class="$style.panel"
		:aria-label="i18n.baseText('instanceAi.workflowDraft.search.ariaLabel')"
		data-test-id="instance-ai-node-search-panel"
	>
		<div :class="$style.searchBox">
			<N8nIcon icon="search" size="small" :class="$style.searchIcon" />
			<span :class="$style.query" data-test-id="instance-ai-node-search-query">
				{{ query }}<span v-if="panel.searching" :class="$style.caret" aria-hidden="true" />
			</span>
		</div>
		<div
			v-if="panel.searching && results.length === 0"
			:class="$style.loading"
			data-test-id="instance-ai-node-search-loading"
		>
			<N8nLoading :rows="3" variant="p" animated />
		</div>
		<ul v-else :class="$style.results">
			<li
				v-for="result in visibleResults"
				:key="result.name"
				:class="$style.result"
				:data-picked="String(result.picked)"
				data-test-id="instance-ai-node-search-result"
			>
				<N8nNodeCreatorNode
					:title="result.nodeType.displayName"
					:description="result.nodeType.description"
					:is-trigger="result.nodeType.group.includes('trigger')"
					:active="result.picked"
				>
					<template #icon>
						<NodeIcon :node-type="result.nodeType" :size="20" />
					</template>
					<template v-if="result.picked" #trailing>
						<N8nIcon icon="check" size="small" :class="$style.pickedIcon" />
					</template>
				</N8nNodeCreatorNode>
			</li>
		</ul>
	</aside>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as *;

.panel {
	display: flex;
	flex-direction: column;
	width: min(320px, 45%);
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: $node-creator-background-color;
	box-shadow: var(--shadow--md);
	pointer-events: none;
}

.searchBox {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	height: 40px;
	margin: var(--spacing--sm);
	padding: 0 var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--secondary);
	border-radius: var(--radius);
	background-color: $node-creator-search-background-color;
	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
}

.searchIcon {
	color: var(--color--primary);
}

.query {
	flex-grow: 1;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.caret {
	display: inline-block;
	width: 1px;
	height: 1em;
	margin-left: 1px;
	vertical-align: text-bottom;
	background-color: currentColor;
	animation: caret-blink 1s steps(1) infinite;
}

.loading {
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.results {
	margin: 0;
	padding: 0 0 var(--spacing--2xs);
	overflow: hidden;
	list-style: none;
}

.result {
	animation: result-enter var(--duration--snappy) var(--easing--ease-out-quart) both;
}

.pickedIcon {
	color: var(--color--success);
}

@media (prefers-reduced-motion: reduce) {
	.caret,
	.result {
		animation: none;
	}
}

@keyframes caret-blink {
	50% {
		opacity: 0;
	}
}

@keyframes result-enter {
	from {
		opacity: 0;
		translate: 0 var(--spacing--4xs);
	}

	to {
		opacity: 1;
		translate: 0 0;
	}
}
</style>
