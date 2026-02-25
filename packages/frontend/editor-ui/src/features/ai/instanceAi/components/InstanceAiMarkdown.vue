<script lang="ts" setup>
import { computed } from 'vue';
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';

const props = defineProps<{
	content: string;
}>();

const source = computed(() => ({
	type: 'text' as const,
	content: props.content,
}));
</script>

<template>
	<ChatMarkdownChunk :source="source" />
</template>
