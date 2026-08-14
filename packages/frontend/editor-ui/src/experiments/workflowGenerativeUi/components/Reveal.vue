<script setup lang="ts">
import { computed } from 'vue';
import { useStateStore } from '@json-render/vue';
import { disclosureStatePath } from '../disclosure';

const props = defineProps<{
	label: string;
}>();

const store = useStateStore();

const statePath = computed(() => disclosureStatePath(['reveal', props.label]));

const expanded = computed(() => {
	void store.state.value;
	return Boolean(store.get(statePath.value));
});

function toggle() {
	store.set(statePath.value, !expanded.value);
}
</script>

<template>
	<section :class="$style.reveal" data-test-id="param-reveal">
		<button
			type="button"
			:class="$style.toggle"
			:aria-expanded="expanded"
			data-test-id="reveal-toggle"
			@click="toggle"
		>
			<span :class="$style.label">{{ label }}</span>
			<span :class="$style.chevron" aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span>
		</button>
		<div v-if="expanded" :class="$style.content" data-test-id="reveal-content">
			<slot />
		</div>
	</section>
</template>

<style lang="scss" module>
.reveal {
	display: flex;
	flex-direction: column;
	min-width: 0;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
	overflow: hidden;
}

.toggle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	width: 100%;
	margin: 0;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 0;
	background: var(--background--subtle);
	color: inherit;
	text-align: left;
	cursor: pointer;
}

.label {
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.chevron {
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border-top: var(--border);
	min-width: 0;
}
</style>
