<script setup lang="ts">
import { computed, defineProps, withDefaults } from 'vue';
import AssistantAvatar from '../AskAssistantAvatar/AssistantAvatar.vue';

const props = withDefaults(
	defineProps<{
		message: string;
		animationType?: 'vertical' | 'horizontal';
	}>(),
	{
		animationType: 'vertical',
	},
);

const transitionName = computed(() => {
	return props.animationType === 'horizontal' ? 'slide-horizontal' : 'slide-vertical';
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.avatar">
			<AssistantAvatar size="mini" />
		</div>
		<transition :name="transitionName" mode="out-in">
			<span v-if="message" :key="message" :class="$style.message">{{ message }}</span>
		</transition>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	height: var(--spacing-l);
	overflow: hidden;
	align-items: center;
	gap: var(--spacing-3xs);
	padding-left: var(--spacing-4xs);
}

.avatar {
	animation: pulse 1.5s infinite;
	position: relative;
	top: -2px;
}

.message {
	margin: 0;
	padding: 0;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);
	text-align: left;
}

@keyframes pulse {
	0% {
		transform: scale(1);
		opacity: 0.7;
	}
	50% {
		transform: scale(1.2);
		opacity: 1;
	}
	100% {
		transform: scale(1);
		opacity: 0.7;
	}
}
</style>

<style lang="scss" scoped>
/* Vertical Slide transition */
.slide-vertical-enter-active,
.slide-vertical-leave-active {
	transition:
		transform 0.5s ease,
		opacity 0.5s ease;
}

.slide-vertical-enter {
	transform: translateY(100%);
	opacity: 0;
}

.slide-vertical-leave-to {
	transform: translateY(-100%);
	opacity: 0;
}

/* Horizontal Slide transition */
.slide-horizontal-enter-active,
.slide-horizontal-leave-active {
	transition:
		transform 0.5s ease,
		opacity 0.5s ease;
}

.slide-horizontal-enter {
	transform: translateX(100%);
	opacity: 0;
}

.slide-horizontal-leave-to {
	transform: translateX(-100%);
	opacity: 0;
}
</style>
