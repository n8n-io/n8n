<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import N8nButton from '../../components/N8nButton/Button.vue';
import N8nOption from '../../components/N8nOption/Option.vue';
import N8nSelect from '../../components/N8nSelect/Select.vue';

const ANIMATIONS = [
	'blink-background',
	'blur-swap-in',
	'blur-swap-out',
	'collapsible-slide-down',
	'collapsible-slide-down-blurred',
	'collapsible-slide-up',
	'collapsible-slide-up-blurred',
	'fade',
	'fade-in',
	'fade-in-down',
	'fade-in-left',
	'fade-in-right',
	'fade-in-up',
	'fade-out',
	'fade-out-down',
	'fade-out-left',
	'fade-out-right',
	'fade-out-up',
	'height-transition',
	'opacity-pulse',
	'ping',
	'popover-in',
	'pulse-glow',
	'pulse-glow-delayed',
	'shimmer',
	'skeleton-pulse',
	'spin',
	'typing-blink',
	'width-transition',
] as const;

type AnimationId = (typeof ANIMATIONS)[number];

const TRANSITION_IDS = new Set<AnimationId>(['height-transition', 'width-transition']);

const selectedAnimation = ref<AnimationId>('fade-in-up');
const isPlaying = ref(false);
const playKey = ref(0);

const isTransition = computed(() => TRANSITION_IDS.has(selectedAnimation.value));

const appliedAnimation = computed(() =>
	isTransition.value || isPlaying.value ? selectedAnimation.value : undefined,
);

const play = async () => {
	if (isTransition.value) {
		isPlaying.value = !isPlaying.value;
		return;
	}

	isPlaying.value = false;
	await nextTick();
	playKey.value += 1;
	isPlaying.value = true;
};

watch(selectedAnimation, () => {
	isPlaying.value = false;
	playKey.value += 1;
});
</script>

<template>
	<div :class="$style.container">
		<form :class="$style.controls" @submit.prevent="play">
			<N8nSelect
				id="motion-playground-animation"
				v-model="selectedAnimation"
				:class="$style.select"
				size="small"
				filterable
				placeholder="Select animation"
				aria-label="Animation"
			>
				<N8nOption
					v-for="animation in ANIMATIONS"
					:key="animation"
					:value="animation"
					:label="animation"
				/>
			</N8nSelect>
			<N8nButton size="small" icon="play" type="submit">Play</N8nButton>
		</form>

		<div :class="$style.stage">
			<div
				:key="playKey"
				:class="[
					$style.box,
					appliedAnimation ? $style[appliedAnimation] : undefined,
					{ [$style.playing]: isPlaying },
				]"
				aria-hidden="true"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	margin-block: var(--spacing--xl);
}

.controls {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--sm);
}

.select {
	flex: 1 1 var(--spacing--5xl);
	min-width: 0;
}

.select :global(.el-select) {
	width: 100%;
}

.stage {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: calc(var(--spacing--4xl) + var(--spacing--3xl));
	padding: var(--spacing--3xl);
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--subtle);
}

.box {
	--n8n--motion-playground-size: var(--spacing--4xl);
	--reka-collapsible-content-height: var(--n8n--motion-playground-size);

	width: var(--n8n--motion-playground-size);
	height: var(--n8n--motion-playground-size);
	border-radius: var(--radius);
	background: var(--color--primary);
	box-shadow: var(--shadow--outline);
	transform-origin: center;
}

.blink-background {
	@include motion.blink-background;
}

.blur-swap-in {
	@include motion.blur-swap-in;
}

.blur-swap-out {
	@include motion.blur-swap-out;
}

.collapsible-slide-down,
.collapsible-slide-down-blurred,
.collapsible-slide-up,
.collapsible-slide-up-blurred {
	overflow: hidden;
}

.collapsible-slide-down {
	@include motion.collapsible-slide-down;
}

.collapsible-slide-down-blurred {
	@include motion.collapsible-slide-down-blurred;
}

.collapsible-slide-up {
	@include motion.collapsible-slide-up;
}

.collapsible-slide-up-blurred {
	@include motion.collapsible-slide-up-blurred;
}

.fade {
	@include motion.fade;
}

.fade-in {
	@include motion.fade-in;
}

.fade-in-down {
	@include motion.fade-in-down;
}

.fade-in-left {
	@include motion.fade-in-left;
}

.fade-in-right {
	@include motion.fade-in-right;
}

.fade-in-up {
	@include motion.fade-in-up;
}

.fade-out {
	@include motion.fade-out;
}

.fade-out-down {
	@include motion.fade-out-down;
}

.fade-out-left {
	@include motion.fade-out-left;
}

.fade-out-right {
	@include motion.fade-out-right;
}

.fade-out-up {
	@include motion.fade-out-up;
}

.height-transition {
	@include motion.height-transition;
}

.height-transition.playing {
	height: var(--spacing--2xl);
}

.opacity-pulse {
	@include motion.opacity-pulse;
}

.ping {
	@include motion.ping;
}

.popover-in {
	@include motion.popover-in;
}

.pulse-glow {
	@include motion.pulse-glow;
}

.pulse-glow-delayed {
	@include motion.pulse-glow-delayed;
}

.shimmer {
	@include motion.shimmer;
	-webkit-background-clip: border-box;
	background-clip: border-box;
	-webkit-text-fill-color: unset;
}

.skeleton-pulse {
	@include motion.skeleton-pulse;
}

.spin {
	@include motion.spin;
}

.typing-blink {
	@include motion.typing-blink;
}

.width-transition {
	@include motion.width-transition;
}

.width-transition.playing {
	width: var(--spacing--2xl);
}
</style>
