<script setup lang="ts">
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { computed } from 'vue';

import { TOOLTIP_DELAY_MS } from '../../constants';
import N8nIcon from '../N8nIcon';
import type { IconName } from '../N8nIcon/icons';
import N8nIconButton from '../N8nIconButton/IconButton.vue';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

export interface CollapsiblePanelAction {
	icon: IconName;
	label: string;
	onClick: () => void;
	danger?: boolean;
	tooltip?: string;
}

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
	 * Action buttons to display
	 */
	actions?: CollapsiblePanelAction[];
	/**
	 * Whether to show actions only on hover (true) or always visible (false)
	 * When false, actions are shown with lighter color and darken on hover
	 */
	showActionsOnHover?: boolean;
	/**
	 * Whether the collapsible is disabled
	 */
	disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	title: '',
	modelValue: true,
	actions: () => [],
	showActionsOnHover: true,
	disabled: false,
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
	<CollapsibleRoot v-model:open="isOpen" :disabled="disabled" :class="$style.collapsiblePanel">
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
				v-if="actions.length > 0 || $slots.actions"
				:class="[$style.actions, { [$style.actionsAlwaysVisible]: !showActionsOnHover }]"
			>
				<slot name="actions">
					<N8nTooltip
						v-for="(action, index) in actions"
						:key="index"
						:disabled="!action.tooltip"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<template #content>{{ action.tooltip || action.label }}</template>
						<N8nIconButton
							type="secondary"
							text
							size="small"
							icon-size="large"
							:icon="action.icon"
							:aria-label="action.label"
							:class="[
								{ 'drag-handle': action.icon === 'grip-vertical' },
								{ [$style.dangerAction]: action.danger },
							]"
							@click.stop="action.onClick"
						/>
					</N8nTooltip>
				</slot>
			</div>
		</div>

		<CollapsibleContent :class="$style.content">
			<slot />
		</CollapsibleContent>
	</CollapsibleRoot>
</template>

<style lang="scss" module>
.collapsiblePanel {
	position: relative;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);

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
			color var(--animation--duration--spring) var(--animation--easing--spring),
			transform var(--animation--duration--spring) var(--animation--easing--spring);
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
	min-height: 40px;
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
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	line-height: 1;
	transition: color var(--animation--duration--spring) var(--animation--easing--spring);
	flex-shrink: 0;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: auto;
	opacity: 0;
	transition: opacity var(--animation--duration--spring) var(--animation--easing--spring);

	:global(.button) {
		--button--color--text: var(--color--text--shade-1);
	}
}

// Always visible variant: show actions with lighter color
.actionsAlwaysVisible {
	opacity: 1;

	:global(.button) {
		--button--color--text: var(--color--text--tint-1);
	}
}

// Danger action button (e.g., delete)
.dangerAction {
	&:hover {
		--button--color--text--hover: var(--color--danger);
	}
}

// Show actions and darken title/chevron/always-visible-actions when hovering the header
.header:hover {
	.actions {
		opacity: 1;
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

	&:focus-within {
		overflow: initial;
	}

	&[data-state='open'] {
		animation: slideDown var(--animation--duration--spring) var(--animation--easing--spring);
	}

	&[data-state='closed'] {
		animation: slideUp var(--animation--duration--spring) var(--animation--easing--spring);
	}

	// Add padding to the content, inside the animated container
	// Reka UI will measure the full height including this padding
	> :first-child {
		padding: 0 var(--spacing--xs) var(--spacing--xs) var(--spacing--xs);
	}
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
