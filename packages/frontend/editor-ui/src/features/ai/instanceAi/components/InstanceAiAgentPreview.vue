<script setup lang="ts">
import { computed } from 'vue';
import AgentBuilderView from '@/features/agents/views/AgentBuilderView.vue';
import type { AgentResource } from '@/features/agents/types';
import { isAgentEditingAgent } from '../canvasPreview.utils';
import {
	getAgentBuilderTargetFromThreadMetadata,
	getPendingAgentTargetFromThreadMetadata,
} from '../instanceAi.threadRuntime';
import { useThread, useInstanceAiStore } from '../instanceAi.store';
import {
	INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY,
	INSTANCE_AI_PENDING_AGENT_METADATA_KEY,
} from '../constants';
import type { AgentPreviewHandoffParams } from '../composables/useInstanceAiAgentPreviewHandoff';

const props = defineProps<{
	projectId: string;
	agentId: string;
	previewSessionId?: string;
	/** No agent row exists yet — the builder renders a local draft and persists on first edit. */
	pending?: boolean;
}>();

const emit = defineEmits<{
	'preview-open-change': [open: boolean];
	'assistant-handoff': [params: AgentPreviewHandoffParams];
}>();

// === Editing lock ===
// Lock the artifact's editing (not its visibility) while the AI is actively
// building/mutating THIS agent, so the user can't edit into a mid-stream
// conflict. `isAgentEditingAgent` defines the signals that trigger the lock.
// Parity with the workflow artifact: content stays fully visible and
// inspectable — only editing/publishing is disabled, via
// `artifact-editing-locked` on `AgentBuilderView`.
const thread = useThread();
const instanceAiStore = useInstanceAiStore();

const isAgentBuilding = computed(() => {
	for (const message of thread.messages) {
		if (!message.agentTree) continue;
		if (isAgentEditingAgent(message.agentTree, props.agentId)) return true;
	}
	return false;
});

async function syncAgentTarget(name: string) {
	const metadata = instanceAiStore.getThreadMetadata(thread.id);
	const target = getAgentBuilderTargetFromThreadMetadata(metadata);
	const pendingTarget = getPendingAgentTargetFromThreadMetadata(metadata);
	if (
		target?.agentId === props.agentId &&
		target.projectId === props.projectId &&
		target.name === name &&
		!pendingTarget
	) {
		return;
	}

	await instanceAiStore.updateThreadMetadata(thread.id, {
		[INSTANCE_AI_PENDING_AGENT_METADATA_KEY]: null,
		[INSTANCE_AI_AGENT_BUILDER_TARGET_METADATA_KEY]: {
			agentId: props.agentId,
			projectId: props.projectId,
			name,
		},
	});
}

async function onAgentPersisted(agent: AgentResource) {
	await syncAgentTarget(agent.name);
}
</script>

<template>
	<div :class="$style.root">
		<AgentBuilderView
			artifact-mode
			:artifact-project-id="props.projectId"
			:artifact-agent-id="props.agentId"
			:artifact-preview-session-id="props.previewSessionId"
			:artifact-agent-pending="props.pending"
			:artifact-editing-locked="isAgentBuilding"
			@persisted="onAgentPersisted"
			@preview-open-change="emit('preview-open-change', $event)"
			@assistant-handoff="emit('assistant-handoff', $event)"
			@name-saved="syncAgentTarget"
		/>
	</div>
</template>

<style lang="scss" module>
.root {
	position: relative;
	height: 100%;
	min-height: 0;
}
</style>
