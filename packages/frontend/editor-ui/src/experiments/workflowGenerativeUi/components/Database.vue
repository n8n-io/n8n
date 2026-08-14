<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
	operation: string;
	table: string;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="table"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.records" data-test-id="database-records">
			<header :class="$style.header">
				<NodeBrand :node-id="nodeId" :size="16" />
				<code :class="$style.table">{{ table }}</code>
				<span :class="$style.operation">{{ operation }}</span>
			</header>
			<div :class="$style.rows" aria-hidden="true">
				<span :class="$style.row" />
				<span :class="$style.row" />
				<span :class="$style.row" />
			</div>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.records {
	display: flex;
	flex-direction: column;
	min-width: 0;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--background--subtle);
	border-bottom: var(--border);
}

.table {
	min-width: 0;
	overflow: hidden;
	color: var(--text-color);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.operation {
	margin-left: auto;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--3xs);
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
}

.row {
	height: var(--spacing--2xs);
	background: var(--background--subtle);
	border-radius: var(--radius--4xs);
}

.row:nth-child(2) {
	width: 80%;
}

.row:nth-child(3) {
	width: 60%;
}
</style>
