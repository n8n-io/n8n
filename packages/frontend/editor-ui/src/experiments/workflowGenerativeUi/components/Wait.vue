<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
	summary: string;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="summary"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.pause" data-test-id="wait-pause">
			<NodeBrand :node-id="nodeId" :size="16" />
			<span :class="$style.label">Pauses</span>
			<p :class="$style.summary">{{ summary }}</p>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.pause {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--2xs) var(--spacing--sm);
	background: var(--background--subtle);
	border-left: var(--spacing--4xs) dashed var(--border-color--strong);
	border-radius: 0 var(--radius--full) var(--radius--full) 0;
}

.label {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.summary {
	flex: 1;
	min-width: 0;
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--sm);
}
</style>
