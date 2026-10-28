<script setup lang="ts">
import type { AgentJsonConfig, InstanceAiAttachment } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { N8nLink, N8nResizeWrapper, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useElementSize, useLocalStorage } from '@vueuse/core';
import { TabsRoot } from 'reka-ui';
import { computed, provide, ref, useTemplateRef, watch } from 'vue';

import { LOCAL_STORAGE_INSTANCE_AI_CHAT_PANEL_WIDTH_RATIO } from '@/app/constants';
import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import { useN8nAssistantIdentity } from '@/features/agents/n8nChatPage/composables/useN8nAssistantIdentity';

import { provideArtifactThread } from '../artifactThread';
import InstanceAiArtifactsPanel from '../components/InstanceAiArtifactsPanel.vue';
import InstanceAiDataTablePreview from '../components/InstanceAiDataTablePreview.vue';
import InstanceAiPreviewTabBar from '../components/InstanceAiPreviewTabBar.vue';
import InstanceAiWorkflowPreview from '../components/InstanceAiWorkflowPreview.vue';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useCanvasPreview } from '../useCanvasPreview';
import { countAttachedNodes } from '../utils/buildNodesAttachment';
import {
	ASSISTANT_AGENT_ATTACHMENT_CAPABILITIES,
	ASSISTANT_AGENT_ID,
	ASSISTANT_AGENT_PROJECT_ID,
	ASSISTANT_AGENT_THREAD_ID,
	consumePendingAssistantAgentMessage,
} from './assistantAgentThreads';
import { assistantConfirmationExtension } from './assistantConfirmation';
import { useAssistantAgentThreadsStore } from './assistantAgentThreads.store';
import { useAssistantArtifactThread } from './useAssistantArtifactThread';

const props = defineProps<{ threadId: string; projectId: string }>();

provide(ASSISTANT_AGENT_THREAD_ID, props.threadId);
provide(ASSISTANT_AGENT_PROJECT_ID, props.projectId);

const telemetry = useTelemetry();
const i18n = useI18n();
const rootStore = useRootStore();
const settingsStore = useInstanceAiSettingsStore();
const identity = useN8nAssistantIdentity();
const threadsStore = useAssistantAgentThreadsStore();

// A thread that the empty view just created has its first message waiting. Until
// the server accepts it, the thread does not exist there yet.
const pendingMessage = consumePendingAssistantAgentMessage(props.threadId);
const isNewSession = ref(pendingMessage !== undefined);
let pendingReferences: InstanceAiAttachment[] = pendingMessage?.references ?? [];
// The lists show a thread opened by URL even when it is older than the recent page.
if (!pendingMessage) void threadsStore.loadThread(props.threadId);

const agentConfig = computed<AgentJsonConfig>(() => ({
	name: identity.name.value,
	model: '',
	instructions: '',
	personalisation: identity.personalisation,
}));

/** The Assistant reads the same request fields as from its current runtime. */
function clientContext(): Record<string, unknown> {
	return {
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		...(rootStore.pushRef ? { pushRef: rootStore.pushRef } : {}),
		browserUseAvailable: settingsStore.isBrowserUseAvailable,
		...(pendingReferences.length > 0 ? { attachments: pendingReferences } : {}),
	};
}

/** The references go with the first message, so a retry of a refused send keeps them. */
function onMessageAccepted(): void {
	// Tracked on acceptance, like the current runtime, so refused sends don't inflate the count.
	const nodeCount = countAttachedNodes(pendingReferences);
	if (nodeCount > 0) {
		telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_SENT_CHAT_MESSAGE_WITH_NODES, {
			node_count: nodeCount,
			runtime: 'agents',
		});
	}
	pendingReferences = [];
}

const interactionExtensions = [assistantConfirmationExtension];

const panel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('panel');
watch(panel, (current) => {
	if (!current || !pendingMessage) return;
	current.sendMessageFromOutside(pendingMessage.text, pendingMessage.files);
});

function onSessionCreated(): void {
	isNewSession.value = false;
	// The thread exists once the server accepts its first message. Show it in the lists
	// now, not only after the first reply ends.
	void threadsStore.loadThread(props.threadId);
}

// A finished turn can add the thread to the lists, or give it a title.
let wasStreaming = false;
function onStreamingChange(streaming: boolean): void {
	if (wasStreaming && !streaming) void threadsStore.fetchRecent();
	wasStreaming = streaming;
}

// --- Artifacts ---
const thread = useAssistantArtifactThread({
	threadId: props.threadId,
	projectId: props.projectId,
	messages: () => panel.value?.messages ?? [],
	isStreaming: () => panel.value?.isStreaming ?? false,
	// Until the chat mounts, its history is not known, so a past build does not open the preview.
	isLoadingHistory: () => panel.value?.isLoadingHistory ?? true,
	// The hand-off context, for example a credential to set up, goes with this message only.
	sendMessage: (text, handoffContext) =>
		panel.value?.sendMessageFromOutside(
			text,
			[],
			handoffContext ? { context: handoffContext } : undefined,
		),
});
provideArtifactThread(thread);

const preview = useCanvasPreview({ thread, threadId: () => props.threadId });
provide('openWorkflowPreview', preview.openWorkflowPreview);
provide('openDataTablePreview', preview.openDataTablePreview);

const activeAgentHref = computed(() => {
	const agentId = preview.activeAgentId.value;
	const projectId = preview.activeAgentProjectId.value ?? props.projectId;
	return agentId ? `/projects/${projectId}/agents/${agentId}` : undefined;
});

const previewToggleLabel = computed(() =>
	i18n.baseText(
		preview.isPreviewVisible.value
			? 'instanceAi.artifactsPanel.hidePreview'
			: 'instanceAi.artifactsPanel.showPreview',
	),
);

function togglePreview(): void {
	if (preview.isPreviewVisible.value) {
		preview.closePreview();
		return;
	}
	const tab =
		preview.openTabs.value.find(({ id }) => id === preview.activeTabId.value) ??
		preview.openTabs.value[0];
	if (tab) preview.selectTab(tab.id);
}

// --- Layout ---
// The same limits as the Assistant runtime view, so both split the space alike.
const MIN_WIDTH_FOR_ARTIFACTS_PANEL = 900;
const MIN_SPLIT_PANEL_WIDTH = 400;
const DEFAULT_CHAT_PANEL_CONTENT_WIDTH = 800;

const threadArea = useTemplateRef<HTMLElement>('threadArea');
const { width: threadAreaWidth } = useElementSize(threadArea);
// Share of the thread area, so the split survives window and sidebar resizes. -1 = no preference yet.
const chatPanelWidthRatio = useLocalStorage(LOCAL_STORAGE_INSTANCE_AI_CHAT_PANEL_WIDTH_RATIO, -1, {
	writeDefaults: false,
});
const isPreviewExpanded = ref(false);

const showArtifactsPanel = computed(
	() =>
		!preview.isPreviewVisible.value &&
		threadAreaWidth.value >= MIN_WIDTH_FOR_ARTIFACTS_PANEL &&
		(thread.producedArtifacts.size > 0 || thread.currentTasks !== null),
);

const halfThreadAreaWidth = computed(() => Math.round(threadAreaWidth.value / 2));
const previewMinWidth = computed(() => Math.min(MIN_SPLIT_PANEL_WIDTH, halfThreadAreaWidth.value));
const previewMaxWidth = computed(() =>
	Math.max(threadAreaWidth.value - MIN_SPLIT_PANEL_WIDTH, halfThreadAreaWidth.value),
);
const previewPanelWidth = computed(() => {
	const ratio = chatPanelWidthRatio.value;
	const chatPanelWidth =
		ratio >= 0 && ratio <= 1 ? threadAreaWidth.value * ratio : DEFAULT_CHAT_PANEL_CONTENT_WIDTH;
	return Math.round(
		Math.min(
			Math.max(threadAreaWidth.value - chatPanelWidth, previewMinWidth.value),
			previewMaxWidth.value,
		),
	);
});

function handlePreviewResize({ width }: { width: number }): void {
	// The wrapper clamps the width, so an unchanged value means the drag hit a limit: keep the stored ratio.
	if (Math.round(width) === previewPanelWidth.value) return;
	chatPanelWidthRatio.value = (threadAreaWidth.value - width) / threadAreaWidth.value;
}
</script>

<template>
	<div ref="threadArea" :class="$style.container" data-test-id="assistant-agent-thread-view">
		<div :class="$style.chatColumn">
			<AgentChatPanel
				ref="panel"
				:project-id="props.projectId"
				:agent-id="ASSISTANT_AGENT_ID"
				mode="inline"
				:continue-session-id="props.threadId"
				:new-session="isNewSession"
				:agent-config="agentConfig"
				:attachment-capabilities="ASSISTANT_AGENT_ATTACHMENT_CAPABILITIES"
				agent-status="production"
				:connected-triggers="[]"
				channel="system"
				:client-context="clientContext"
				:interaction-extensions="interactionExtensions"
				@session-created="onSessionCreated"
				@message-accepted="onMessageAccepted"
				@update:streaming="onStreamingChange"
			/>
		</div>

		<div
			v-if="showArtifactsPanel"
			:class="$style.artifactsPanelSlot"
			data-test-id="assistant-agent-artifacts-panel"
		>
			<InstanceAiArtifactsPanel />
		</div>

		<div
			v-show="preview.isPreviewVisible.value"
			:class="[$style.canvasArea, { [$style.canvasAreaExpanded]: isPreviewExpanded }]"
			:style="isPreviewExpanded ? undefined : { width: `${previewPanelWidth}px` }"
			data-test-id="assistant-agent-preview-panel"
		>
			<N8nResizeWrapper
				:width="previewPanelWidth"
				:min-width="previewMinWidth"
				:max-width="previewMaxWidth"
				:supported-directions="['left']"
				:is-resizing-enabled="!isPreviewExpanded && previewMinWidth < previewMaxWidth"
				:grid-size="8"
				@resize="handlePreviewResize"
			>
				<TabsRoot
					:model-value="preview.activeTabId.value"
					orientation="horizontal"
					:class="$style.previewPanel"
					@update:model-value="preview.selectTab"
				>
					<InstanceAiPreviewTabBar
						:tabs="preview.openTabs.value"
						:active-tab-id="preview.activeTabId.value"
						:is-expanded="isPreviewExpanded"
						:preview-toggle-label="previewToggleLabel"
						:project-id="props.projectId"
						@toggle-preview="togglePreview"
						@toggle-expanded="isPreviewExpanded = !isPreviewExpanded"
						@close-tab="preview.closeTab"
						@open-tab="preview.openTab"
						@reorder-tab="preview.reorderTab"
					/>
					<div :class="$style.previewContent">
						<InstanceAiWorkflowPreview
							v-if="preview.isPreviewVisible.value && preview.activeWorkflowId.value"
							:key="preview.activeWorkflowId.value"
							:class="$style.previewSlot"
							:workflow-id="preview.activeWorkflowId.value"
							:refresh-key="preview.workflowRefreshKey.value"
							:execution-result="preview.activeWorkflowExecutionResult.value"
						/>
						<InstanceAiDataTablePreview
							v-if="preview.isPreviewVisible.value && preview.activeDataTableId.value"
							:class="$style.previewSlot"
							:data-table-id="preview.activeDataTableId.value"
							:project-id="preview.activeDataTableProjectId.value"
							:refresh-key="preview.dataTableRefreshKey.value"
						/>
						<div
							v-if="preview.isPreviewVisible.value && activeAgentHref"
							:class="[$style.previewSlot, $style.agentNotice]"
							data-test-id="assistant-agent-agent-preview-notice"
						>
							<N8nText color="text-light">
								{{ i18n.baseText('instanceAi.assistantAgent.agentPreviewUnavailable') }}
							</N8nText>
							<N8nLink :to="activeAgentHref">
								{{ i18n.baseText('instanceAi.assistantAgent.openAgent') }}
							</N8nLink>
						</div>
					</div>
				</TabsRoot>
			</N8nResizeWrapper>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;
	display: flex;
	flex: 1;
	min-height: 0;
	min-width: 0;
	height: 100%;
}

.chatColumn {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.artifactsPanelSlot {
	display: flex;
	flex-shrink: 0;
	padding-top: var(--spacing--sm);
	overflow: hidden;
}

.canvasArea {
	flex-shrink: 0;
	min-width: 0;
	border-left: var(--border);
}

.canvasAreaExpanded {
	position: absolute;
	inset: 0;
	z-index: 4;
	border-left: none;
	background-color: var(--color--background--light-2);
}

.previewPanel {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.previewContent {
	flex: 1;
	min-height: 0;
	position: relative;
}

.previewSlot {
	position: absolute;
	inset: 0;
}

.agentNotice {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);
}
</style>
