<script setup lang="ts">
import { computed } from 'vue';
import { N8nCanvasThinkingPill } from '@n8n/design-system';
import AgentBuilderView from '@/features/agents/views/AgentBuilderView.vue';
import { isAgentEditingAgent } from '../canvasPreview.utils';
import { useThread } from '../instanceAi.store';

const props = defineProps<{
	projectId: string;
	agentId: string;
	refreshKey: number;
}>();

// === Editing lock ===
// Lock the artifact's editor while the AI is actively building/mutating THIS
// agent, so the user can't edit into a mid-stream conflict. `isAgentEditingAgent`
// defines the signals that trigger the lock.
const thread = useThread();

const isAgentBuilding = computed(() => {
	for (const message of thread.messages) {
		if (!message.agentTree) continue;
		if (isAgentEditingAgent(message.agentTree, props.agentId)) return true;
	}
	return false;
});
</script>

<template>
	<div :class="$style.root">
		<div :class="$style.builder" :inert="isAgentBuilding">
			<AgentBuilderView
				artifact-mode
				:artifact-project-id="props.projectId"
				:artifact-agent-id="props.agentId"
				:artifact-refresh-key="props.refreshKey"
			/>
		</div>
		<div
			v-if="isAgentBuilding"
			:class="$style.buildingOverlay"
			data-testid="agent-preview-building-overlay"
		>
			<N8nCanvasThinkingPill />
		</div>
	</div>
</template>

<style lang="scss" module>
.root {
	position: relative;
	height: 100%;
	min-height: 0;
}

.builder {
	height: 100%;
	min-height: 0;

	&[inert] {
		opacity: 0.6;
	}
}

.buildingOverlay {
	position: absolute;
	inset: 0;
	z-index: 10;
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
