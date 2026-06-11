<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import PermissionPromptCard from './PermissionPromptCard.vue';

import type { PermissionPrompt, PromptResponse } from '../permissions/prompt-classification';

/**
 * The pending prompts as a 3D stack: the oldest prompt is in front, full size
 * and interactive; up to two more queue behind it, smaller and higher — like
 * billboards on a road. Resolving the front one lets the next fly in (its
 * stack position changes and the transform transition does the rest).
 */
const props = defineProps<{
	/** Oldest first. */
	prompts: readonly PermissionPrompt[];
	respondingIds: ReadonlySet<string>;
	failedIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{ respond: [promptId: string, response: PromptResponse] }>();

const i18n = useI18n();

const MAX_VISIBLE = 3;

const visible = computed(() => props.prompts.slice(0, MAX_VISIBLE));
</script>

<template>
	<TransitionGroup
		tag="div"
		:class="$style.stack"
		:aria-label="i18n.baseText('desktopAssistant.permissions.stackAriaLabel')"
		aria-live="polite"
		:enter-from-class="$style.cardEnterFrom"
		:enter-active-class="$style.cardTransitionActive"
		:leave-to-class="$style.cardLeaveTo"
		:leave-active-class="[$style.cardTransitionActive, $style.cardLeaving].join(' ')"
	>
		<div
			v-for="(prompt, position) in visible"
			:key="prompt.id"
			:class="[$style.layer, position === 0 ? $style.front : $style.behind]"
			:style="{ '--stack-position': String(position), zIndex: visible.length - position }"
			:inert="position > 0"
		>
			<PermissionPromptCard
				:prompt="prompt"
				:responding="respondingIds.has(prompt.id)"
				:failed="failedIds.has(prompt.id)"
				@respond="emit('respond', prompt.id, $event)"
			/>
		</div>
	</TransitionGroup>
</template>

<style module>
.stack {
	position: relative;
	/* Gives translateZ its depth — backgrounded cards shrink "down the road". */
	perspective: 600px;
	perspective-origin: 50% 0;
}

.layer {
	transform: translateY(calc(var(--stack-position) * -12px))
		translateZ(calc(var(--stack-position) * -55px));
	opacity: calc(1 - var(--stack-position) * 0.25);
	transition:
		transform 0.25s ease,
		opacity 0.25s ease;
}

/* The front layer sizes the stack; the queue renders behind it. */
.front {
	position: relative;
}

.behind {
	position: absolute;
	right: 0;
	bottom: 0;
	left: 0;
	pointer-events: none;
}

.cardTransitionActive {
	transition:
		transform 0.25s ease,
		opacity 0.25s ease;
}

.cardEnterFrom {
	transform: translateY(16px);
	opacity: 0;
}

.cardLeaveTo {
	transform: translateY(10px) scale(0.97);
	opacity: 0;
}

/* Take the leaving card out of the flow so the next one can claim the front slot. */
.cardLeaving {
	position: absolute;
	right: 0;
	bottom: 0;
	left: 0;
}
</style>
