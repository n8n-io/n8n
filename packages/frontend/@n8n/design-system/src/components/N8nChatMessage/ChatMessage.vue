<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { onMounted, onUpdated, ref } from 'vue';

interface Props {
	role: 'assistant' | 'user';
}

const props = defineProps<Props>();

const message = ref<HTMLElement | null>(null);
const userBubble = ref<HTMLElement | null>(null);

function shrinkWrapUserMessage() {
	if (props.role !== 'user' || !userBubble.value) return;

	userBubble.value.style.removeProperty('width');

	const range = document.createRange();
	range.selectNodeContents(userBubble.value);

	const bounds = range.getBoundingClientRect();
	if (!bounds) return;

	userBubble.value.style.width = `${bounds.width}px`;
	userBubble.value.style.boxSizing = 'content-box';
}

onMounted(shrinkWrapUserMessage);
onUpdated(shrinkWrapUserMessage);
useResizeObserver(message, shrinkWrapUserMessage);

defineSlots<{
	default(): unknown;
	actions?(): unknown;
}>();
</script>

<template>
	<div
		ref="message"
		:class="[$style.message, role === 'user' ? $style.userMessage : $style.assistantMessage]"
	>
		<div ref="userBubble" :class="role === 'user' ? $style.userBubble : $style.assistantContent">
			<slot />
			<div v-if="$slots.actions" :class="$style.actions">
				<slot name="actions" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.message {
	width: 100%;
}

.userMessage {
	display: flex;
	justify-content: flex-end;
	margin-block: var(--spacing--md);
}

.userBubble {
	max-width: 90%;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--xl);
	background: var(--assistant--color--background--user-bubble);
	color: var(--assistant--color--text--user-bubble);
	white-space: pre-wrap;
	word-break: break-word;
}

.assistantMessage {
	position: relative;
}

.assistantContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);

	&:hover .actions,
	&:focus-within .actions {
		opacity: 1;
	}
}

.actions {
	position: absolute;
	top: 0;
	right: 0;
	opacity: 0;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);

	@media (hover: none) {
		opacity: 1;
	}
}
</style>
