<script lang="ts" setup>
import ChatMarkdown from '@/features/ai/shared/components/ChatMarkdown/ChatMarkdown.vue';

defineProps<{
	role: 'assistant' | 'user';
	text: string;
}>();
</script>

<template>
	<div :class="[$style.message, role === 'user' ? $style.user : $style.assistant]">
		<div v-if="role === 'user'" :class="$style.bubble">{{ text }}</div>
		<ChatMarkdown v-else :content="text" />
	</div>
</template>

<style lang="scss" module>
.message {
	display: flex;
	width: 100%;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--color--text--shade-1);
}

.user {
	justify-content: flex-end;
}

.bubble {
	max-width: 80%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background--light-1);
	border-radius: var(--radius--lg);
}
</style>
