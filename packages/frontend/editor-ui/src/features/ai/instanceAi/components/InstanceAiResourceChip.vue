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
	<div
		ref="root"
		:class="[$style.resourceChip, { [$style.removable]: props.removable }]"
		:data-test-id="props.testId"
	>
		<!-- Leading icon doubles as the remove control: resource icon at rest, X on hover. -->
		<span v-if="props.removable || $slots.icon || props.icon" :class="$style.leading">
			<span :class="$style.leadingIcon">
				<slot name="icon">
					<N8nIcon v-if="props.icon" :icon="props.icon" size="small" />
				</slot>
			</span>
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
		</span>
		<span :class="$style.label" :title="props.label">{{ props.label }}</span>
		<N8nIcon v-if="props.trailingIcon" :icon="props.trailingIcon" size="xsmall" />
	</div>
</template>

<style module lang="scss">
.resourceChip {
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

// Sized to the resting icon so the icon-to-label gap stays tight. The larger X
// is centered on the same box and overflows it symmetrically.
.leading {
	position: relative;
	display: inline-flex;
	flex-shrink: 0;
	width: var(--spacing--xs);
	height: var(--spacing--xs);
}

.leadingIcon,
.remove {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	display: flex;
	align-items: center;
	justify-content: center;
}

.remove {
	border: none;
	background: none;
	padding: 0;
	cursor: pointer;
	color: inherit;
	opacity: 0;

	&:focus-visible {
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
		border-radius: var(--radius);
	}
}

// Hovering the chip, or focusing the chip or the button, swaps the resting icon for the X.
.resourceChip:hover,
.resourceChip:focus-visible,
.leading:focus-within {
	.remove {
		opacity: 1;
	}

	.leadingIcon {
		opacity: 0;
	}
}

// Touch devices have no hover, so keep the remove control reachable.
@media (hover: none) {
	.remove {
		opacity: 1;
	}

	.removable .leadingIcon {
		opacity: 0;
	}
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
</style>
