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
		<section :class="$style.source" data-test-id="knowledge-source">
			<header :class="$style.header">
				<NodeBrand :node-id="nodeId" :size="16" />
				<span :class="$style.label">Knowledge source</span>
			</header>
			<p :class="$style.summary">{{ summary }}</p>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.source {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
	box-shadow: var(--spacing--5xs) var(--spacing--5xs) 0 0 var(--background--subtle);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.label {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.summary {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}
</style>
