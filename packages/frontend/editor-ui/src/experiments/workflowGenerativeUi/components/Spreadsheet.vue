<script setup lang="ts">
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

defineProps<{
	app: string;
	operation: string;
	sheet: string;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="sheet"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.workbook" data-test-id="spreadsheet-grid">
			<header :class="$style.header">
				<NodeBrand :node-id="nodeId" :size="16" />
				<span :class="$style.app">{{ app }}</span>
				<span :class="$style.operation">{{ operation }}</span>
			</header>
			<div :class="$style.grid" aria-hidden="true">
				<span v-for="cell in 9" :key="cell" :class="$style.cell" />
			</div>
			<footer :class="$style.tabs">
				<span :class="$style.tab">{{ sheet }}</span>
			</footer>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.workbook {
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
	border-bottom: var(--border);
}

.app {
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.operation {
	margin-left: auto;
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: var(--spacing--5xs);
	padding: var(--spacing--xs);
	background: var(--background--subtle);
}

.cell {
	height: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--4xs);
}

.tabs {
	display: flex;
	padding: var(--spacing--3xs) var(--spacing--xs);
	border-top: var(--border);
}

.tab {
	padding: var(--spacing--5xs) var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	background: var(--background--subtle);
	border-radius: var(--radius--3xs) var(--radius--3xs) 0 0;
}
</style>
