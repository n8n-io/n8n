<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import AgentBuilderView from '@/features/agents/views/AgentBuilderView.vue';
import type { AgentResource } from '@/features/agents/types';
import { persistPendingAgent } from '../instanceAi.memory.api';
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
const rootStore = useRootStore();
const i18n = useI18n();

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

/**
 * Persist the pending artifact: one request creates (or adopts, when the chat
 * already created it under the same id) the agent and replaces this thread's
 * pending marker with the bound target. The builder treats resolution as the
 * acknowledgement, so the binding is durable before it stops drafting.
 */
async function persistAgent(name: string): Promise<AgentResource> {
	const target = { projectId: props.projectId, agentId: props.agentId };
	const { agent, thread: updatedThread } = await persistPendingAgent(
		rootStore.restApiContext,
		thread.id,
		{ ...target, name },
	);
	// Authoritative: the server dropped the pending key, which a merge would keep.
	// Skipped once this preview has been torn down or moved on, so a slow response
	// for the previous artifact cannot restore its binding over the current one —
	// the server write already landed, and the next thread load picks it up.
	if (mounted && props.projectId === target.projectId && props.agentId === target.agentId) {
		instanceAiStore.setThreadMetadata(thread.id, updatedThread.metadata);
	}
	return agent;
}
</script>

<template>
	<div :class="$style.root">
		<!-- Progress feedback while the AI mutates this agent: the builder only
		     refetches after each change lands, so without this pill the panel
		     looks idle mid-build (AGENT-714). Same signal as the editing lock. -->
		<Transition name="agent-building-indicator">
			<div
				v-if="isAgentBuilding"
				:class="$style.buildingIndicator"
				role="status"
				data-test-id="instance-ai-agent-building-indicator"
			>
				<N8nIcon icon="spinner" spin size="small" />
				<span :class="$style.buildingLabel">
					{{ i18n.baseText('instanceAi.agentPreview.building') }}
				</span>
			</div>
		</Transition>
		<AgentBuilderView
			artifact-mode
			:artifact-project-id="props.projectId"
			:artifact-agent-id="props.agentId"
			:artifact-preview-session-id="props.previewSessionId"
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
@use '@n8n/design-system/css/mixins/motion';

.root {
	position: relative;
	height: 100%;
	min-height: 0;
}

.buildingIndicator {
	position: absolute;
	top: calc(var(--height--4xl) + var(--spacing--xs));
	left: 50%;
	transform: translateX(-50%);
	z-index: 10;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--background--surface);
	box-shadow: var(--shadow--sm);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--text-color--subtle);
	pointer-events: none;
	white-space: nowrap;
}

.buildingLabel {
	--animation--shimmer--duration: 1.5s;
	--animation--shimmer--background: color-mix(
		in srgb,
		var(--text-color--subtle) 30%,
		var(--background--surface) 70%
	);
	--animation--shimmer--foreground: var(--text-color--subtle);
	@include motion.shimmer;
}
</style>

<style lang="scss">
.agent-building-indicator-enter-from,
.agent-building-indicator-leave-to {
	opacity: 0;
	transform: translate(-50%, -4px);
}

.agent-building-indicator-enter-active {
	transition: all 0.2s ease-out;
}

.agent-building-indicator-leave-active {
	transition: all 0.15s ease-in;
}
</style>
