<script setup lang="ts">
import { computed, ref, watch, useSlots } from 'vue';

import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

export type SettingsRowLayout = 'horizontal' | 'vertical' | 'custom';

// Stable, per-instance id so the disclosure trigger can `aria-controls` its region.
let expandRegionUid = 0;

export interface SettingsRowProps {
	/** Left title (text-dark, 14/medium). Optional when the `info` slot is used. */
	title?: string;
	/** Left description (text-light, 12/regular). Wraps and clamps to `maxDescriptionLines`. */
	description?: string;
	/** Arrangement of info vs action. `custom` hands the whole row to the default slot. */
	layout?: SettingsRowLayout;
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
	/**
	 * Enables the disclosure region (`#expanded` slot) that animates open/closed. Pair with
	 * `v-model` (`modelValue`): bind it to whatever control owns the state — a switch in the
	 * `#action` slot, a button, or the built-in chevron trigger.
	 */
	expandable?: boolean;
	/** Expanded state. Two-way bound via `v-model`; also drivable by any `#action` control. */
	modelValue?: boolean;
	/**
	 * Renders the built-in chevron disclosure trigger (the default affordance). Set `false`
	 * when an `#action` control (e.g. a switch) is the sole trigger.
	 */
	disclosure?: boolean;
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
	maxDescriptionLines: 2,
	truncateTitle: true,
	actionMaxWidth: '50%',
	actionFill: false,
	showDivider: true,
	showVisual: false,
	expandable: false,
	modelValue: false,
	disclosure: true,
	hoverable: false,
	clickable: false,
	revealActionsOnHover: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
	click: [event: MouseEvent | KeyboardEvent];
}>();

const slots = useSlots();

const expandRegionId = `settings-row-expand-${(expandRegionUid += 1)}`;

// Mirror `modelValue` internally so the row also works uncontrolled (built-in chevron) while
// still honouring a bound `v-model` or an `#action` control that drives the state.
const internalExpanded = ref(props.modelValue);
watch(
	() => props.modelValue,
	(value) => {
		internalExpanded.value = value;
	},
);
const isExpanded = computed(() => props.expandable && internalExpanded.value);

function toggleExpanded(event: MouseEvent) {
	event.stopPropagation();
	const next = !internalExpanded.value;
	internalExpanded.value = next;
	emit('update:modelValue', next);
}

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
			<button
				v-if="expandable && disclosure"
				type="button"
				:class="$style.disclosure"
				:aria-expanded="isExpanded"
				:aria-controls="expandRegionId"
				:aria-label="title ? `Toggle ${title}` : 'Toggle details'"
				@click="toggleExpanded"
			>
				<N8nIcon :class="$style.disclosureIcon" icon="chevron-down" />
			</button>
		</template>

		<div
			v-if="expandable"
			:id="expandRegionId"
			:class="$style.expandRegion"
			:data-expanded="isExpanded"
			role="region"
		>
			<div :class="$style.expandInner">
				<div :class="$style.expandContent">
					<slot name="expanded" />
				</div>
			</div>
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
// The expand/collapse motion. 200ms maps to `--duration--snappy`; the curve has no DS token,
// so it lives here as a local constant per the motion spec.
$expand-easing: cubic-bezier(0.32, 0.72, 0, 1);

.row {
	position: relative;
	display: flex;
	flex-wrap: wrap;
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

.disclosure {
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-inline-start: var(--spacing--2xs);
	padding: var(--spacing--4xs);
	border: none;
	background: transparent;
	border-radius: var(--radius);
	color: var(--text-color--subtle);
	cursor: pointer;
}

.disclosure:hover {
	background: var(--background--hover);
}

.disclosure:focus-visible {
	outline: var(--focus--border-width, 2px) solid var(--focus--border-color);
	outline-offset: calc(-1 * var(--focus--border-width, 2px));
}

.disclosureIcon {
	transition: transform var(--duration--snappy) $expand-easing;
}

.disclosure[aria-expanded='true'] .disclosureIcon {
	transform: rotate(180deg);
}

/*
 * Animated reveal: the grid 0fr→1fr technique animates real height without `height: auto`,
 * paired with an opacity fade and a subtle blur. The region always takes a full row (it wraps
 * below the header in the horizontal layout).
 */
.expandRegion {
	flex: 0 0 100%;
	width: 100%;
	display: grid;
	grid-template-rows: 0fr;
	opacity: 0;
	filter: blur(4px);
	transition:
		grid-template-rows var(--duration--snappy) $expand-easing,
		opacity var(--duration--snappy) $expand-easing,
		filter var(--duration--snappy) $expand-easing;
}

.expandRegion[data-expanded='true'] {
	grid-template-rows: 1fr;
	opacity: 1;
	filter: blur(0);
}

.expandInner {
	min-height: 0;
	overflow: hidden;
}

// Indents the revealed content so nested rows read as children of this row.
.expandContent {
	padding-block: var(--spacing--3xs) var(--spacing--sm);
	padding-inline-start: var(--spacing--lg);
}

@media (prefers-reduced-motion: reduce) {
	.disclosureIcon {
		transition: none;
	}

	// Drop the blur and the height animation; keep only a simple, quick fade.
	.expandRegion {
		filter: none;
		transition: opacity var(--duration--snappy) linear;
	}

	.expandRegion[data-expanded='true'] {
		filter: none;
	}
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
