<script setup lang="ts">
import { N8nCard, N8nIcon, N8nText } from '@n8n/design-system';

import AgentMarkdownChunk from '@/features/agents/components/AgentMarkdownChunk.vue';

defineProps<{
	label: string;
	answeredAt?: string | null;
	source: string;
}>();
</script>

<template>
	<N8nCard :class="$style.root">
		<template #header>
			<div :class="$style.header">
				<span :class="$style.iconWrap">
					<N8nIcon icon="sparkles" size="small" />
				</span>
				<N8nText bold color="text-dark">{{ label }}</N8nText>
				<N8nText v-if="answeredAt" color="text-base">{{ answeredAt }}</N8nText>
			</div>
		</template>
		<div :class="$style.content">
			<AgentMarkdownChunk :source="source" />
		</div>
	</N8nCard>
</template>

<style module lang="scss">
.root {
	width: 100%;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--xs);
}

.content {
	width: 100%;
	height: 105px;
	overflow-y: auto;
	scrollbar-width: thin;
	line-height: var(--line-height--lg);
	font-family: var(--font-family);
	font-size: var(--font-size--md);
}

.iconWrap {
	display: flex;
	padding: var(--spacing--3xs);
	background-color: var(--background--subtle);
	border-radius: var(--radius--2xs);
}
</style>
