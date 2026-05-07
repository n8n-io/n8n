<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, type IconName } from '@n8n/design-system';
import type { EventKind } from '../session-timeline.types';
import { pillColors } from '../session-timeline.styles';

const props = withDefaults(
	defineProps<{
		kind: EventKind | 'idle';
		label?: string;
		showLabel?: boolean;
	}>(),
	{
		label: '',
		showLabel: false,
	},
);

const icon = computed((): IconName => {
	switch (props.kind) {
		case 'user':
			return 'user';
		case 'agent':
			return 'bot';
		case 'tool':
			return 'wrench';
		case 'workflow':
			return 'workflow';
		case 'node':
			return 'box';
		case 'working-memory':
			return 'brain';
		case 'suspension':
		case 'idle':
			return 'clock';
		default:
			return 'info';
	}
});

const iconStyle = computed(() => pillColors(props.kind));
</script>

<template>
	<span :class="[$style.pill, showLabel && $style.withLabel]" :style="iconStyle">
		<N8nIcon :icon="icon" size="small" />
		<span v-if="showLabel && label" :class="$style.label">{{ label }}</span>
	</span>
</template>

<style module lang="scss">
.pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	border-radius: var(--radius--lg);
	flex-shrink: 0;
}

.withLabel {
	width: auto;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--2xs);
}

.label {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	line-height: 1;
}
</style>
