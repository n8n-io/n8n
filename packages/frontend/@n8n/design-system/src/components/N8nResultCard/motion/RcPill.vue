<script lang="ts" setup>
import { computed, onBeforeUnmount, ref } from 'vue';

import RcGlyph from './RcGlyph.vue';
import RcIconSwap from './RcIconSwap.vue';
import RcIconSwapItem from './RcIconSwapItem.vue';
import RcTextMorph from './RcTextMorph.vue';
import RcTextSwap from './RcTextSwap.vue';
import type { ResultCardAction, ResultCardActionState } from '../ResultCard.types';
import { isSafeHref } from '../utils';

/**
 * One pill in the card's bottom bar. Three kinds:
 * - `link`   — an anchor; the label is still.
 * - `toggle` — press to flip; the label morphs ("Decline" → "Declined") and a
 *              destructive toggle turns red once on.
 * - `event`  — press to run; a spinner grows into the pill while it is pending
 *              and a check replaces it when done ("Check in" → "Checking in" →
 *              "Checked in"). Without a `doneLabel` it returns to idle after
 *              the pending beat ("Join call" → "Connecting…" → "Join call").
 */
const props = withDefaults(
	defineProps<{ action: ResultCardAction; primary?: boolean; demoDelay?: number }>(),
	{ primary: false, demoDelay: 1600 },
);
const emit = defineEmits<{ change: [state: ResultCardActionState] }>();

/** Only https targets become anchors; anything else degrades to a plain event pill. */
const safeHref = computed(() => (isSafeHref(props.action.href) ? props.action.href : undefined));
const kind = computed<'link' | 'toggle' | 'event'>(() => {
	const declared = props.action.kind ?? (props.action.href ? 'link' : 'event');
	return declared === 'link' && !safeHref.value ? 'event' : declared;
});
const state = ref<ResultCardActionState>('idle');
let timer: ReturnType<typeof setTimeout> | undefined;

const label = computed(() => {
	const { label: idle, pendingLabel, doneLabel } = props.action;
	if (state.value === 'pending') return pendingLabel ?? idle;
	if (state.value === 'done' || state.value === 'on') return doneLabel ?? idle;
	return idle;
});

/** Shared letters morph; a wholly different pending label travels instead. */
const morphs = computed(() => kind.value === 'toggle' || !!props.action.doneLabel);

const iconState = computed(() =>
	state.value === 'pending' ? 'spinner' : state.value === 'done' ? 'check' : '',
);
const hasSlotIcon = computed(() => kind.value === 'event' && iconState.value !== '');

function onClick() {
	if (kind.value === 'link') return;
	clearTimeout(timer);
	if (kind.value === 'toggle') {
		state.value = state.value === 'on' ? 'idle' : 'on';
		emit('change', state.value);
		return;
	}
	if (state.value === 'pending') return;
	if (state.value === 'done') {
		state.value = 'idle';
		emit('change', state.value);
		return;
	}
	state.value = 'pending';
	emit('change', state.value);
	timer = setTimeout(() => {
		state.value = props.action.doneLabel ? 'done' : 'idle';
		emit('change', state.value);
	}, props.demoDelay);
}

onBeforeUnmount(() => clearTimeout(timer));

defineExpose({ state });
</script>

<template>
	<a
		v-if="kind === 'link'"
		:href="safeHref"
		target="_blank"
		rel="noopener noreferrer"
		:class="[$style.pill, primary ? $style.primary : $style.secondary]"
		data-test-id="result-card-action"
	>
		<RcGlyph v-if="action.icon" :name="action.icon" :size="16" />
		<span :class="$style.label">{{ action.label }}</span>
	</a>
	<button
		v-else
		type="button"
		:class="[
			$style.pill,
			primary ? $style.primary : $style.secondary,
			$style[state],
			{ [$style.destructive]: action.destructive && state === 'on' },
		]"
		:aria-pressed="kind === 'toggle' ? state === 'on' : undefined"
		:aria-disabled="state === 'pending' || undefined"
		:data-state="state"
		:data-name="action.name"
		data-test-id="result-card-action"
		@click="onClick"
	>
		<RcGlyph v-if="action.icon && kind === 'toggle'" :name="action.icon" :size="16" />
		<template v-else-if="kind === 'event'">
			<RcGlyph v-if="action.icon && state === 'idle'" :name="action.icon" :size="16" />
			<span :class="[$style.slot, { [$style.slotOn]: hasSlotIcon }]" aria-hidden="true">
				<RcIconSwap :state="iconState">
					<RcIconSwapItem name="spinner"><span :class="$style.spinner" /></RcIconSwapItem>
					<RcIconSwapItem name="check"
						><RcGlyph name="check" :size="16" :stroke-width="3"
					/></RcIconSwapItem>
				</RcIconSwap>
			</span>
		</template>
		<span :class="$style.label">
			<RcTextMorph v-if="morphs" :text="label" />
			<RcTextSwap v-else :text="label" />
		</span>
		<span :class="$style.sr" aria-live="polite">{{ state === 'idle' ? '' : label }}</span>
	</button>
</template>

<style lang="scss" module>
@use './tokens';

.pill {
	@include tokens.rc-button-reset;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	height: 36px;
	padding: 0 12px;
	border-radius: 40px;
	font-size: 13px;
	line-height: 20px;
	font-weight: 500;
	white-space: nowrap;
	text-decoration: none;
	transition:
		transform var(--rc-press-dur, 150ms) var(--rc-ease-smooth-out),
		padding var(--rc-resize-dur, 300ms) var(--rc-resize-ease),
		background-color var(--rc-duration-fast, 250ms) var(--rc-ease-smooth-out),
		color var(--rc-duration-fast, 250ms) var(--rc-ease-smooth-out),
		box-shadow var(--rc-duration-fast, 250ms) var(--rc-ease-smooth-out);
	&:active {
		transform: scale(var(--rc-press-scale, 0.99));
		transition-duration:
			0ms, var(--rc-resize-dur, 300ms), var(--rc-duration-fast, 250ms),
			var(--rc-duration-fast, 250ms), var(--rc-duration-fast, 250ms);
	}
	&:focus-visible {
		@include tokens.rc-focus-ring;
	}
}
.primary {
	flex: 1;
	min-width: 0;
	background-color: var(--rc-accent);
	color: var(--rc-on-accent);
	box-shadow: var(--rc-cta-shadow);
}
.secondary {
	flex: none;
	background-color: var(--rc-chip);
	color: var(--rc-fg);
}
@media (hover: hover) and (pointer: fine) {
	.primary.idle:hover {
		background-image: linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.08));
	}
	.secondary.idle:hover {
		background-color: var(--rc-chip-hover);
	}
}
.pending {
	cursor: default;
}
.done {
	background-color: var(--rc-chip);
	color: var(--rc-fg);
	box-shadow: none;
}
@media (hover: hover) and (pointer: fine) {
	.done:hover {
		background-color: var(--rc-chip-hover);
	}
}
.destructive {
	background-color: var(--rc-red-bg);
	color: var(--rc-red-ink);
	box-shadow: none;
}
@media (hover: hover) and (pointer: fine) {
	.destructive:hover {
		background-color: var(--rc-red-bg-hover);
	}
}
.label {
	display: inline-flex;
	min-width: 0;
}

/* the icon slot grows from nothing, so the text slides over rather than jumping */
.slot {
	display: inline-flex;
	width: 0;
	margin-right: -6px;
	overflow: hidden;
	transition:
		width var(--rc-resize-dur, 300ms) var(--rc-resize-ease),
		margin-right var(--rc-resize-dur, 300ms) var(--rc-resize-ease);
}
.slotOn {
	width: 16px;
	margin-right: 0;
}
.slot :global(span[data-key]) {
	width: 16px;
	height: 16px;
}
.spinner {
	width: 14px;
	height: 14px;
	border-radius: 50%;
	background: conic-gradient(from 0deg, transparent 10%, currentColor);
	-webkit-mask: radial-gradient(
		farthest-side,
		transparent calc(100% - 2px),
		#000 calc(100% - 1.5px)
	);
	mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px));
	animation: rc-spin var(--rc-spinner-dur, 800ms) var(--rc-ease-linear, linear) infinite;
}
@keyframes rc-spin {
	to {
		transform: rotate(360deg);
	}
}
.sr {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0 0 0 0);
	white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
	.slot {
		transition: none !important;
	}
	.pill,
	.pill:active {
		transform: none !important;
	}
	.spinner {
		animation-duration: 1600ms;
	}
}
</style>
