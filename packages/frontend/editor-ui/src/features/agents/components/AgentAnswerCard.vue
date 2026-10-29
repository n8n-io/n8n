<script setup lang="ts">
import AgentMarkdownChunk from '@/features/agents/components/AgentMarkdownChunk.vue';
import ChatBubble from './ChatBubble.vue';
import AgentAvatar, { type AgentAvatarKind } from './AgentAvatar.vue';

defineProps<{
	answeredAt?: string | null;
	source: string;
	status?: AgentAvatarKind;
}>();
</script>

<template>
	<div :class="$style.root">
		<AgentAvatar :kind="status ?? 'idle'" size="sm" />
		<ChatBubble :class="$style.content" position="left">
			<AgentMarkdownChunk :source="source" />
		</ChatBubble>
	</div>
</template>

<style module lang="scss">
.root {
	width: 100%;
	display: flex;
	align-items: start;
	gap: var(--spacing--2xs);
}

.content {
	max-height: 105px;
	overflow-y: auto;
	scrollbar-width: thin;
	line-height: var(--line-height--lg);
	font-family: var(--font-family);
	font-size: var(--font-size--md);
}
</style>
