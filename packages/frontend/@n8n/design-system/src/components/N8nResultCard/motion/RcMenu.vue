<script lang="ts" setup>
import { onBeforeUnmount, ref } from 'vue';

import RcGlyph from './RcGlyph.vue';
import { readMs } from './motionTokens';

/**
 * Dropdown (transitions.dev): a round "…" button opens a small menu that
 * scales in from its top-right corner and closes slightly faster. Picking an
 * option emits it; the current one is marked.
 */
export interface RcMenuOption {
	key: string;
	label: string;
}

const props = withDefaults(
	defineProps<{ options: RcMenuOption[]; modelValue?: string; label?: string }>(),
	{ modelValue: undefined, label: 'Menu' },
);
const emit = defineEmits<{ 'update:modelValue': [key: string] }>();

const wrap = ref<HTMLElement | null>(null);
const open = ref(false);
const closing = ref(false);
let closeTimer: ReturnType<typeof setTimeout> | undefined;

function show() {
	clearTimeout(closeTimer);
	closing.value = false;
	open.value = true;
	document.addEventListener('click', onDocumentClick, true);
}
function hide() {
	if (!open.value) return;
	open.value = false;
	closing.value = true;
	document.removeEventListener('click', onDocumentClick, true);
	closeTimer = setTimeout(
		() => {
			closing.value = false;
		},
		readMs(wrap.value, '--rc-dropdown-close-dur', 150),
	);
}
function onDocumentClick(event: Event) {
	if (wrap.value && event.target instanceof Node && wrap.value.contains(event.target)) return;
	hide();
}
function toggle() {
	if (open.value) hide();
	else show();
}
function pick(key: string) {
	if (key !== props.modelValue) emit('update:modelValue', key);
	hide();
}

onBeforeUnmount(() => {
	clearTimeout(closeTimer);
	document.removeEventListener('click', onDocumentClick, true);
});
</script>

<template>
	<div ref="wrap" :class="$style.wrap">
		<button
			type="button"
			:class="$style.button"
			:aria-label="label"
			:aria-expanded="open"
			aria-haspopup="menu"
			data-test-id="result-card-menu"
			@click="toggle"
		>
			<RcGlyph name="ellipsis" :size="16" />
		</button>
		<div
			:class="[$style.menu, { [$style.open]: open, [$style.closing]: closing }]"
			role="menu"
			:aria-hidden="!open"
		>
			<button
				v-for="option in options"
				:key="option.key"
				type="button"
				role="menuitemradio"
				:aria-checked="option.key === modelValue"
				:class="[$style.item, { [$style.current]: option.key === modelValue }]"
				:tabindex="open ? 0 : -1"
				@click="pick(option.key)"
			>
				{{ option.label }}
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
@use './tokens';

.wrap {
	position: relative;
	flex: none;
}
.button {
	@include tokens.rc-button-reset;
	--rc-press-scale: 0.95;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	display: grid;
	place-items: center;
	background: var(--rc-surface);
	color: var(--rc-fg);
	box-shadow: var(--rc-btn-shadow);
	transition: transform var(--rc-press-dur, 150ms) var(--rc-ease-smooth-out);
	&:active {
		transform: scale(var(--rc-press-scale));
	}
	&:focus-visible {
		@include tokens.rc-focus-ring;
	}
}
.menu {
	position: absolute;
	right: 0;
	top: 38px;
	width: 120px;
	padding: 6px;
	border-radius: 12px;
	background: var(--rc-surface);
	box-shadow: var(--rc-material-shadow);
	z-index: 5;
	transform-origin: top right;
	transform: scale(var(--rc-dropdown-pre-scale, 0.97));
	opacity: 0;
	pointer-events: none;
	transition:
		transform var(--rc-dropdown-open-dur, 250ms)
			var(--rc-dropdown-ease, cubic-bezier(0.22, 1, 0.36, 1)),
		opacity var(--rc-dropdown-open-dur, 250ms)
			var(--rc-dropdown-ease, cubic-bezier(0.22, 1, 0.36, 1));
	will-change: transform, opacity;
}
.open {
	transform: scale(1);
	opacity: 1;
	pointer-events: auto;
}
.closing {
	transform: scale(var(--rc-dropdown-closing-scale, 0.99));
	opacity: 0;
	pointer-events: none;
	transition:
		transform var(--rc-dropdown-close-dur, 150ms)
			var(--rc-dropdown-ease, cubic-bezier(0.22, 1, 0.36, 1)),
		opacity var(--rc-dropdown-close-dur, 150ms)
			var(--rc-dropdown-ease, cubic-bezier(0.22, 1, 0.36, 1));
}
.item {
	@include tokens.rc-button-reset;
	display: block;
	width: 100%;
	height: 32px;
	padding: 0 8px;
	text-align: left;
	border-radius: 8px;
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-fg);
	transition: background-color var(--rc-press-dur, 150ms) var(--rc-ease-smooth-out);
	&:focus-visible {
		@include tokens.rc-focus-ring;
	}
}
.current {
	font-weight: 500;
}
@media (hover: hover) and (pointer: fine) {
	.item:hover {
		background: var(--rc-chip);
	}
}

@media (prefers-reduced-motion: reduce) {
	.menu,
	.button,
	.item {
		transition: none !important;
	}
}
</style>
