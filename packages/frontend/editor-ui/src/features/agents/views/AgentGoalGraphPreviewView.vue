<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLocalStorage } from '@vueuse/core';
import { N8nIconButton, N8nResizeWrapper, N8nText, type ResizeData } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { migrateSlotAccess } from '@n8n/api-types';

import { LOCAL_STORAGE_AGENT_GOAL_PREVIEW_CHAT_WIDTH } from '@/app/constants';
import { getAgent } from '../composables/useAgentApi';
import { useAgentConfig } from '../composables/useAgentConfig';
import { useGoalGraphToolIcons } from '../composables/useGoalGraphToolIcons';
import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type { GoalGraphLiveState } from '../composables/useAgentChatStream';
import { AGENT_BUILDER_VIEW, CONTINUE_SESSION_ID_PARAM } from '../constants';
import type { AgentResource } from '../types';
import AgentChatPanel from '../components/AgentChatPanel.vue';
import AgentGoalGraphCanvas from '../components/goal-graph/AgentGoalGraphCanvas.vue';

const route = useRoute();
const router = useRouter();
const i18n = useI18n();
const rootStore = useRootStore();
const { showError } = useToast();

const projectId = computed(() => String(route.params.projectId ?? ''));
const agentId = computed(() => String(route.params.agentId ?? ''));

// Continue an existing session if the URL carries one; otherwise mint a fresh
// ephemeral session (the backend creates the thread on the first message).
function readSessionFromUrl(): string | undefined {
	const raw = route.query[CONTINUE_SESSION_ID_PARAM];
	const value = Array.isArray(raw) ? raw[0] : raw;
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}
const sessionId = ref<string>(readSessionFromUrl() ?? crypto.randomUUID());

// `agent` carries name + status; the working config (goals/slots/model) comes
// from the config endpoint — `agent.schema` is only loosely typed.
const agent = ref<AgentResource | null>(null);
const loading = ref(true);
const { config, fetchConfig } = useAgentConfig();

const goals = computed(() => config.value?.goals ?? []);
const slots = computed(() => (config.value?.slots ?? []).map(migrateSlotAccess));
const toolIcons = useGoalGraphToolIcons(config);

// The chat panel is a resizable right-docked column; the graph fills the rest.
// N8nResizeWrapper emits the clamped new width, so we just persist it.
const CHAT_MIN_WIDTH = 320;
const CHAT_MAX_WIDTH = 760;
const chatWidth = useLocalStorage(LOCAL_STORAGE_AGENT_GOAL_PREVIEW_CHAT_WIDTH, 420);

function onChatResize(data: ResizeData) {
	chatWidth.value = data.width;
}

// The chat panel owns the run; its live goal-graph snapshot drives the canvas.
const chatPanel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('chatPanel');
const liveState = computed<GoalGraphLiveState>(
	() => chatPanel.value?.goalGraphState ?? { slots: {}, statuses: {}, tools: {} },
);

onMounted(async () => {
	try {
		const [loaded] = await Promise.all([
			getAgent(rootStore.restApiContext, projectId.value, agentId.value),
			fetchConfig(projectId.value, agentId.value),
		]);
		agent.value = loaded;
	} catch (error) {
		showError(error, i18n.baseText('agents.goalGraph.preview.loadError'));
	} finally {
		loading.value = false;
	}
});

// Remounts AgentChatPanel with a fresh thread, clearing the conversation and
// re-deriving the graph from empty state.
function startNewSession() {
	sessionId.value = crypto.randomUUID();
}

function close() {
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: projectId.value, agentId: agentId.value },
	});
}
</script>

<template>
	<div :class="$style.page" data-testid="agent-goal-graph-preview">
		<section :class="$style.graph">
			<AgentGoalGraphCanvas
				:goals="goals"
				:slots="slots"
				:state="liveState"
				:tool-icons="toolIcons"
			/>
		</section>

		<N8nResizeWrapper
			:class="$style.chat"
			:style="{ width: `${chatWidth}px` }"
			:width="chatWidth"
			:supported-directions="['left']"
			:min-width="CHAT_MIN_WIDTH"
			:max-width="CHAT_MAX_WIDTH"
			:grid-size="8"
			outset
			@resize="onChatResize"
		>
			<header :class="$style.header">
				<N8nText :bold="true" :class="$style.title">
					{{ agent?.name || i18n.baseText('agents.goalGraph.preview.title') }}
				</N8nText>
				<div :class="$style.actions">
					<N8nIconButton
						icon="message-circle-plus"
						variant="ghost"
						size="small"
						icon-size="large"
						:aria-label="i18n.baseText('agents.builder.chat.newChat.label')"
						data-testid="agent-goal-preview-new-chat-btn"
						@click="startNewSession"
					/>
					<N8nIconButton
						icon="x"
						variant="ghost"
						size="small"
						icon-size="large"
						:aria-label="i18n.baseText('generic.close')"
						data-testid="agent-goal-preview-close-btn"
						@click="close"
					/>
				</div>
			</header>

			<div :class="$style.chatBody">
				<AgentChatPanel
					v-if="!loading && agent"
					ref="chatPanel"
					:key="sessionId"
					:project-id="projectId"
					:agent-id="agentId"
					mode="inline"
					:continue-session-id="sessionId"
					:agent-config="config"
					:agent-status="deriveAgentStatus(agent)"
					:connected-triggers="[]"
				/>
			</div>
		</N8nResizeWrapper>
	</div>
</template>

<style lang="scss" module>
.page {
	flex: 1;
	min-height: 0;
	display: flex;
	background-color: var(--background--surface);
	overflow: hidden;
}

/* Goal graph fills the page; the chat is a resizable right-docked panel whose
   width is driven by the inline style bound to `chatWidth`. */
.graph {
	flex: 1;
	min-width: 0;
	min-height: 0;
	display: flex;
}

.chat {
	flex: 0 0 auto;
	max-width: 100%;
	min-height: 0;
	display: flex;
	flex-direction: column;
	border-left: var(--border);
	background-color: var(--color--background--light-2);
}

.header {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.title {
	min-width: 0;
	flex: 1 1 auto;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	margin-left: auto;
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.chatBody {
	flex: 1;
	min-height: 0;
	display: flex;
}
</style>
