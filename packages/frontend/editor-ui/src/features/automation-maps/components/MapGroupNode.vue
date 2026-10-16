<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { computed } from 'vue';

import type { MapGroupNodeData } from '../automationMap.types';

const props = defineProps<{ data: MapGroupNodeData }>();

const icon = computed(() => {
	if (props.data.group.kind === 'dataTables') return 'table';
	if (props.data.group.kind === 'services') return 'globe';
	return 'layers';
});

const style = computed(() => ({
	width: `${props.data.group.width}px`,
	height: `${props.data.group.height}px`,
	'--map-group--color--background': `var(--sticky--color--background--variant-${props.data.group.colorVariant})`,
	'--map-group--border-color': `var(--sticky--border-color--variant-${props.data.group.colorVariant})`,
}));
</script>

<template>
	<div
		:class="[$style.group, { [$style.dimmed]: data.focus === 'dimmed' }]"
		:style="style"
		:data-test-id="`map-group-${data.group.id}`"
	>
		<div :class="$style.header">
			<N8nIcon :icon="icon" :size="18" :class="$style.icon" />
			<div :class="$style.text">
				<N8nText bold size="large" :class="$style.title">{{ data.group.name }}</N8nText>
				<N8nText v-if="data.group.description" size="small" :class="$style.description">
					{{ data.group.description }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.group {
	/* stylelint-disable-next-line @n8n/css-var-naming */
	background: var(--map-group--color--background);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	border: 1px solid var(--map-group--border-color);
	border-radius: var(--radius--lg);
	transition: opacity 0.2s ease;
	pointer-events: none;
}

.dimmed {
	opacity: 0.55;
}

.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--md);
	color: var(--sticky--color--text);
}

.icon {
	margin-top: var(--spacing--5xs);
	flex-shrink: 0;
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.title,
.description {
	color: var(--sticky--color--text);
}

.description {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	opacity: 0.8;
}
</style>
