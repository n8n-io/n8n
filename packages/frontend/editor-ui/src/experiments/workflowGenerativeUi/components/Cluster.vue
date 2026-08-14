<script setup lang="ts">
import { computed, inject, unref } from 'vue';
import { useStateStore } from '@json-render/vue';
import { visualPropsSchema, type VisualProps } from '../visualGrammar';
import { disclosureStatePath } from '../disclosure';
import {
	GenerativeUiNodesKey,
	useGenerativeUiLookOnly,
	useGenerativeUiOpenNode,
} from '../nodeLookup';
import NodeBrand from './NodeBrand.vue';
import VisualPrimitive from './VisualPrimitive.vue';

const props = defineProps<
	VisualProps & {
		title: string;
		summary: string;
		nodeIds: string[];
	}
>();

const visual = computed(() => visualPropsSchema.parse(props));

const store = useStateStore();
const nodes = inject(GenerativeUiNodesKey, []);
const lookOnly = useGenerativeUiLookOnly();
const openNode = useGenerativeUiOpenNode();

const resolvableNodes = computed(() => {
	const available = new Map(unref(nodes).map((node) => [node.id, node]));
	return props.nodeIds.flatMap((id) => {
		const node = available.get(id);
		return node ? [node] : [];
	});
});
const brandsAreInteractive = computed(() => openNode !== null && !lookOnly.value);

const statePath = computed(() =>
	disclosureStatePath(['cluster', props.title, ...[...props.nodeIds].sort()]),
);

const isExpandable = computed(() => props.disclosure === 'expandable');
const expanded = computed(() => {
	void store.state.value;
	return Boolean(store.get(statePath.value));
});
const showDetails = computed(() => {
	if (props.disclosure === 'summary') return false;
	if (isExpandable.value) return expanded.value;
	return true;
});

function toggle() {
	store.set(statePath.value, !expanded.value);
}

function open(nodeId: string) {
	if (brandsAreInteractive.value) openNode?.(nodeId);
}
</script>

<template>
	<VisualPrimitive v-bind="visual">
		<section :class="$style.cluster">
			<button
				v-if="isExpandable"
				type="button"
				:class="$style.toggle"
				:aria-expanded="expanded"
				@click="toggle"
			>
				<span :class="$style.title">{{ title }}</span>
				<span :class="$style.chevron" aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
			</button>
			<header v-else :class="$style.header">
				<h4 :class="$style.title">{{ title }}</h4>
			</header>
			<p :class="$style.summary">{{ summary }}</p>
			<div v-if="resolvableNodes.length" :class="$style.brands">
				<template v-for="node in resolvableNodes" :key="node.id">
					<button
						v-if="brandsAreInteractive"
						type="button"
						:class="$style.brand"
						:aria-label="`Open ${node.name}`"
						@click="open(node.id)"
					>
						<NodeBrand :node-id="node.id" />
					</button>
					<span v-else :class="$style.brandStatic">
						<NodeBrand :node-id="node.id" />
					</span>
				</template>
			</div>
			<div v-if="showDetails && $slots.default" :class="$style.content"><slot /></div>
		</section>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.cluster {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
	padding: var(--spacing--sm);
	background: var(--generative-surface, var(--background--subtle));
	border: var(--border);
	border-radius: var(--generative-radius, var(--radius--md));
}
.header {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--xs);
}
.toggle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	width: 100%;
	margin: 0;
	padding: 0;
	border: 0;
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;
}
.title {
	margin: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--lg);
	color: var(--generative-accent, var(--text-color));
}
.chevron {
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
}
.summary {
	margin: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	color: var(--text-color--subtle);
}
.brands {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}
.brand,
.brandStatic {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--4xs);
	border-radius: var(--radius--sm);
}
.brand {
	margin: 0;
	border: 0;
	background: transparent;
	cursor: pointer;

	&:hover {
		background: var(--background--light);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: var(--spacing--5xs);
	}
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}
</style>
