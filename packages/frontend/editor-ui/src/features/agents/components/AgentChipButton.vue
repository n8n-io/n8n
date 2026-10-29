<script setup lang="ts">
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { ChipRestriction } from './AgentCapabilitiesSection.types';
import { chipRestrictionText } from './AgentCapabilitiesSection.utils';

const props = withDefaults(
	defineProps<{
		icon?: IconName;
		disabled?: boolean;
		deactivated?: boolean;
		variant?: 'default' | 'suggestion';
		active?: boolean;
		/** Marks the chip as having an unresolved configuration error (e.g. a missing credential). */
		invalid?: boolean;
		/** Human-readable reasons behind `invalid`, shown in a tooltip on the warning icon. */
		invalidReasons?: string[];
		/** Replaces the warning triangle on an `invalid` chip, drawn in the error colour. */
		invalidIcon?: IconName;
		/** Marks the chip as usable in preview but blocking publish (e.g. an unpublished workflow). */
		warning?: boolean;
		/** Human-readable reasons behind `warning`; ignored while `invalid` is set. */
		warningReasons?: string[];
		/** Set when a policy locks this chip. It outranks `invalid` and `warning`. */
		restriction?: ChipRestriction | null;
		clickable?: boolean;
	}>(),
	{
		disabled: false,
		deactivated: false,
		variant: 'default',
		active: false,
		invalid: false,
		invalidReasons: () => [],
		invalidIcon: undefined,
		warning: false,
		warningReasons: () => [],
		restriction: null,
		clickable: true,
	},
);

const i18n = useI18n();
const reasons = computed(() => (props.invalid ? props.invalidReasons : props.warningReasons));
// A restricted chip carries the lock alone: the popover already states why it cannot run.
const showAlertIcon = computed(
	() => !props.deactivated && !props.restriction && (props.invalid || props.warning),
);
const restrictionText = computed(() =>
	props.restriction ? chipRestrictionText(props.restriction) : '',
);

defineSlots<{
	icon?: () => unknown;
	default?: () => unknown;
}>();

const emit = defineEmits<{
	click: [event: MouseEvent];
}>();
</script>

<template>
	<button
		type="button"
		:class="[
			$style.chip,
			props.variant === 'suggestion' ? $style.suggestion : $style.default,
			{
				[$style.active]: props.active,
				[$style.deactivated]: props.deactivated,
				[$style.restricted]: !!props.restriction,
				[$style.invalid]: props.invalid && !props.deactivated && !props.restriction,
				[$style.warning]:
					props.warning && !props.invalid && !props.deactivated && !props.restriction,
				[$style.nonClickable]: !props.clickable,
			},
		]"
		:disabled="props.disabled"
		:aria-description="
			props.deactivated ? i18n.baseText('agents.builder.capabilities.deactivated') : undefined
		"
		@click="emit('click', $event)"
	>
		<span v-if="props.icon || $slots.icon" :class="$style.iconWrapper">
			<slot name="icon">
				<N8nIcon
					v-if="props.icon"
					:icon="props.icon"
					:size="16"
					:class="[$style.icon, { [$style.suggestionIcon]: props.variant === 'suggestion' }]"
				/>
			</slot>
		</span>
		<N8nText size="small" color="text-dark" :class="$style.text">
			<slot />
		</N8nText>
		<!--
			A tooltip, not the node popover: the popover's trigger is focusable, and interactive
			content inside a button is invalid HTML and adds a tab stop that cannot activate the
			chip. The ticket asks for a tooltip with the scope line, which this is.
		-->
		<N8nTooltip v-if="props.restriction" placement="top">
			<!-- The lock explains the chip; it must not also open what the chip opens. -->
			<span :class="$style.lock" @click.stop>
				<N8nIcon
					icon="lock"
					size="xsmall"
					:class="$style.lockIcon"
					data-test-id="node-restricted-icon"
				/>
			</span>
			<template #content>{{ restrictionText }}</template>
		</N8nTooltip>
		<N8nTooltip v-if="showAlertIcon" :disabled="reasons.length === 0" placement="top">
			<N8nIcon
				:icon="props.invalid && props.invalidIcon ? props.invalidIcon : 'triangle-alert'"
				:size="14"
				:class="[
					$style.alertIcon,
					{
						[$style.warningIcon]: !props.invalid,
						[$style.errorIcon]: props.invalid && props.invalidIcon,
					},
				]"
				:data-testid="props.invalid ? 'agent-chip-invalid-icon' : 'agent-chip-warning-icon'"
			/>
			<template #content>
				<div v-for="reason in reasons" :key="reason">{{ reason }}</div>
			</template>
		</N8nTooltip>
	</button>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;
.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: var(--height--md);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: light-dark(var(--background--surface), var(--background--subtle));
	box-shadow: var(--shadow--xs);
	font-family: inherit;
	cursor: pointer;

	&:focus-visible {
		@include focus.focus-ring-with-border;
	}
}

.default:not(:disabled):not(.deactivated):hover {
	background-color: var(--background--hover);
}

.chip:disabled {
	cursor: not-allowed;
	opacity: 0.6;
}

.invalid {
	border-color: var(--canvas-node--border-color--error, var(--color--danger));
}

.deactivated {
	opacity: 0.5;
}

.lock {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
}

.lockIcon {
	color: var(--color--text--tint-1);
}

// Matches the dimming of a restricted row in the tool pickers.
.restricted {
	// `.iconWrapper` too: a tool chip supplies its node icon through the slot, so it has no `.icon`.
	.iconWrapper,
	.text {
		opacity: 0.45;
	}
}

.warning {
	border-color: var(--color--warning);
}

.alertIcon {
	display: block;
	flex-shrink: 0;
}

.warningIcon {
	color: var(--color--warning);
}

.errorIcon {
	color: var(--color--danger);
}

.nonClickable {
	pointer-events: none;
}

.suggestion {
	gap: var(--spacing--4xs);
	height: auto;
	padding: var(--spacing--3xs) var(--spacing--xs);
	color: var(--text-color--subtle);
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	animation: suggestionSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease,
		color 0.15s ease,
		box-shadow 0.15s ease,
		transform 0.15s ease;
}

.suggestion:not(:disabled):hover,
.suggestion:not(:disabled):focus-visible,
.suggestion.active:not(:disabled) {
	color: color-mix(in srgb, var(--background--brand) 68%, var(--text-color));
	border-color: color-mix(in srgb, var(--background--brand) 28%, var(--border-color--subtle));
	background: color-mix(in srgb, var(--background--brand) 12%, var(--background--hover));
	box-shadow: var(--shadow--xs);
	transform: translateY(-1px);
	outline-color: var(--focus--border-color);
}

.suggestion:not(:disabled):active {
	transform: translateY(0);
	box-shadow: none;
}

.iconWrapper {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
}

.icon {
	color: var(--text-color--subtler);
}

.suggestionIcon {
	opacity: 0.7;
	flex-shrink: 0;
	transition: opacity 0.15s ease;
}

.suggestion:not(:disabled):hover .suggestionIcon,
.suggestion:not(:disabled):focus-visible .suggestionIcon,
.suggestion.active:not(:disabled) .suggestionIcon {
	opacity: 1;
}

.text {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	padding-right: var(--spacing--4xs);
}

.suggestion .text {
	color: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--normal);
	line-height: var(--line-height--sm);
	padding-right: 0;
}

@keyframes suggestionSlideIn {
	from {
		opacity: 0;
		transform: translateY(6px);
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
