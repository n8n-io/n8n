<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
	nodeId?: string | null;
	label: string;
	title: string;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="title"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<div :class="$style.card" data-test-id="generic-action-card">
			<header :class="$style.header">
				<NodeBrand :node-id="nodeId" />
				<div :class="$style.heading">
					<span :class="$style.label">{{ label }}</span>
					<strong :class="$style.title">{{ title }}</strong>
				</div>
			</header>
			<div :class="$style.body"><slot /></div>
		</div>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--xs);
	color: var(--text-color);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.heading {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.label {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.title {
	overflow: hidden;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--lg);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}
</style>
