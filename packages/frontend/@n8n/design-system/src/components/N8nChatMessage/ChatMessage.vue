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
	/** Content below the actions row, outside the area whose hover shows the actions. */
	'after-actions'?(): unknown;
}>();
</script>

<template>
	<div
		ref="message"
		:class="[$style.message, role === 'user' ? $style.userMessage : $style.assistantMessage]"
	>
		<div ref="userBubble" :class="role === 'user' ? $style.userBubble : $style.assistantContent">
			<slot />
		</div>
		<div v-if="$slots.actions" :class="$style.actions">
			<slot name="actions" />
		</div>
		<slot name="after-actions" />
	</div>
</template>

<style lang="scss" module>
.message {
	container: chat-message / inline-size;
	display: block;
	width: 100%;
}

.userBubble,
.assistantContent {
	font-size: var(--chat--font-size);
}

/** Use the message width so narrow panels keep compact text on large screens. */
@container chat-message (min-width: 48rem) {
	.userBubble,
	.assistantContent {
		--chat--font-size: var(--chat--font-size--wide);
	}
}

.userMessage {
	display: flex;
	justify-content: flex-end;
	margin-block: var(--spacing--md);
}

.userBubble {
	max-width: 80%;
	width: fit-content;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius--xl);
	background: var(--assistant--color--background--user-bubble);
	color: var(--assistant--color--text--user-bubble, var(--text-color));
	white-space: pre-wrap;
	word-break: break-word;
	line-height: var(--line-height--lg);
}

.assistantMessage {
	position: relative;
}

.assistantContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-inline: var(--spacing--sm);

	&:hover ~ .actions,
	&:focus-within ~ .actions {
		opacity: 1;
	}
}

.actions {
	margin-top: var(--spacing--xs);
	opacity: 0;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);
	/** Use smaller padding so icon aligns vertically with text block in assistant message **/
	padding-inline: var(--spacing--xs);

	&:hover,
	&:focus-within {
		opacity: 1;
	}

	@media (hover: none) {
		opacity: 1;
	}
}
</style>
