<script lang="ts" setup>
import { SALESFORCE_ICON_SVG } from '../../workflows/score-my-leads';
import { computed, ref, watch, onUnmounted } from 'vue';

const APPEAR_DELAY_MS = 200;
const COMPLETE_DELAY_MS = 600;

const props = withDefaults(
	defineProps<{
		active: boolean;
		title?: string;
		subtitle?: string;
		slideFrom?: 'left' | 'right';
		icon?: string;
		iconOverride?: string;
	}>(),
	{
		title: 'New lead',
		subtitle: 'John Doe',
		slideFrom: 'right',
	},
);

const currentIcon = computed(() => props.iconOverride ?? props.icon ?? SALESFORCE_ICON_SVG);

const emit = defineEmits<{
	complete: [];
}>();

const visible = ref(false);
let timers: Array<ReturnType<typeof setTimeout>> = [];

function clearTimers() {
	for (const t of timers) clearTimeout(t);
	timers = [];
}

function runAnimation() {
	visible.value = false;

	timers.push(
		setTimeout(() => {
			visible.value = true;
		}, APPEAR_DELAY_MS),
	);

	timers.push(
		setTimeout(() => {
			emit('complete');
		}, APPEAR_DELAY_MS + COMPLETE_DELAY_MS),
	);
}

watch(
	() => props.active,
	(val) => {
		if (val) runAnimation();
		else clearTimers();
	},
	{ immediate: true },
);

onUnmounted(clearTimers);
</script>

<template>
	<div
		:class="[
			$style.card,
			visible && $style.cardVisible,
			props.slideFrom === 'left' && $style.slideLeft,
		]"
	>
		<Transition :name="$style.swipe" mode="out-in">
			<img :key="currentIcon" :class="$style.icon" :src="currentIcon" alt="" />
		</Transition>
		<div :class="$style.content">
			<span :class="$style.title">{{ props.title }}</span>
			<span :class="$style.subtitle">{{ props.subtitle }}</span>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	width: 280px;
	padding: var(--spacing--sm) var(--spacing--md);
	background: var(--color--background--light-3);
	border-radius: var(--radius--lg);
	border: 1px solid
		light-dark(
			oklch(from var(--color--neutral-black) l c h / 0.08),
			oklch(from var(--color--neutral-white) l c h / 0.12)
		);
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	opacity: 0;
	transform: translateX(8px);
	transition:
		opacity 0.3s ease,
		transform 0.3s ease;
}

.slideLeft {
	transform: translateX(-8px);
}

.cardVisible {
	opacity: 1;
	transform: translateX(0);
}

.icon {
	width: 36px;
	height: 36px;
	flex-shrink: 0;
}

.swipe:global(-enter-active),
.swipe:global(-leave-active) {
	transition:
		transform 0.3s ease,
		opacity 0.3s ease;
}

.swipe:global(-enter-from) {
	transform: translateX(16px);
	opacity: 0;
}

.swipe:global(-leave-to) {
	transform: translateX(-16px);
	opacity: 0;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--base);
	line-height: 1.4;
}

.subtitle {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: 1.4;
}
</style>
