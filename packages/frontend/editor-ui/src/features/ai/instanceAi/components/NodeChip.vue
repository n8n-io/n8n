<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INodeTypeDescription } from 'n8n-workflow';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { isNodeChipRemovalKey } from '../constants';

const props = defineProps<{
	label: string;
	nodeType?: INodeTypeDescription | null;
	testid: string;
	icon?: 'layers';
	removable?: boolean;
	expanded?: boolean | null;
}>();

const emit = defineEmits<{ remove: []; 'toggle-expand': []; 'enter-panel': [] }>();

const i18n = useI18n();

const rootRef = useTemplateRef<HTMLElement>('root');
defineExpose({ focus: () => rootRef.value?.focus() });

// stopPropagation prevents the canvas/logs panel's document-level
// Arrow/Enter/Escape shortcuts from also firing (see shouldIgnoreCanvasShortcut).
function handleKeydown(event: KeyboardEvent) {
	const isExpandable = props.expanded !== null && props.expanded !== undefined;

	if (event.key === 'Enter' && isExpandable) {
		event.preventDefault();
		event.stopPropagation();
		emit('toggle-expand');
		return;
	}

	if (event.key === 'Escape' && props.expanded === true) {
		event.preventDefault();
		event.stopPropagation();
		emit('toggle-expand');
		return;
	}

	// Drop straight into the expand panel's node list; the parent expands it
	// first if it wasn't already open.
	if (event.key === 'ArrowDown' && isExpandable) {
		event.preventDefault();
		event.stopPropagation();
		emit('enter-panel');
		return;
	}

	if (isNodeChipRemovalKey(event.key) && props.removable) {
		event.preventDefault();
		event.stopPropagation();
		emit('remove');
	}
}
</script>

<template>
	<span
		ref="root"
		:class="[$style.chip, { [$style.expandable]: expanded != null }]"
		:data-test-id="testid"
		tabindex="0"
		role="group"
		:aria-label="label"
		@keydown="handleKeydown"
		@click="expanded != null && emit('toggle-expand')"
	>
		<!-- Leading icon doubles as the remove control: node icon at rest, X on hover. -->
		<button
			v-if="removable"
			type="button"
			:class="[$style.iconBtn, $style.leadingBtn]"
			data-test-id="nodes-chip-remove"
			tabindex="-1"
			:aria-label="i18n.baseText('generic.delete')"
			@click.stop="emit('remove')"
		>
			<span :class="$style.leadingRemove"><N8nIcon icon="x" size="large" /></span>
			<span :class="$style.leadingIcon">
				<N8nIcon v-if="icon" :icon="icon" size="small" />
				<NodeIcon v-else-if="nodeType" :node-type="nodeType" :size="12" />
				<N8nIcon v-else icon="crosshair" size="small" />
			</span>
		</button>
		<template v-else>
			<N8nIcon v-if="icon" :icon="icon" size="xsmall" />
			<NodeIcon v-else-if="nodeType" :node-type="nodeType" :size="12" />
			<N8nIcon v-else icon="crosshair" size="xsmall" />
		</template>
		<span :class="$style.name" :title="label">{{ label }}</span>
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
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
	}
}

.expandable {
	cursor: pointer;
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
	border-radius: var(--radius--sm);
	color: var(--color--text--shade-1);

	&:hover,
	&:focus-visible {
		color: var(--color--text);
		background: var(--color--foreground);
	}
}

// Leading slot layers the X over the node icon; sized to the node icon so the
// icon-to-label gap stays tight. The larger X overflows and centers over it.
.leadingBtn {
	position: relative;
	width: var(--spacing--xs);
	height: var(--spacing--xs);
	color: inherit;

	&:hover,
	&:focus-visible {
		color: inherit;
		background: none;
	}
}

// Centered on the box; sized to content so the larger X isn't squeezed by the
// icon-sized box and overflows symmetrically instead.
.leadingRemove,
.leadingIcon {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	display: flex;
}

.leadingRemove {
	opacity: 0;
}

.chip:hover,
.chip:focus-visible {
	.leadingRemove {
		opacity: 1;
	}

	.leadingIcon {
		opacity: 0;
	}
}
</style>
