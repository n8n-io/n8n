<script setup lang="ts">
import type { AgentCreationResource } from '@/features/agents/types';
import { computed, onBeforeUnmount } from 'vue';
import AgentBuilderView from '@/features/agents/views/AgentBuilderView.vue';
import { isAgentEditingAgent } from '../canvasPreview.utils';
import { useArtifactThread } from '../artifactThread';
import { useArtifactAgentTargets, type PendingAgentRequest } from '../artifactAgentTargets';
import type { AgentTestHandoffParams } from '../composables/useInstanceAiAgentTestHandoff';
import AgentBuildingIndicator from './AgentBuildingIndicator.vue';

const props = defineProps<{
	projectId: string;
	agentId: string;
	previewSessionId?: string;
	previewOpen: boolean;
	previewChatTarget?: HTMLElement | null;
	/** No agent row exists yet — the builder renders a local draft and persists on first edit. */
	pending?: boolean;
}>();

const emit = defineEmits<{
	'preview-open-change': [open: boolean];
	'assistant-handoff': [params: AgentTestHandoffParams];
}>();

// === Editing lock ===
// Lock the artifact's editing (not its visibility) while the AI is actively
// building/mutating THIS agent, so the user can't edit into a mid-stream
// conflict. `isAgentEditingAgent` defines the signals that trigger the lock.
// Parity with the workflow artifact: content stays fully visible and
// inspectable — only editing/publishing is disabled, via
// `artifact-editing-locked` on `AgentBuilderView`.
const thread = useArtifactThread();
const agentTargets = useArtifactAgentTargets();

/**
 * Props of an unmounted instance keep their last values, so a target comparison
 * alone cannot tell "still showing this artifact" from "torn down while the
 * request was in flight". Both must be false before a response touches shared
 * thread state.
 */
let mounted = true;
onBeforeUnmount(() => {
	mounted = false;
});

const isAgentBuilding = computed(() => isAgentEditingAgent(thread.artifactTurns, props.agentId));

// The prompt starts processing before the agent-builder event arrives.
const showBuildingIndicator = computed(
	() =>
		isAgentBuilding.value ||
		(thread.activeArtifactId === props.agentId && (thread.isSendingMessage || thread.isStreaming)),
);

async function syncAgentTarget(name: string) {
	await agentTargets.bind({ agentId: props.agentId, projectId: props.projectId, name });
}

/**
 * Persist the pending artifact: one request creates (or adopts, when the chat
 * already created it under the same id) the agent and replaces this thread's
 * pending marker with the bound target. The builder treats resolution as the
 * acknowledgement, so the binding is durable before it stops drafting.
 */
async function persistAgent(target: PendingAgentRequest): Promise<AgentCreationResource> {
	const { agent, commit } = await agentTargets.persistPendingAgent(target);
	// Skipped once this preview has been torn down or moved on, so a slow response
	// for the previous artifact cannot restore its binding over the current one —
	// the server write already landed, and the next thread load picks it up.
	if (mounted && props.projectId === target.projectId && props.agentId === target.agentId) {
		commit();
	}
	return agent;
}
</script>

<template>
	<div :class="$style.root">
		<Transition name="agent-building-indicator">
			<AgentBuildingIndicator v-if="showBuildingIndicator" />
		</Transition>
		<AgentBuilderView
			artifact-mode
			:artifact-project-id="props.projectId"
			:artifact-agent-id="props.agentId"
			:artifact-preview-session-id="props.previewSessionId"
			:artifact-preview-open="props.previewOpen"
			:artifact-preview-chat-target="props.previewChatTarget"
			:artifact-agent-pending="props.pending"
			:artifact-editing-locked="isAgentBuilding"
			:artifact-persist-agent="persistAgent"
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
