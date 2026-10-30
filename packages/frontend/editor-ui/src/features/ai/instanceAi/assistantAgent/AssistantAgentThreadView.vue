<script setup lang="ts">
import type {
	AgentJsonConfig,
	InstanceAiAttachment,
	InstanceAiNodesAttachment,
} from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import {
	N8nActionDropdown,
	N8nIconButton,
	N8nLink,
	N8nResizeWrapper,
	N8nText,
	N8nTooltip,
	TOOLTIP_DELAY_MS,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useElementSize } from '@vueuse/core';
import { TabsRoot } from 'reka-ui';
import { computed, provide, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import AgentChatPanel from '@/features/agents/components/AgentChatPanel.vue';
import { useN8nAssistantIdentity } from '@/features/agents/n8nChatPage/composables/useN8nAssistantIdentity';

import { provideArtifactThread } from '../artifactThread';
import InstanceAiArtifactsPanel from '../components/InstanceAiArtifactsPanel.vue';
import InstanceAiAppPreview from '../components/InstanceAiAppPreview.vue';
import InstanceAiDataTablePreview from '../components/InstanceAiDataTablePreview.vue';
import InstanceAiPreviewTabBar from '../components/InstanceAiPreviewTabBar.vue';
import InstanceAiResourcePicker from '../components/InstanceAiResourcePicker.vue';
import InstanceAiViewHeader from '../components/InstanceAiViewHeader.vue';
import InstanceAiWorkflowPreview from '../components/InstanceAiWorkflowPreview.vue';
import NodesAttachmentChips from '../components/NodesAttachmentChips.vue';
import {
	MIN_WIDTH_FOR_PINNED_ARTIFACTS_PANEL,
	useArtifactsPanelToggle,
	usePreviewPanelWidth,
	usePreviewToggle,
} from '../composables/useArtifactsLayout';
import { INSTANCE_AI_VIEW } from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { firstMessageTitle } from '../instanceAi.threadRuntime';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useCanvasPreview } from '../useCanvasPreview';
import {
	ASSISTANT_AGENT_ATTACHMENT_CAPABILITIES,
	ASSISTANT_AGENT_ID,
	ASSISTANT_AGENT_PROJECT_ID,
	ASSISTANT_AGENT_THREAD_ID,
	consumePendingAssistantAgentMessage,
} from './assistantAgentThreads';
import { assistantConfirmationExtension } from './assistantConfirmation';
import { useAssistantAgentThreadsStore } from './assistantAgentThreads.store';
import {
	countSentNodes,
	readNodesAttachment,
	toNodesComposerAttachment,
} from './assistantNodeAttachments';
import { useAssistantAgentTrace } from './useAssistantAgentTrace';
import { useAssistantArtifactThread } from './useAssistantArtifactThread';

const props = defineProps<{ threadId: string; projectId: string }>();

provide(ASSISTANT_AGENT_THREAD_ID, props.threadId);
provide(ASSISTANT_AGENT_PROJECT_ID, props.projectId);

const telemetry = useTelemetry();
const i18n = useI18n();
const router = useRouter();
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
function onMessageAccepted({ clientContext }: { clientContext?: Record<string, unknown> }): void {
	// Tracked on acceptance, like the current runtime, so refused sends don't inflate the count.
	// The sent context has the references and the nodes that the composer chips added.
	const nodeCount = countSentNodes(clientContext);
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

const trace = useAssistantAgentTrace({
	threadId: props.threadId,
	messages: () => panel.value?.messages ?? [],
});

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
provide('openAppPreview', preview.openAppPreview);

const activeAgentHref = computed(() => {
	const agentId = preview.activeAgentId.value;
	const projectId = preview.activeAgentProjectId.value ?? props.projectId;
	return agentId ? `/projects/${projectId}/agents/${agentId}` : undefined;
});

const { previewToggleLabel, togglePreview } = usePreviewToggle(preview);

// --- Header ---
// The stored title, else the first user message, as in the Assistant runtime view.
const threadTitle = computed(() => {
	const title = threadsStore.threadsById.get(props.threadId)?.title;
	if (title) return title;
	const firstUserMessage = thread.messages.find((message) => message.role === 'user');
	return firstUserMessage?.content ? firstMessageTitle(firstUserMessage.content) : undefined;
});

function startNewThread(): void {
	void router.push({ name: INSTANCE_AI_VIEW });
}

// --- Layout ---
const threadArea = useTemplateRef<HTMLElement>('threadArea');
const { width: threadAreaWidth } = useElementSize(threadArea);
const isPreviewExpanded = ref(false);

const isArtifactsPanelInLayout = computed(
	() => threadAreaWidth.value >= MIN_WIDTH_FOR_PINNED_ARTIFACTS_PANEL,
);
// A loading thread shows the panel too, so its loading state shows in place.
const canShowArtifactsPanel = computed(
	() => thread.messages.length > 0 || preview.openTabs.value.length > 0 || thread.isHydratingThread,
);
const { showArtifactsPanel, artifactsPanelToggleLabel, toggleArtifactsPanel } =
	useArtifactsPanelToggle({
		isInLayout: () => isArtifactsPanelInLayout.value,
		canShow: () => canShowArtifactsPanel.value,
		isPreviewVisible: () => preview.isPreviewVisible.value,
		panelSlot: useTemplateRef<HTMLElement>('artifactsPanelSlot'),
		toggleSelector: '[data-test-id="assistant-agent-artifacts-panel-toggle"]',
	});

const {
	previewMinWidth,
	previewMaxWidth,
	previewPanelWidth,
	isPreviewResizeEnabled,
	handlePreviewResize,
} = usePreviewPanelWidth({ threadAreaWidth, isExpanded: () => isPreviewExpanded.value });

// --- Canvas nodes ---
// "Add to chat" on the preview canvas stages the nodes in the Assistant store. Move them to
// the composer of this chat, one chip for each workflow, so they go with the next message.
const instanceAiStore = useInstanceAiStore();
watch(
	[panel, () => instanceAiStore.pendingComposerAttachments],
	([current, pending]) => {
		if (!current || pending.length === 0) return;
		for (const attachment of instanceAiStore.consumePendingAttachments()) {
			if (attachment.type !== 'nodes') continue;
			const { chip, clientContextPatch } = toNodesComposerAttachment(
				attachment,
				current.composerAttachments,
			);
			current.addComposerAttachment(chip, clientContextPatch);
		}
	},
	{ immediate: true },
);

// The canvas asks for the composer after it stages nodes: show the chat and focus its input.
watch(
	() => instanceAiStore.composerFocusRequest,
	() => {
		isPreviewExpanded.value = false;
		panel.value?.focusInput();
	},
);

const stagedNodes = computed(() =>
	(panel.value?.composerAttachments ?? []).flatMap((staged) => {
		const attachment = readNodesAttachment(staged);
		return attachment ? [{ id: staged.chip.id, attachment }] : [];
	}),
);

/** The user removed some of the nodes from a chip. */
function updateStagedNodes(attachment: InstanceAiNodesAttachment): void {
	const { chip, clientContextPatch } = toNodesComposerAttachment(attachment, []);
	panel.value?.addComposerAttachment(chip, clientContextPatch);
}

function removeStagedNodes(chipId: string): void {
	panel.value?.removeComposerAttachment(chipId);
}
</script>

<template>
	<div ref="threadArea" :class="$style.container" data-test-id="assistant-agent-thread-view">
		<div :class="$style.chatArea">
			<InstanceAiViewHeader :title="threadTitle" :thread-id="props.threadId">
				<template #actions>
					<N8nTooltip
						:content="i18n.baseText('instanceAi.thread.new')"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<N8nIconButton
							icon="message-circle-plus"
							variant="ghost"
							size="small"
							icon-size="large"
							:aria-label="i18n.baseText('instanceAi.thread.new')"
							data-test-id="assistant-agent-new-thread"
							@click="startNewThread"
						/>
					</N8nTooltip>
					<N8nActionDropdown
						v-if="trace.isEnabled"
						:items="trace.menuItems"
						placement="bottom-end"
						data-test-id="assistant-agent-trace-menu"
						@select="trace.runAction"
					>
						<template #activator>
							<N8nIconButton
								icon="bug"
								variant="ghost"
								size="small"
								icon-size="large"
								:aria-label="i18n.baseText('instanceAi.debug.title')"
								data-test-id="assistant-agent-trace-button"
							/>
						</template>
					</N8nActionDropdown>
					<N8nTooltip
						v-if="canShowArtifactsPanel && !preview.isPreviewVisible.value"
						:content="artifactsPanelToggleLabel"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<N8nIconButton
							icon="list"
							variant="ghost"
							size="small"
							icon-size="large"
							data-test-id="assistant-agent-artifacts-panel-toggle"
							:aria-label="artifactsPanelToggleLabel"
							:aria-pressed="showArtifactsPanel"
							@click="toggleArtifactsPanel"
						/>
					</N8nTooltip>
					<!-- With no tabs to show, the toggle opens a resource in a new tab. It waits for
					the history, which can open tabs for past builds. -->
					<InstanceAiResourcePicker
						v-if="
							!thread.isHydratingThread &&
							!preview.isPreviewVisible.value &&
							preview.openTabs.value.length === 0
						"
						:project-id="props.projectId"
						:excluded-tabs="preview.openTabs.value"
						placement="bottom-end"
						content-test-id="assistant-agent-open-resource-picker"
						@select="preview.openTab"
					>
						<template #trigger>
							<N8nTooltip
								:content="i18n.baseText('instanceAi.artifactsPanel.openResource')"
								placement="bottom"
								:show-after="TOOLTIP_DELAY_MS"
								as-child
							>
								<N8nIconButton
									icon="square-plus"
									variant="ghost"
									size="small"
									icon-size="large"
									data-test-id="assistant-agent-open-resource"
									:aria-label="i18n.baseText('instanceAi.artifactsPanel.openResource')"
								/>
							</N8nTooltip>
						</template>
					</InstanceAiResourcePicker>
					<N8nTooltip
						v-else-if="!preview.isPreviewVisible.value"
						:content="previewToggleLabel"
						placement="bottom"
						:show-after="TOOLTIP_DELAY_MS"
					>
						<N8nIconButton
							icon="panel-right"
							variant="ghost"
							size="small"
							icon-size="large"
							data-test-id="assistant-agent-preview-toggle"
							:aria-label="previewToggleLabel"
							:aria-pressed="false"
							:disabled="preview.openTabs.value.length === 0"
							@click="togglePreview"
						/>
					</N8nTooltip>
				</template>
			</InstanceAiViewHeader>

			<div :class="$style.contentArea">
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
						@stream-event="trace.recordEvent"
						@session-created="onSessionCreated"
						@message-accepted="onMessageAccepted"
						@update:streaming="onStreamingChange"
					>
						<template v-if="stagedNodes.length > 0" #composer-attachments>
							<NodesAttachmentChips
								v-for="{ id, attachment } in stagedNodes"
								:key="id"
								:attachment="attachment"
								is-removable
								@update:attachment="updateStagedNodes"
								@remove-all="removeStagedNodes(id)"
							/>
						</template>
					</AgentChatPanel>
				</div>

				<div
					v-if="showArtifactsPanel"
					ref="artifactsPanelSlot"
					:class="[
						$style.artifactsPanelSlot,
						{ [$style.artifactsPanelSlotOverlay]: !isArtifactsPanelInLayout },
					]"
					data-test-id="assistant-agent-artifacts-panel"
				>
					<InstanceAiArtifactsPanel />
				</div>
			</div>
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
				:is-resizing-enabled="isPreviewResizeEnabled"
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
						<InstanceAiAppPreview
							v-if="preview.isPreviewVisible.value && preview.activeApp.value"
							:class="$style.previewSlot"
							:project-id="preview.activeApp.value.projectId"
							:app-id="preview.activeApp.value.id"
							:refresh-key="preview.appRefreshKey.value"
							@deleted="preview.closeTab"
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

.chatArea {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.contentArea {
	position: relative;
	display: flex;
	flex: 1;
	min-height: 0;
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
	overflow: hidden;
}

// A narrow view shows the panel over the chat.
.artifactsPanelSlotOverlay {
	position: absolute;
	top: 0;
	right: 0;
	z-index: 4;
	max-height: calc(100% - var(--spacing--sm));
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
