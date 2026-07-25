<!-- Experiment cleanup: remove with InstanceAiTemplateExamplesExperiment -->
<script lang="ts" setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';

const i18n = useI18n();
const telemetry = useTelemetry();

const props = defineProps<{
	subcategories: string[];
	selectedSubcategory: string;
}>();

const emit = defineEmits<{
	select: [subcategory: string];
}>();

function selectSubcategory(subcategory: string) {
	telemetry.track('AI Assistant template examples subcategory clicked', {
		subcategory_name: subcategory || 'All',
	});
	emit('select', subcategory);
}

const scrollRef = ref<HTMLElement | null>(null);
const showLeftFade = ref(false);
const showRightFade = ref(false);
const revealed = ref(false);
const wrapperHovered = ref(false);

const showScrollHintRight = computed(() => showRightFade.value && wrapperHovered.value);
const showScrollHintLeft = computed(() => showLeftFade.value && wrapperHovered.value);

const SCROLL_JUMP_PX = 150;
const SCROLL_JUMP_DURATION_MS = 300;
const SCROLL_SPEED_PX_PER_FRAME = 4;
const HOLD_THRESHOLD_MS = 200;

function updateFades() {
	const el = scrollRef.value;
	if (!el) return;
	showLeftFade.value = el.scrollLeft > 0;
	showRightFade.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
}

let scrollAnimationId: number | null = null;
let holdTimeout: ReturnType<typeof setTimeout> | null = null;
let isHolding = false;

function animateJump(direction: number) {
	const el = scrollRef.value;
	if (!el) return;
	const start = el.scrollLeft;
	const target = start + direction * SCROLL_JUMP_PX;
	const startTime = performance.now();

	function step(now: number) {
		const elapsed = now - startTime;
		const progress = Math.min(elapsed / SCROLL_JUMP_DURATION_MS, 1);
		const eased = 1 - Math.pow(1 - progress, 3);
		el!.scrollLeft = start + (target - start) * eased;
		updateFades();
		if (progress < 1) {
			scrollAnimationId = requestAnimationFrame(step);
		} else {
			scrollAnimationId = null;
		}
	}

	scrollAnimationId = requestAnimationFrame(step);
}

function startContinuousScroll(direction: number) {
	function step() {
		const el = scrollRef.value;
		if (!el) return;
		el.scrollLeft += direction * SCROLL_SPEED_PX_PER_FRAME;
		updateFades();
		scrollAnimationId = requestAnimationFrame(step);
	}
	scrollAnimationId = requestAnimationFrame(step);
}

function stopScroll() {
	if (holdTimeout !== null) {
		clearTimeout(holdTimeout);
		holdTimeout = null;
	}
	if (scrollAnimationId !== null) {
		cancelAnimationFrame(scrollAnimationId);
		scrollAnimationId = null;
	}
	isHolding = false;
}

function handleScrollStart(direction: number) {
	stopScroll();
	isHolding = false;
	holdTimeout = setTimeout(() => {
		isHolding = true;
		startContinuousScroll(direction);
	}, HOLD_THRESHOLD_MS);
}

function handleScrollEnd(direction: number) {
	const wasHolding = isHolding;
	stopScroll();
	if (!wasHolding) {
		animateJump(direction);
	}
}

function startScrollRight() {
	handleScrollStart(1);
}

function startScrollLeft() {
	handleScrollStart(-1);
}

function endScrollRight() {
	handleScrollEnd(1);
}

function endScrollLeft() {
	handleScrollEnd(-1);
}

onMounted(() => {
	updateFades();
	nextTick(() => {
		revealed.value = true;
	});
});

useResizeObserver(scrollRef, updateFades);

let prevSubcategories: string[] = [];

watch(
	() => props.subcategories,
	(newVal) => {
		const changed =
			newVal.length !== prevSubcategories.length ||
			newVal.some((v, i) => v !== prevSubcategories[i]);
		prevSubcategories = [...newVal];

		if (!changed) return;

		revealed.value = false;
		if (scrollRef.value) {
			scrollRef.value.scrollLeft = 0;
		}
		nextTick(() => {
			revealed.value = true;
			requestAnimationFrame(updateFades);
		});
	},
);
</script>

<template>
	<div
		:class="$style.wrapper"
		@mouseenter="wrapperHovered = true"
		@mouseleave="wrapperHovered = false"
	>
		<div v-if="showLeftFade" :class="$style.fadeLeft" />
		<div ref="scrollRef" :class="$style.container" @scroll="updateFades">
			<button
				:class="[
					$style.pill,
					selectedSubcategory === '' && $style.active,
					revealed && $style.visible,
				]"
				:style="{ '--entrance-delay': '0ms' }"
				@click="selectSubcategory('')"
			>
				{{
					i18n.baseText('experiments.instanceAiTemplateExamples.subcategories.all' as BaseTextKey)
				}}
			</button>
			<button
				v-for="(subcategory, index) in subcategories"
				:key="subcategory"
				:class="[
					$style.pill,
					selectedSubcategory === subcategory && $style.active,
					revealed && $style.visible,
				]"
				:style="{ '--entrance-delay': `${(index + 1) * 30}ms` }"
				@click="selectSubcategory(subcategory)"
			>
				{{ subcategory }}
			</button>
		</div>
		<div v-if="showRightFade" :class="$style.fadeRight" />
		<button
			:class="[
				$style.scrollHint,
				$style.scrollHintLeft,
				showScrollHintLeft && $style.scrollHintVisible,
			]"
			@mousedown.prevent="startScrollLeft"
			@mouseup="endScrollLeft"
			@mouseleave="stopScroll"
		>
			<N8nIcon icon="chevron-left" size="small" />
		</button>
		<button
			:class="[
				$style.scrollHint,
				$style.scrollHintRight,
				showScrollHintRight && $style.scrollHintVisible,
			]"
			@mousedown.prevent="startScrollRight"
			@mouseup="endScrollRight"
			@mouseleave="stopScroll"
		>
			<N8nIcon icon="chevron-right" size="small" />
		</button>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	margin-bottom: 16px;
	max-width: 100%;
	min-width: 0;
}

.container {
	display: flex;
	gap: var(--spacing--3xs);
	overflow-x: auto;
	scrollbar-width: none;
	-ms-overflow-style: none;
	padding: var(--spacing--3xs) 0;

	&::before,
	&::after {
		content: '';
		flex: 1;
	}

	&::-webkit-scrollbar {
		display: none;
	}
}

.fadeLeft,
.fadeRight {
	position: absolute;
	top: 0;
	bottom: 0;
	width: 60px;
	pointer-events: none;
	z-index: 1;
}

.fadeLeft {
	left: 0;
	background: linear-gradient(to right, var(--color--background--light-2), transparent);
}

.fadeRight {
	right: 0;
	background: linear-gradient(to left, var(--color--background--light-2), transparent);
}

.pill {
	user-select: none;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--xl);
	border: 1px solid var(--color--foreground);
	background: transparent;
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	cursor: pointer;
	white-space: nowrap;
	flex-shrink: 0;
	opacity: 0;
	transform: translateY(4px);
	transition:
		opacity 0.2s ease var(--entrance-delay, 0ms),
		transform 0.2s ease var(--entrance-delay, 0ms),
		background 0.15s ease 0ms,
		border-color 0.15s ease 0ms,
		color 0.15s ease 0ms;

	&:hover {
		background: var(--color--foreground--tint-1);
	}
}

.visible {
	opacity: 1;
	transform: translateY(0);
}

.active {
	border-color: var(--color--neutral-400);
}

.scrollHint {
	position: absolute;
	top: 50%;
	transform: translateY(-50%);
	color: var(--color--text);
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.2s ease;
	background: var(--color--background--light-2);
	border: none;
	border-radius: 50%;
	padding: var(--spacing--3xs);
	cursor: pointer;
}

.scrollHintVisible {
	opacity: 0.7;
	pointer-events: auto;

	&:hover {
		opacity: 1;
	}
}

.scrollHintRight {
	right: -12px;
	z-index: 2;
}

.scrollHintRight.scrollHintVisible {
	animation: nudgeRight 1s ease-in-out infinite;
}

.scrollHintLeft {
	left: -12px;
	z-index: 2;
}

.scrollHintLeft.scrollHintVisible {
	animation: nudgeLeft 1s ease-in-out infinite;
}

@keyframes nudgeRight {
	0%,
	100% {
		transform: translateY(-50%) translateX(0);
	}
	50% {
		transform: translateY(-50%) translateX(4px);
	}
}

@keyframes nudgeLeft {
	0%,
	100% {
		transform: translateY(-50%) translateX(0);
	}
	50% {
		transform: translateY(-50%) translateX(-4px);
	}
}
</style>
