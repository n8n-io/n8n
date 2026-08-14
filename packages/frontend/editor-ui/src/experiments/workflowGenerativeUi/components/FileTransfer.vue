<script setup lang="ts">
import { computed } from 'vue';
import InteractiveSurface from './InteractiveSurface.vue';
import NodeBrand from './NodeBrand.vue';

const props = defineProps<{
	direction: 'upload' | 'download' | 'copy';
	app: string;
	path: string;
	nodeId?: string | null;
	pressBound?: boolean;
}>();

defineEmits<{ press: [] }>();

const directionLabel = computed(
	() => ({ upload: 'Uploads to', download: 'Downloads from', copy: 'Copies to' })[props.direction],
);
</script>

<template>
	<InteractiveSurface
		:node-id="nodeId"
		:label="app"
		:press-bound="pressBound"
		@press="$emit('press')"
	>
		<section :class="$style.movement" data-test-id="file-transfer">
			<span :class="$style.direction">{{ directionLabel }}</span>
			<div :class="$style.route">
				<span :class="$style.endpoint" data-test-id="file-endpoint">
					<NodeBrand :node-id="nodeId" :size="16" />
					<span :class="$style.app">{{ app }}</span>
				</span>
				<span :class="$style.link" aria-hidden="true" />
				<span :class="[$style.endpoint, $style.target]" data-test-id="file-endpoint">
					<code :class="$style.path">{{ path }}</code>
				</span>
			</div>
		</section>
	</InteractiveSurface>
</template>

<style lang="scss" module>
.movement {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--md);
}

.direction {
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wide);
	text-transform: uppercase;
}

.route {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.endpoint {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background: var(--background--subtle);
	border: var(--border);
	border-radius: var(--radius--sm);
}

.target {
	flex: 1;
}

.app {
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.link {
	width: var(--spacing--md);
	border-top: var(--border);
	border-color: var(--border-color--strong);
}

.path {
	min-width: 0;
	color: var(--text-color--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	overflow-wrap: anywhere;
}
</style>
