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
		<section :class="$style.mapping" data-test-id="transform-mapping">
			<div :class="$style.lane" aria-hidden="true">
				<span :class="$style.port" />
				<span :class="$style.wire" />
				<span :class="$style.port" />
			</div>
			<div :class="$style.detail">
				<NodeBrand :node-id="nodeId" :size="16" />
				<p :class="$style.summary">{{ summary }}</p>
			</div>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.mapping {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	min-width: 0;
	padding: var(--spacing--xs) var(--spacing--sm);
	background: var(--background--subtle);
	border-radius: var(--radius--sm);
}

.lane {
	display: flex;
	flex-shrink: 0;
	align-items: center;
}

.port {
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	background: var(--background--surface);
	border: var(--border);
	border-color: var(--border-color--strong);
	border-radius: var(--radius--full);
}

.wire {
	width: var(--spacing--md);
	border-top: var(--border);
	border-color: var(--border-color--strong);
}

.detail {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.summary {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}
</style>
