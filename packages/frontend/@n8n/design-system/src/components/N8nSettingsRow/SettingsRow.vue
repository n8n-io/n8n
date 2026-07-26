<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { computed, ref, watch, useId, useSlots } from 'vue';

import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';

export type SettingsRowLayout = 'horizontal' | 'vertical' | 'custom';

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
	/**
	 * Renders the built-in chevron disclosure trigger (the default affordance). Set `false`
	 * when an `#action` control (e.g. a switch) is the sole trigger.
	 */
	disclosure?: boolean;
	/** Built-in disclosure trigger label shown beside the chevron while collapsed. */
	expandLabel?: string;
	/** Built-in disclosure trigger label shown beside the chevron while expanded. */
	collapseLabel?: string;
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
	disclosure: true,
	expandLabel: 'View more',
	collapseLabel: 'Show less',
	hoverable: false,
	clickable: false,
	revealActionsOnHover: false,
});

const emit = defineEmits<{
	click: [event: MouseEvent | KeyboardEvent];
}>();

const slots = useSlots();

// Stable, per-instance id so the disclosure trigger can `aria-controls` its region.
const expandRegionId = `settings-row-expand-${useId()}`;

// `defineModel` keeps the row working uncontrolled (built-in chevron) while still honouring a
// bound `v-model` or an `#action` control that drives the state.
const expanded = defineModel<boolean>({ default: false });
const isExpanded = computed(() => props.expandable && expanded.value);

// Mount the `#expanded` slot lazily: collapsed rows skip rendering their hidden (often heavy)
// content until first opened, then keep it mounted so the collapse animation has content to clip.
const hasExpandedOnce = ref(isExpanded.value);
watch(isExpanded, (value) => {
	if (value) hasExpandedOnce.value = true;
});

const disclosureLabel = computed(() =>
	isExpanded.value ? props.collapseLabel : props.expandLabel,
);

function toggleExpanded(event: MouseEvent) {
	event.stopPropagation();
	expanded.value = !expanded.value;
}

const descriptionLines = computed(() => Math.min(Math.max(props.maxDescriptionLines, 1), 3));

// Reveal the full description in a tooltip only when it is actually clamped/truncated. The
// description text always lives in the DOM (line-clamp clips it visually only), so this is a
// purely visual convenience for sighted pointer/focus users and adds no accessibility regression.
const descriptionRef = ref<InstanceType<typeof N8nText>>();
const isDescriptionTruncated = ref(false);

function getDescriptionEl(): HTMLElement | null {
	const el: unknown = descriptionRef.value?.$el;
	return el instanceof HTMLElement ? el : null;
}

function measureDescriptionTruncation() {
	const el = getDescriptionEl();
	// Line-clamp keeps clientHeight fixed at N lines; overflowing copy makes scrollHeight exceed
	// it. The 1px tolerance guards against sub-pixel rounding when the text fits exactly.
	isDescriptionTruncated.value = el ? el.scrollHeight - el.clientHeight > 1 : false;
}

// Width changes alter wrapping → re-measure on resize. `useResizeObserver` follows the ref's
// element (covers mount and a description that becomes visible later) and cleans up on unmount.
useResizeObserver(descriptionRef, measureDescriptionTruncation);

// Resize alone doesn't cover everything: measure immediately when the element appears/changes
// and when new content or a new clamp keeps the same element (no resize event fires for those).
watch(
	() => [getDescriptionEl(), props.description, descriptionLines.value],
	measureDescriptionTruncation,
	{ flush: 'post', immediate: true },
);

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

// A clickable row must not hijack activations meant for a nested interactive control (a button,
// link, or input placed in a slot): those would otherwise bubble to the row's handlers and fire
// the row click on top of the control's own action. Clicks on the row's non-interactive content
// (title, description, the presentational N8nSettingsRowConfigure) still activate the row.
function isFromNestedInteractive(event: Event): boolean {
	const { target, currentTarget } = event;
	if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
		return false;
	}
	const interactive = target.closest('button, a[href], input, select, textarea, [tabindex]');
	return interactive !== null && interactive !== currentTarget;
}

function onActivate(event: MouseEvent) {
	if (props.clickable && !isFromNestedInteractive(event)) {
		emit('click', event);
	}
}

function onKeydown(event: KeyboardEvent) {
	if (!props.clickable) {
		return;
	}
	// Key events only activate the row when the row itself is focused. When focus sits on a
	// nested control, Enter/Space belongs to that control (and preventDefault would break it).
	if (event.target !== event.currentTarget) {
		return;
	}
	if (event.key === 'Enter' || event.key === ' ') {
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
						<N8nTooltip
							v-if="description"
							:content="description"
							:disabled="!isDescriptionTruncated"
							placement="top"
						>
							<N8nText
								ref="descriptionRef"
								:class="$style.description"
								:style="{ '--settings-row--description-lines': descriptionLines }"
								size="small"
								color="text-light"
							>
								{{ description }}
							</N8nText>
						</N8nTooltip>
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
				<N8nText
					v-if="disclosureLabel"
					:class="$style.disclosureLabel"
					size="small"
					color="text-base"
				>
					{{ disclosureLabel }}
				</N8nText>
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
					<slot v-if="hasExpandedOnce" name="expanded" />
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
@use '../../css/mixins/utils';

// The expand/collapse motion. No DS duration token equals 350ms (snappy=200, base=400) and the
// curve has no token either, so both live here as local constants per the motion spec.
$expand-duration: 350ms;
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
	// Column-gap only: a row-gap would push the wrapped expand region away from the header.
	column-gap: var(--spacing--2xs);
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

/*
 * Pin the header line to the full row height so it never re-stretches when the (wrapping)
 * expand region grows. The horizontal row is a `flex-wrap` container with a `min-height`; with
 * the default `align-content: stretch` the lone header line is stretched to fill that min-height
 * while collapsed. As the expand region wraps in and the total content crosses the min-height
 * threshold, that stretch is released and the vertically-centered header content snaps up by ~1px
 * at the start of the expand (and back down at the end of the collapse). Guaranteeing the header
 * line is always the row height keeps the centered content perfectly still while preserving the
 * resting vertical centering.
 */
.horizontal .info {
	min-height: var(--height--4xl);
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
		@include utils.utils-ellipsis;
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
	gap: var(--spacing--5xs);
	margin-inline-start: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
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

.disclosureLabel {
	white-space: nowrap;
}

.disclosureIcon {
	transition: transform $expand-duration $expand-easing;
}

.disclosure[aria-expanded='true'] .disclosureIcon {
	transform: rotate(180deg);
}

/*
 * Animated reveal: the grid 0fr→1fr technique animates real height without `height: auto`,
 * paired with an opacity fade and a subtle blur. The region always takes a full row (it wraps
 * below the header in the horizontal layout) and breaks out of the row's side padding so the
 * revealed content reads as continuation rows of the same group, flush to the parent's edges.
 */
.expandRegion {
	flex: 0 0 auto;
	width: calc(100% + 2 * var(--spacing--sm));
	margin-inline: calc(-1 * var(--spacing--sm));
	box-sizing: border-box;
	display: grid;
	grid-template-rows: 0fr;
	opacity: 0;
	filter: blur(4px);
	transition:
		grid-template-rows $expand-duration $expand-easing,
		opacity $expand-duration $expand-easing,
		filter $expand-duration $expand-easing;
}

.expandRegion[data-expanded='true'] {
	grid-template-rows: 1fr;
	opacity: 1;
	/* `none`, not `blur(0)`: a non-none filter would keep a stacking context (and typically a
	 * compositing surface) permanently active on every open row. `blur(4px) → none` still
	 * animates — the missing side interpolates as the identity filter. */
	filter: none;
}

.expandInner {
	min-height: 0;
	overflow: hidden;
}

// Flush continuation rows: no indent/box, just an inset top separator (matching the group's
// row dividers) between the header and the first revealed row.
.expandContent {
	position: relative;
}

.expandContent::before {
	content: '';
	position: absolute;
	inset-block-start: 0;
	inset-inline: var(--spacing--sm);
	height: 1px;
	background: var(--border-color--subtle);
}

@media (prefers-reduced-motion: reduce) {
	.disclosureIcon {
		transition: none;
	}

	// Drop the blur and the height animation; keep only a simple, quick fade.
	.expandRegion {
		filter: none;
		transition: opacity $expand-duration linear;
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
