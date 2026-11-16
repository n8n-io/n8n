<script lang="ts" setup>
import { computed } from 'vue';
import { N8nBadge, N8nIcon, type IconName } from '@n8n/design-system';
import type { EventKind } from '../session-timeline.types';

const props = withDefaults(
	defineProps<{
		kind: EventKind | 'idle' | 'subagent';
		label: string;
		showLabel?: boolean;
	}>(),
	{
		label: '',
		showLabel: false,
	},
);

const icon = computed((): IconName => {
	switch (props.kind) {
		case 'background-task':
			return 'list-checks';
		case 'background-task-signal':
			return 'list-checks';
		case 'user':
			return 'user';
		case 'agent':
		case 'subagent':
			return 'bot';
		case 'skill':
			return 'book-open';
		case 'memory':
			return 'brain';
		case 'tool':
			return 'wrench';
		case 'workflow':
			return 'workflow';
		case 'node':
			return 'box';
		case 'execution-error':
			return 'circle-x';
		case 'suspension':
		case 'idle':
			return 'clock';
		case 'hitl-response':
			return 'message-square';
		default:
			return 'info';
	}
});
</script>

<template>
	<N8nBadge v-if="showLabel && label" :leading-icon="icon" variant="filled" size="xxsmall">
		{{ label }}
	</N8nBadge>
	<N8nIcon v-else :aria-label="label" :icon="icon" size="medium" />
</template>

<style module lang="scss">
.withLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	line-height: 1;
}
</style>
