<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { N8nResizeWrapper } from '@n8n/design-system';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { useResizablePanel } from '@/app/composables/useResizablePanel';
import { LOCAL_STORAGE_AGENT_PREVIEW_CHAT_PANEL_WIDTH } from '@/app/constants';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type { GoalGraphLiveState } from '../composables/useAgentChatStream';
import type { AgentJsonConfig, AgentResource } from '../types';
import AgentChatPanel from './AgentChatPanel.vue';
import AgentGoalGraphCanvas from './goal-graph/AgentGoalGraphCanvas.vue';

const props = defineProps<{
	initialized: boolean;
	projectId: string;
	agentId: string;
	agent: AgentResource | null;
	localConfig: AgentJsonConfig | null;
	connectedTriggers: string[];
	effectiveSessionId?: string;
	initialPrompt?: string;
	canSendToAssistant?: boolean;
}>();

const emit = defineEmits<{
	'continue-loaded': [count: number];
	'open-build': [];
	'send-to-assistant': [executionId?: string];
}>();

const inputDraft = ref('');

const CHAT_MIN_WIDTH = 360;
const CHAT_DEFAULT_WIDTH = 480;
const CHAT_MAX_WIDTH = 760;
const GRAPH_MIN_WIDTH = 360;

const settingsStore = useSettingsStore();

// Live goal-graph canvas shows only when the experimental module is enabled
// AND the agent actually declares goals. Otherwise the preview keeps its
// original centered single-column layout (zero change for normal agents).
const showGraph = computed(
	() =>
		settingsStore.isAgentsGoalGraphFeatureEnabled && (props.localConfig?.goals?.length ?? 0) > 0,
);

const previewContainer = useTemplateRef<HTMLElement>('previewContainer');
const chatPanel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('chatPanel');

const chatResizer = useResizablePanel(LOCAL_STORAGE_AGENT_PREVIEW_CHAT_PANEL_WIDTH, {
	container: previewContainer,
	defaultSize: CHAT_DEFAULT_WIDTH,
	minSize: CHAT_MIN_WIDTH,
	maxSize: (containerWidth) => Math.max(CHAT_MIN_WIDTH, containerWidth - GRAPH_MIN_WIDTH),
});

const liveState = computed<GoalGraphLiveState>(
	() => chatPanel.value?.goalGraphState ?? { slots: {}, statuses: {}, tools: {} },
);
</script>

<template>
	<main ref="previewContainer" :class="$style.previewPage" data-testid="agent-preview-chat-page">
		<N8nResizeWrapper
			:class="[$style.chatFrame, showGraph ? $style.chatResizable : $style.chatCentered]"
			:style="showGraph ? { width: `${chatResizer.size.value}px` } : undefined"
			:width="showGraph ? chatResizer.size.value : 0"
			:is-resizing-enabled="showGraph"
			:supported-directions="showGraph ? ['right'] : []"
			:min-width="CHAT_MIN_WIDTH"
			:max-width="CHAT_MAX_WIDTH"
			:grid-size="8"
			:outset="showGraph"
			@resize="chatResizer.onResize"
			@resizeend="chatResizer.onResizeEnd"
		>
			<AgentChatPanel
				v-if="initialized && effectiveSessionId"
				ref="chatPanel"
				:key="`preview-${effectiveSessionId}`"
				v-model:input-draft="inputDraft"
				:project-id="projectId"
				:agent-id="agentId"
				mode="inline"
				:continue-session-id="effectiveSessionId"
				:agent-config="localConfig"
				:agent-status="deriveAgentStatus(agent)"
				:connected-triggers="connectedTriggers"
				:can-send-to-assistant="canSendToAssistant"
				@continue-loaded="emit('continue-loaded', $event)"
				@open-build="emit('open-build')"
				@send-to-assistant="emit('send-to-assistant', $event)"
			/>
		</N8nResizeWrapper>

		<AgentGoalGraphCanvas
			v-if="showGraph && localConfig"
			:goals="localConfig.goals ?? []"
			:slots="localConfig.slots ?? []"
			:state="liveState"
		/>
	</main>
</template>

<style lang="scss" module>
.previewPage {
	flex: 1;
	min-height: 0;
	display: flex;
	background-color: var(--background--surface);
	overflow: hidden;
}

.chatFrame {
	min-height: 0;
	display: flex;
}

/* Single-column preview (no goal graph) — original centered layout. */
.chatCentered {
	width: 100%;
	max-width: 45rem;
	margin: 0 auto;
}

/* Split layout — fixed (resizable) chat column on the left, canvas fills the rest. */
.chatResizable {
	flex-shrink: 0;
	border-right: var(--border);
}
</style>
