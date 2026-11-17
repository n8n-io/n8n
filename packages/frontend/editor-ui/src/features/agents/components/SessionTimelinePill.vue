<script lang="ts" setup>
import { computed } from 'vue';
import { N8nBadge, N8nIcon, type IconName } from '@n8n/design-system';
import type { EventKind } from '../session-timeline.types';
import MessageCircleOff from '~icons/lucide/message-circle-off';

const props = withDefaults(
	defineProps<{
		kind: EventKind | 'idle' | 'subagent';
		toolName?: string;
		label: string;
		showLabel?: boolean;
	}>(),
	{
		label: '',
		showLabel: false,
	},
);

const isSilentTool = computed(() => props.kind === 'tool' && props.toolName === 'do_not_respond');

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
	<N8nBadge
		v-if="showLabel && label"
		:leading-icon="isSilentTool ? undefined : icon"
		variant="filled"
		size="xxsmall"
	>
		<template v-if="isSilentTool" #leading>
			<MessageCircleOff :class="[$style.silentIcon, $style.badgeIcon]" aria-hidden="true" />
		</template>
		{{ label }}
	</N8nBadge>
	<MessageCircleOff
		v-else-if="isSilentTool"
		:class="$style.silentIcon"
		:aria-label="label"
		role="img"
	/>
	<N8nIcon v-else :aria-label="label" :icon="icon" size="medium" />
</template>

<style module lang="scss">
.silentIcon {
	width: var(--font-size--sm);
	height: var(--font-size--sm);
	flex-shrink: 0;
}

.badgeIcon {
	width: var(--font-size--2xs);
	height: var(--font-size--2xs);
}

.withLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	line-height: 1;
}
</style>
