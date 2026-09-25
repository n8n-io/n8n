<script lang="ts" setup>
import { N8nIcon } from '@n8n/design-system';
import { useTemplateRef } from 'vue';

const props = defineProps<{
	label: string;
	icon?: string;
	trailingIcon?: string;
	removable?: boolean;
	removeLabel?: string;
	testId?: string;
	removeTestId?: string;
}>();

const emit = defineEmits<{ remove: [] }>();
const rootRef = useTemplateRef<HTMLElement>('root');

defineExpose({ focus: () => rootRef.value?.focus() });

function handleRemoveKeydown(event: KeyboardEvent): void {
	if (event.key !== 'Escape') event.stopPropagation();
}
</script>

<template>
	<div ref="root" :class="$style.resourceChip" :data-test-id="props.testId">
		<span v-if="props.removable || $slots.icon || props.icon" :class="$style.leading">
			<slot name="icon">
				<N8nIcon v-if="props.icon" :icon="props.icon" size="small" />
			</slot>
		</span>
		<span :class="$style.label" :title="props.label">{{ props.label }}</span>
		<N8nIcon v-if="props.trailingIcon" :icon="props.trailingIcon" size="xsmall" />
		<!-- Trailing on touch devices. On pointer devices it is layered over the
		leading icon instead: icon at rest, X on hover (see the styles). -->
		<button
			v-if="props.removable"
			type="button"
			:class="$style.remove"
			:title="props.removeLabel"
			:aria-label="props.removeLabel"
			:data-test-id="props.removeTestId"
			@keydown="handleRemoveKeydown"
			@click.stop="emit('remove')"
		>
			<N8nIcon icon="x" size="large" />
		</button>
	</div>
</template>

<style module lang="scss">
.resourceChip {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 100%;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border-width, 1px) solid var(--tag--border-color);
	border-radius: var(--radius);
	background: var(--tag--color--background);
	font-size: var(--font-size--2xs);
	color: var(--tag--color--text);

	&:focus-visible {
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
	}
}

// Sized to the resting icon so the icon-to-label gap stays tight.
.leading {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--spacing--xs);
	height: var(--spacing--xs);
}

.label {
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

.remove {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	border: none;
	background: none;
	cursor: pointer;
	color: inherit;
	// Grows the tap target without moving the X or changing the chip height.
	padding: var(--spacing--4xs);
	margin: calc(var(--spacing--4xs) * -1);

	&:focus-visible {
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
		border-radius: var(--radius);
	}
}

// Pointer devices: the X is layered over the leading icon and only revealed on
// hover or keyboard focus, so the chip stays compact. It is centered on the icon
// box (chip padding plus half the box), and the larger X overflows it symmetrically.
@media (hover: hover) {
	.remove {
		position: absolute;
		top: 50%;
		left: calc(var(--spacing--2xs) + var(--spacing--xs) / 2);
		transform: translate(-50%, -50%);
		padding: 0;
		margin: 0;
		opacity: 0;
	}

	// Scoped to removable chips: a static chip has no X to swap in for its icon.
	.resourceChip:has(.remove):hover,
	.resourceChip:has(.remove):focus-visible,
	.resourceChip:has(.remove:focus-visible) {
		.remove {
			opacity: 1;
		}

		.leading {
			opacity: 0;
		}
	}
}
</style>
