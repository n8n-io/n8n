<script setup lang="ts">
import { computed } from 'vue';
import { useStateStore } from '@json-render/vue';
import { visualPropsSchema, type VisualProps } from '../visualGrammar';
import { disclosureStatePath } from '../disclosure';
import VisualPrimitive from './VisualPrimitive.vue';

const props = defineProps<
	VisualProps & {
		title: string;
		caption?: string | null;
	}
>();

const visual = computed(() => visualPropsSchema.parse(props));

const store = useStateStore();

const statePath = computed(() =>
	disclosureStatePath(['beat', props.title, props.caption, props.emphasis, props.variant]),
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
</script>

<template>
	<VisualPrimitive v-bind="visual">
		<section :class="$style.beat">
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
			<p v-if="caption" :class="$style.caption">{{ caption }}</p>
			<div v-if="showDetails && $slots.default" :class="$style.content"><slot /></div>
		</section>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.beat {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
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
.caption {
	margin: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	color: var(--text-color--subtle);
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}
</style>
