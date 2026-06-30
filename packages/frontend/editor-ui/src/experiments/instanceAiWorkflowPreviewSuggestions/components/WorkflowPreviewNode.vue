<script lang="ts" setup>
import { computed } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import type { PreviewWorkflowNode, PreviewWorkflowNodeIcon } from '../workflows/types';
import type { NodeAnimationState } from './WorkflowPreviewCanvas.vue';

const props = withDefaults(
	defineProps<{
		node: PreviewWorkflowNode;
		offsetX: number;
		offsetY: number;
		state?: NodeAnimationState;
		trigger?: boolean;
		iconOverride?: PreviewWorkflowNodeIcon;
		interactive?: boolean;
	}>(),
	{ state: 'idle', trigger: false, interactive: false },
);

const style = computed(() => ({
	left: `${props.node.position.x - props.offsetX}px`,
	top: `${props.node.position.y - props.offsetY}px`,
}));

const iconWrapperStyle = computed(() => {
	if (props.node.iconColor) {
		return { color: `var(--node--icon--color--${props.node.iconColor})` };
	}
	return {};
});

const activeIcon = computed(() => props.iconOverride ?? props.node.icon);

const iconName = computed(() =>
	activeIcon.value.type === 'icon' ? (activeIcon.value.name as IconName) : undefined,
);
const iconSrc = computed(() =>
	activeIcon.value.type === 'file' ? activeIcon.value.src : undefined,
);
</script>

<template>
	<div
		:class="[
			$style.node,
			props.trigger && $style.trigger,
			props.state === 'running' && $style.running,
			props.state === 'success' && $style.success,
		]"
		:style="[style, props.interactive ? { pointerEvents: 'auto' } : {}]"
	>
		<div :class="$style.iconWrapper" :style="iconWrapperStyle">
			<N8nIcon v-if="iconName" :icon="iconName" :size="48" />
			<Transition v-else-if="iconSrc" :name="$style.swipe" mode="out-in">
				<img :key="iconSrc" :src="iconSrc" :class="$style.iconImage" />
			</Transition>
			<span v-else :class="$style.iconFallback">{{ props.node.label.charAt(0) }}</span>
		</div>
		<span :class="$style.label">{{ props.node.label }}</span>
	</div>
</template>

<style lang="scss" module>
.node {
	position: absolute;
	display: flex;
	flex-direction: column;
	align-items: center;
	transform: translate(-50%, -50%);
}

.iconWrapper {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 96px;
	height: 96px;
	border-radius: var(--radius--lg);
	background: var(--node--color--background, var(--color--background--light-3));
	border: 1.5px solid
		light-dark(
			oklch(from var(--color--neutral-black) l c h / 0.1),
			oklch(from var(--color--neutral-white) l c h / 0.15)
		);
	color: var(--node--icon--color, var(--color--foreground--shade-1));
	transition: border-color 0.2s ease;

	&::after {
		content: '';
		position: absolute;
		inset: -3px;
		border-radius: 10px;
		z-index: -1;
		opacity: 0;
		background: conic-gradient(
			from var(--node--gradient-angle),
			rgba(255, 109, 90, 1),
			rgba(255, 109, 90, 1) 20%,
			rgba(255, 109, 90, 0.2) 35%,
			rgba(255, 109, 90, 0.2) 65%,
			rgba(255, 109, 90, 1) 90%,
			rgba(255, 109, 90, 1)
		);
		transition: opacity 0.15s ease;
	}
}

.trigger .iconWrapper {
	border-radius: 36px var(--radius--lg) var(--radius--lg) 36px;

	&::after {
		border-radius: 36px 10px 10px 36px;
	}
}

.running .iconWrapper {
	border-color: transparent;

	&::after {
		opacity: 1;
		animation: border-rotate 1.5s linear infinite;
	}
}

.success .iconWrapper {
	border-width: 2px;
	border-color: var(--color--success);
}

.iconImage {
	max-width: 48px;
	max-height: 48px;
	width: auto;
	height: auto;
}

.iconFallback {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
}

.label {
	margin-top: var(--spacing--2xs);
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
	color: var(--color--text--base);
	white-space: nowrap;
	max-width: 192px;
	overflow: hidden;
	text-overflow: ellipsis;
	text-align: center;
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

@property --node--gradient-angle {
	syntax: '<angle>';
	initial-value: 0deg;
	inherits: false;
}

@keyframes border-rotate {
	from {
		--node--gradient-angle: 0deg;
	}

	to {
		--node--gradient-angle: 360deg;
	}
}
</style>
