<script lang="ts" setup>
import { ref, useId, watch } from 'vue';

/**
 * Accordion (transitions.dev): the panel opens along a 0fr → 1fr grid track
 * while its content unblurs; the chevron flips on the same clock. `row` is the
 * event card's quiet full-width head, `chip` the chart card's filled button.
 */
const props = withDefaults(
	defineProps<{
		label: string;
		meta?: string;
		open?: boolean;
		variant?: 'row' | 'chip';
	}>(),
	{ meta: undefined, open: false, variant: 'row' },
);
const emit = defineEmits<{ 'update:open': [open: boolean] }>();

const isOpen = ref(props.open);
watch(
	() => props.open,
	(value) => {
		isOpen.value = value;
	},
);

const panelId = `rc-acc-${useId()}`;

function toggle() {
	isOpen.value = !isOpen.value;
	emit('update:open', isOpen.value);
}
</script>

<template>
	<div :class="[$style.acc, $style[variant]]" :data-open="isOpen">
		<button
			type="button"
			:class="$style.head"
			:aria-expanded="isOpen"
			:aria-controls="panelId"
			data-test-id="result-card-accordion"
			@click="toggle"
		>
			<span :class="$style.label">{{ label }}</span>
			<span v-if="meta" :class="$style.meta">{{ meta }}</span>
			<span :class="$style.chevron">
				<svg
					viewBox="0 0 16 16"
					width="16"
					height="16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M4 6.5L8 10.5L12 6.5" />
				</svg>
			</span>
		</button>
		<div :id="panelId" :class="$style.panel">
			<div :class="$style.inner">
				<slot />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use './tokens';

$expand: var(--rc-acc-expand, 250ms);
$collapse: var(--rc-acc-collapse, 250ms);
$ease: var(--rc-acc-ease, cubic-bezier(0.22, 1, 0.36, 1));

.head {
	@include tokens.rc-button-reset;
	display: flex;
	align-items: center;
	gap: 8px;
	text-align: left;
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-fg);
	&:focus-visible {
		@include tokens.rc-focus-ring;
	}
}
.row .head {
	width: calc(100% + 24px);
	margin: 0 -12px;
	padding: 8px 12px;
	border-radius: 12px;
	transition: background-color var(--rc-press-dur, 150ms) var(--rc-ease-smooth-out);
}
.chip .head {
	--rc-press-scale: 0.99;
	width: 100%;
	height: 36px;
	padding: 0 10px 0 12px;
	border-radius: 10px;
	background: var(--rc-chip);
	font-weight: 500;
	transition: transform var(--rc-press-dur, 150ms) var(--rc-ease-smooth-out);
	&:active {
		transform: scale(var(--rc-press-scale));
	}
}
@media (hover: hover) and (pointer: fine) {
	.row .head:hover {
		background: var(--rc-gray-hover);
	}
}
.label {
	flex: 1;
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.meta {
	flex: none;
	color: var(--rc-muted);
	font-variant-numeric: tabular-nums;
}
.chevron {
	display: inline-flex;
	flex: none;
	width: 16px;
	height: 16px;
	align-items: center;
	justify-content: center;
	color: var(--rc-muted);
	transform: scaleY(1);
	transform-origin: center;
	transition: transform var(--rc-acc-chevron, 250ms) $ease;
	path {
		vector-effect: non-scaling-stroke;
	}
}
.acc[data-open='true'] .chevron {
	transform: scaleY(-1);
}

.panel {
	display: grid;
	grid-template-rows: 0fr;
	transition: grid-template-rows $collapse $ease;
}
.acc[data-open='true'] .panel {
	grid-template-rows: 1fr;
	transition: grid-template-rows $expand $ease;
}
.inner {
	overflow: hidden;
	opacity: 0;
	filter: blur(2px);
	transition:
		opacity $collapse $ease,
		filter $collapse $ease;
}
.acc[data-open='true'] .inner {
	opacity: 1;
	filter: blur(0);
	transition:
		opacity $expand $ease,
		filter $expand $ease;
}

@media (prefers-reduced-motion: reduce) {
	.panel,
	.inner,
	.chevron,
	.head {
		transition: none !important;
	}
	.chip .head:active {
		transform: none;
	}
}
</style>
