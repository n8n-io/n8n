<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { ResultCard } from '@n8n/api-types';
import { N8nResultCard, type ResultCardIcon } from '@n8n/design-system';

import { VIEWS } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { getNodeIconSource } from '@/app/utils/nodeIcon';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import type { ChatMessage } from '@/features/ai/chatHub/chat.types';
import { unflattenModel } from '@/features/ai/chatHub/chat.utils';

const { card, message } = defineProps<{ card: ResultCard; message: ChatMessage }>();

const router = useRouter();
const chatStore = useChatStore();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();

/** Node types behind this outcome, in run order (trigger … side effect); falls back to the single producing node */
const iconNodeTypes = computed<string[]>(() =>
	card.nodeTypes?.length ? card.nodeTypes : card.nodeType ? [card.nodeType] : [],
);

onMounted(async () => {
	if (iconNodeTypes.value.some((type) => !nodeTypesStore.getNodeType(type))) {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();
	}
});

const icons = computed<ResultCardIcon[]>(() =>
	iconNodeTypes.value.flatMap((type): ResultCardIcon[] => {
		// prefer the full description so named icons (e.g. `fa:code`) resolve, not only `iconUrl`
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

const workflowName = computed(() => {
	const model = unflattenModel(message);
	// the agent may be unknown for deleted or unshared workflows
	return model ? chatStore.getAgent(model)?.name : undefined;
});

const time = computed(() =>
	new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
);

const hasExecution = computed(
	() =>
		workflowsStore.canViewWorkflows &&
		message.provider === 'n8n' &&
		!!message.executionId &&
		!!message.workflowId,
);

function openExecution() {
	if (!hasExecution.value) return;
	const { href } = router.resolve({
		name: VIEWS.EXECUTION_PREVIEW,
		params: { workflowId: message.workflowId!, executionId: String(message.executionId) },
	});
	window.open(href, '_blank');
}
</script>

<template>
	<N8nResultCard
		:card="card"
		:icons="icons"
		:footer="{ workflowName, time }"
		:execution-link="hasExecution"
		:class="$style.card"
		@open-execution="openExecution"
	/>
</template>

<style lang="scss" module>
.card {
	margin: var(--spacing--2xs) 0;
}
</style>
