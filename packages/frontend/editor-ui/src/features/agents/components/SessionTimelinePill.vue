<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon, type IconName } from '@n8n/design-system';
import type { EventKind } from '../session-timeline.types';

const props = withDefaults(
	defineProps<{
		kind: EventKind | 'idle' | 'subagent';
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
		case 'background-task-signal':
			return 'list-checks';
		case 'user':
			return 'user';
		case 'agent':
		case 'subagent':
			return 'bot';
		case 'skill':
			return 'book-open';
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
	<N8nIcon :icon="icon" size="medium" />
</template>
