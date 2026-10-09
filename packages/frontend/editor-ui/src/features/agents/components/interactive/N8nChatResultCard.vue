<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { N8nResultCard, type ResultCardIcon } from '@n8n/design-system';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import type { N8nChatResultCardInput } from '@/features/ai/shared/agentsChat/n8nChatInteraction';

/**
 * A result card an agent showed through `chat_action` → `show_card`. Same
 * design-system card the Chat Hub renders for workflow agents; here there is
 * no execution to open and the agent, not a workflow, is the author, so the
 * footer and execution link stay off.
 */
const props = defineProps<{
	input: N8nChatResultCardInput;
	disabled?: boolean;
}>();

const nodeTypesStore = useNodeTypesStore();

/** Node types the agent named as the data's origin (e.g. a Sheets tool it called). */
const iconNodeTypes = computed<string[]>(() => {
	const { card } = props.input;
	return card.nodeTypes?.length ? card.nodeTypes : card.nodeType ? [card.nodeType] : [];
});

onMounted(async () => {
	if (iconNodeTypes.value.some((type) => !nodeTypesStore.getNodeType(type))) {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
	}
});

const icons = computed<ResultCardIcon[]>(() =>
	iconNodeTypes.value.flatMap((type): ResultCardIcon[] => {
		const description = nodeTypesStore.getNodeType(type);
		const source = getNodeIconSource(description ?? type, null, null);
		if (!source) return [];
		return [
			source.type === 'file'
				? { type: 'file', src: source.src }
				: { type: 'icon', name: source.name, color: source.color },
		];
	}),
);
</script>

<template>
	<N8nResultCard
		:card="input.card"
		:icons="icons"
		:class="$style.card"
		data-testid="n8n-chat-result-card"
	/>
</template>

<style lang="scss" module>
.card {
	margin: var(--spacing--2xs) 0;
}
</style>
