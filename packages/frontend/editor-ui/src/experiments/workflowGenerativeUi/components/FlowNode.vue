<script setup lang="ts">
import { computed } from 'vue';
import { useGenerativeUiNode } from '../nodeLookup';

const props = defineProps<{
	nodeId?: string | null;
	nodeIds?: string[];
	label?: string | null;
}>();

const primaryNodeId = computed(() => props.nodeId ?? props.nodeIds?.[0] ?? null);
const node = useGenerativeUiNode(() => primaryNodeId.value);

const accessibleName = computed(() => props.label ?? node.value?.name ?? null);
</script>

<template>
	<div
		:class="$style.node"
		data-test-id="flow-node"
		role="group"
		:aria-label="accessibleName ?? undefined"
	>
		<span v-if="label" :class="$style.label">{{ label }}</span>
		<div :class="$style.body"><slot /></div>
	</div>
</template>

<style lang="scss" module>
.node {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--md);
	background: var(--background--surface);
}

.label {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}
</style>
