<script lang="ts" setup>
import { N8nIcon } from '@n8n/design-system';
import type { INodeTypeDescription } from 'n8n-workflow';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { isNodeChipRemovalKey } from '../constants';

// A single chip: a node-type (or fallback) icon, a name, and optional caret/remove
// buttons. The parent owns all state — this only renders and emits clicks.
const props = defineProps<{
	label: string;
	nodeType?: INodeTypeDescription | null;
	testid: string;
	/** 'layers' for group/bundle chips; unset → node-type icon or crosshair fallback. */
	icon?: 'layers';
	removable?: boolean;
	/** null → no caret; boolean → caret shown, reflecting open state. */
	expanded?: boolean | null;
}>();

const emit = defineEmits<{ remove: []; 'toggle-expand': [] }>();

// The chip is one tab stop (its inner buttons are tabindex="-1"), so a keyboard
// user walks chip-by-chip and acts on the focused chip with these keys instead
// of having to tab into each button separately.
function handleKeydown(event: KeyboardEvent) {
	const isActivationKey = event.key === 'Enter';
	if (isActivationKey && props.expanded != null) {
		event.preventDefault();
		emit('toggle-expand');
		return;
	}

	if (isNodeChipRemovalKey(event.key) && props.removable) {
		event.preventDefault();
		emit('remove');
	}
}
</script>

<template>
	<span
		:class="$style.chip"
		:data-testid="testid"
		tabindex="0"
		role="group"
		:aria-label="label"
		@keydown="handleKeydown"
	>
		<N8nIcon v-if="icon" :icon="icon" size="xsmall" />
		<NodeIcon v-else-if="nodeType" :node-type="nodeType" :size="12" />
		<N8nIcon v-else icon="crosshair" size="xsmall" />
		<span :class="$style.name" :title="label">{{ label }}</span>
		<button
			v-if="expanded != null"
			:class="$style.iconBtn"
			data-testid="nodes-chip-expand"
			tabindex="-1"
			@click.stop="emit('toggle-expand')"
		>
			<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" size="xsmall" />
		</button>
		<button
			v-if="removable"
			:class="$style.iconBtn"
			data-testid="nodes-chip-remove"
			tabindex="-1"
			@click.stop="emit('remove')"
		>
			<N8nIcon icon="x" size="xsmall" />
		</button>
	</span>
</template>

<style lang="scss" module>
.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 220px;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border-width, 1px) solid var(--border-color--success);
	border-radius: var(--radius);
	background: var(--background--success);
	font-size: var(--font-size--2xs);
	color: var(--text-color--success);

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.name {
	// `min-width: 0` lets the flex item shrink below its content so the ellipsis
	// kicks in within the chip's max-width instead of overflowing.
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	// `overflow: hidden` clips to the line box, so an inherited tight line-height
	// would cut off descenders (g, j). Set one with room for them.
	line-height: var(--line-height--sm);
}

.iconBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: none;
	background: none;
	padding: 0;
	cursor: pointer;
	color: var(--color--text--shade-1);
}
</style>
