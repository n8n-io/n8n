<script setup lang="ts">
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { computed } from 'vue';

import N8nIcon from '../N8nIcon';

export interface Props {
	/**
	 * The title of the collapsible panel
	 */
	title?: string;
	/**
	 * Whether the panel is expanded or collapsed
	 */
	modelValue?: boolean;
	/**
	 * Whether to show actions only on hover (true) or always visible (false)
	 * When false, actions are shown with lighter color and darken on hover
	 */
	showActionsOnHover?: boolean;
	/**
	 * Whether the collapsible is disabled
	 */
	disabled?: boolean;
	/**
	 * Whether to disable animations (useful during drag operations)
	 */
	disableAnimation?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	title: '',
	modelValue: true,
	showActionsOnHover: true,
	disabled: false,
	disableAnimation: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
}>();

const isOpen = computed({
	get: () => props.modelValue,
	set: (value: boolean) => emit('update:modelValue', value),
});
</script>

<template>
	<CollapsibleRoot
		v-model:open="isOpen"
		:disabled="disabled"
		:unmount-on-hide="false"
		:class="$style.collapsiblePanel"
	>
		<div :class="$style.header">
			<CollapsibleTrigger :class="$style.trigger">
				<N8nIcon
					icon="chevron-down"
					:size="14"
					:class="[$style.chevron, { [$style.chevronOpen]: isOpen }]"
				/>
				<span v-if="title || $slots.title" :class="$style.title">
					<slot name="title">{{ title }}</slot>
				</span>
			</CollapsibleTrigger>

			<div
				v-if="$slots.actions"
				:class="[$style.actions, { [$style.actionsAlwaysVisible]: !showActionsOnHover }]"
			>
				<slot name="actions" />
			</div>
		</div>

		<CollapsibleContent :class="[$style.content, { [$style.noAnimation]: disableAnimation }]">
			<slot />
		</CollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.collapsiblePanel {
	position: relative;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background-color: var(--ndv--background--color);
	scroll-margin-bottom: var(--spacing--xl);

	// Nested panels: extend to parent's right edge and remove right border/radius
	.collapsiblePanel & {
		margin-right: calc(var(--spacing--xs) * -1);
		border-right: none;
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	+ .collapsiblePanel {
		margin-top: var(--spacing--xs);
	}

	.chevron {
		flex-shrink: 0;
		color: var(--color--text--tint-1);
		width: 14px;
		height: 14px;
		transform: rotate(-90deg);
		transition:
			color var(--animation--duration) var(--animation--easing),
			transform var(--animation--duration) var(--animation--easing);
	}

	.chevronOpen {
		transform: rotate(0deg);
	}
}

.header {
	display: flex;
	align-items: center;
	padding: var(--spacing--4xs) var(--spacing--xs);
	gap: var(--spacing--4xs);
	min-height: 32px;
}

.trigger {
	all: unset;
	display: flex;
	flex: 1;
	align-self: stretch;
	align-items: center;
	gap: var(--spacing--4xs);
	cursor: pointer;

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius--sm);
	}
}

.title {
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	line-height: 1;
	transition: color var(--animation--duration) var(--animation--easing);
	flex-shrink: 0;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: auto;
	opacity: 0;
	transition: opacity var(--animation--duration) var(--animation--easing);

	button {
		--button--color--text: var(--color--text--tint-1);
	}
}

// Always visible variant: show actions with lighter color
.actionsAlwaysVisible {
	opacity: 1;

	:global(.button) {
		--button--color--text: var(--color--text--tint-1);
	}
}

.dangerAction {
	&:hover {
		--button--color--text--hover: var(--color--danger);
	}
}

.collapsiblePanel:hover:not(:has(.collapsiblePanel:hover)),
.collapsiblePanel[data-state='open']:focus-within:not(:has(.collapsiblePanel:focus-within)) {
	> .header > .actions {
		opacity: 1;
	}
}

.header:hover {
	.actions {
		button {
			--button--color--text: var(--color--text--shade-1);
		}
	}

	.trigger {
		.title,
		.chevron {
			color: var(--color--text--shade-1);
		}
	}

	.actionsAlwaysVisible :global(.button) {
		--button--color--text: var(--color--text--shade-1);
	}
}

.content {
	overflow: hidden;

	&:focus-within,
	&:hover {
		overflow: initial;
	}

	&[data-state='open'] {
		animation: slideDown var(--animation--duration--collapse, var(--animation--duration))
			var(--animation--easing);
	}

	&[data-state='closed'] {
		animation: slideUp var(--animation--duration--collapse, var(--animation--duration))
			var(--animation--easing);
	}

	> :first-child {
		padding: 0 var(--spacing--xs) var(--spacing--xs) var(--spacing--xs);
	}
}

.noAnimation {
	--animation--duration--collapse: 0s;
}

@keyframes slideDown {
	from {
		height: 0;
	}
	to {
		height: var(--reka-collapsible-content-height);
	}
}

@keyframes slideUp {
	from {
		height: var(--reka-collapsible-content-height);
	}
	to {
		height: 0;
	}
}
</style>
