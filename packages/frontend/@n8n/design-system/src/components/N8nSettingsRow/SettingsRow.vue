<script setup lang="ts">
import { computed, useSlots } from 'vue';

import N8nText from '../N8nText';

export type SettingsRowLayout = 'horizontal' | 'vertical' | 'custom';
export type SettingsRowAlign = 'center' | 'start';

export interface SettingsRowProps {
	/** Left title (text-dark, 14/medium). Optional when the `info` slot is used. */
	title?: string;
	/** Left description (text-light, 12/regular). Wraps and clamps to `maxDescriptionLines`. */
	description?: string;
	/** Arrangement of info vs action. `custom` hands the whole row to the default slot. */
	layout?: SettingsRowLayout;
	/** Vertical alignment of action vs info in the `horizontal` layout. */
	align?: SettingsRowAlign;
	/** Soft default 2; hard clamped to a maximum of 3 lines regardless of the value passed. */
	maxDescriptionLines?: number;
	/** Single-line ellipsis title. */
	truncateTitle?: boolean;
	/** Horizontal layout only: caps the action width (default 50%). `false` removes the cap. */
	actionMaxWidth?: string | false;
	/**
	 * Horizontal layout only: let the action grow to fill its available width up to
	 * `actionMaxWidth` (Figma "fill"). Default `false` hugs the action to its content (Figma
	 * "hug"). Pair with a slot child that is `width: 100%` so it visibly fills the slot.
	 */
	actionFill?: boolean;
	/** Bottom divider. The last row in a group auto-hides its divider via CSS. */
	showDivider?: boolean;
	/** Show the leading visual slot. Implicitly true when the `visual` slot is filled. */
	showVisual?: boolean;
	/** PR2 placeholder: reserves the disclosure affordance. Inert in PR1. */
	expandable?: boolean;
	/** PR2 placeholder: pairs with `@update:expanded` (`v-model:expanded`). Inert in PR1. */
	expanded?: boolean;
	/** Shows a subtle hover background on the row. Implied by `clickable`. */
	hoverable?: boolean;
	/**
	 * Turns the whole row into a single clickable control: pointer cursor, hover and
	 * active states, `role="button"` + keyboard (Enter/Space), and emits `@click`. Pair it
	 * with a `N8nSettingsRowConfigure` affordance in the `#action` slot.
	 */
	clickable?: boolean;
	/**
	 * Hides the `#action` slot until the row is hovered or contains keyboard focus. Use for
	 * secondary actions (e.g. "Log out"/"Revoke"). Revealed action clicks never bubble to a
	 * `clickable` row.
	 */
	revealActionsOnHover?: boolean;
}

defineOptions({ name: 'N8nSettingsRow' });

const props = withDefaults(defineProps<SettingsRowProps>(), {
	title: undefined,
	description: undefined,
	layout: 'horizontal',
	align: 'center',
	maxDescriptionLines: 2,
	truncateTitle: true,
	actionMaxWidth: '50%',
	actionFill: false,
	showDivider: true,
	showVisual: false,
	expandable: false,
	expanded: false,
	hoverable: false,
	clickable: false,
	revealActionsOnHover: false,
});

const emit = defineEmits<{
	// PR2 placeholder: declared so consumers can wire `v-model:expanded` without a breaking
	// change later. PR1 never emits it internally (state stays consumer-owned).
	'update:expanded': [value: boolean];
	click: [event: MouseEvent | KeyboardEvent];
}>();

const slots = useSlots();

const descriptionLines = computed(() => Math.min(Math.max(props.maxDescriptionLines, 1), 3));

const showVisualSlot = computed(() => props.showVisual || Boolean(slots.visual));

const actionStyle = computed(() => {
	if (props.layout !== 'horizontal' || props.actionMaxWidth === false) {
		return undefined;
	}
	return { maxWidth: props.actionMaxWidth };
});

const interactiveAttrs = computed(() =>
	props.clickable ? { role: 'button', tabindex: 0, 'aria-label': props.title || undefined } : {},
);

function onActivate(event: MouseEvent) {
	if (props.clickable) {
		emit('click', event);
	}
}

function onKeydown(event: KeyboardEvent) {
	if (!props.clickable) {
		return;
	}
	if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
		event.preventDefault();
		emit('click', event);
	}
}
</script>

<template>
	<div
		:class="[
			$style.row,
			$style[layout],
			{
				[$style.alignStart]: align === 'start',
				[$style.hoverable]: hoverable,
				[$style.clickable]: clickable,
			},
		]"
		:data-layout="layout"
		v-bind="interactiveAttrs"
		@click="onActivate"
		@keydown="onKeydown"
	>
		<template v-if="layout === 'custom'">
			<slot />
		</template>
		<template v-else>
			<div :class="$style.info">
				<div v-if="showVisualSlot" :class="$style.visual" data-test-id="settings-row-visual">
					<slot name="visual" />
				</div>
				<div :class="$style.text">
					<slot name="info">
						<N8nText
							v-if="title"
							:class="[$style.title, { [$style.truncate]: truncateTitle }]"
							bold
							size="medium"
							color="text-dark"
						>
							{{ title }}
						</N8nText>
						<N8nText
							v-if="description"
							:class="$style.description"
							:style="{ '--settings-row--description-lines': descriptionLines }"
							size="small"
							color="text-light"
						>
							{{ description }}
						</N8nText>
					</slot>
				</div>
			</div>
			<div
				v-if="slots.action"
				:class="[
					$style.action,
					{
						[$style.revealActions]: revealActionsOnHover,
						[$style.actionFill]: actionFill && layout === 'horizontal',
					},
				]"
				:style="actionStyle"
				@click="revealActionsOnHover ? $event.stopPropagation() : undefined"
			>
				<slot name="action" />
			</div>
		</template>

		<div v-if="expandable && expanded && slots.revealed" :class="$style.revealed">
			<slot name="revealed" />
		</div>

		<span
			v-if="showDivider"
			:class="$style.divider"
			data-test-id="settings-row-divider"
			aria-hidden="true"
		/>
	</div>
</template>

<style lang="scss" module>
.row {
	position: relative;
	display: flex;
	width: 100%;
	box-sizing: border-box;
}

.hoverable,
.clickable {
	transition: background-color 0.1s ease-in-out;
}

.hoverable:hover,
.clickable:hover {
	background-color: var(--background--hover);
}

.clickable {
	cursor: pointer;
}

.clickable:active {
	background-color: var(--background--active);
}

.clickable:focus-visible {
	outline: var(--focus--border-width, 2px) solid var(--focus--border-color);
	outline-offset: calc(-1 * var(--focus--border-width, 2px));
}

.horizontal {
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	min-height: var(--height--4xl);
	padding-inline: var(--spacing--sm);
}

.vertical {
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.custom {
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
}

.alignStart.horizontal {
	align-items: flex-start;
}

.info {
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1 0 0;
	min-width: 0;
}

.visual {
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--2xs);
	overflow: clip;
	color: var(--text-color--subtle);
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding-block: var(--spacing--xs);
	flex: 1 0 0;
	min-width: 0;
}

.title {
	&.truncate {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.description {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: var(--settings-row--description-lines, 2);
	overflow: hidden;
}

.action {
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	min-width: 0;
}

/*
 * "Fill": the action shares the row with the info (both grow), so it expands to its
 * available width and is bounded by `actionMaxWidth`. Without this the action hugs its
 * content (flex: 0 0 auto) and the cap only clamps intrinsically-wide content.
 */
.actionFill {
	flex: 1 1 0;
}

.vertical .action {
	width: 100%;
	justify-content: flex-start;
}

.revealActions {
	opacity: 0;
	transition: opacity 0.1s ease-in-out;
}

.row:hover .revealActions,
.row:focus-within .revealActions {
	opacity: 1;
}

.revealed {
	width: 100%;
}

.divider {
	position: absolute;
	bottom: 0;
	left: var(--spacing--sm);
	right: var(--spacing--sm);
	height: 1px;
	background: var(--border-color--subtle);
}
</style>
