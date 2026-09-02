<script setup lang="ts">
import type { AgentItemProps } from '@/Interface';

import AgentPersonalisationIcon from '@/features/agents/components/AgentPersonalisationIcon.vue';
import { N8nIcon, N8nNodeCreatorNode } from '@n8n/design-system';

export interface Props {
	agent: AgentItemProps;
}

defineProps<Props>();
</script>

<template>
	<N8nNodeCreatorNode
		:class="$style.agentItem"
		:title="agent.name"
		:is-trigger="false"
		:description="agent.description"
		data-test-id="node-creator-agent-item"
	>
		<template #icon>
			<div v-if="agent.variant === 'create'" :class="$style.createIcon">
				<N8nIcon icon="plus" :size="16" />
			</div>
			<AgentPersonalisationIcon v-else :personalisation="agent.personalisation" :size="20" />
		</template>
	</N8nNodeCreatorNode>
</template>

<style lang="scss" module>
.agentItem {
	margin-left: var(--spacing--sm);
	margin-right: var(--spacing--xs);
	height: var(--height--lg);
	padding: var(--spacing--2xs) 0;
}

.createIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	flex-shrink: 0;
	// Proportional to the 16/64 squircle radius of the personalisation tile;
	// radius tokens are clobbered by the legacy theme, so keep it fixed.
	border-radius: var(--radius--lg);
	color: var(--color--primary);
	background-color: var(--color--primary--tint-3);
}
</style>
