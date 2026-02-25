<script lang="ts" setup>
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useAssistantStore } from '@/features/ai/assistant/assistant.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useDebounce } from '@/app/composables/useDebounce';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import SlideTransition from '@/app/components/transitions/SlideTransition.vue';
import AskAssistantBuild from './Agent/AskAssistantBuild.vue';
import AskAssistantChat from './Chat/AskAssistantChat.vue';
import AskModeCoachmark from './AskModeCoachmark.vue';
import CanvasChatHubPanel from '@/features/ai/chatHub/components/CanvasChatHubPanel.vue';
import { useAskModeCoachmark } from '../composables/useAskModeCoachmark';
import { usePopOutWindow } from '@/features/execution/logs/composables/usePopOutWindow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

import {
	N8nFloatingWindow,
	N8nIconButton,
	N8nResizeWrapper,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import HubSwitcher from '@/features/ai/assistant/components/HubSwitcher.vue';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import CanvasChatSessionDropdown from '@/features/ai/chatHub/components/CanvasChatSessionDropdown.vue';
import { CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';

const i18n = useI18n();
const builderStore = useBuilderStore();
const assistantStore = useAssistantStore();
const chatPanelStore = useChatPanelStore();
const settingsStore = useSettingsStore();
const workflowsStore = useWorkflowsStore();

const {
	isBuildMode,
	isMergeAskBuildEnabled,
	canToggleModes,
	shouldShowCoachmark,
	onDismissCoachmark,
} = useAskModeCoachmark();

// Track when slide animation has completed to prevent coachmark from appearing off-screen
const slideAnimationComplete = ref(false);
const canShowCoachmark = computed(() => shouldShowCoachmark.value && slideAnimationComplete.value);

// Reset animation state when panel closes
watch(
	() => chatPanelStore.isOpen,
	(isOpen) => {
		if (!isOpen) {
			slideAnimationComplete.value = false;
		}
	},
);

const askAssistantBuildRef = ref<InstanceType<typeof AskAssistantBuild>>();
const askAssistantChatRef = ref<InstanceType<typeof AskAssistantChat>>();
const canvasChatHubRef = ref<InstanceType<typeof CanvasChatHubPanel>>();

const popOutContainer = useTemplateRef<HTMLElement>('popOutContainer');
const popOutContent = useTemplateRef<HTMLElement>('popOutContent');

const isChatHubMode = computed(() => chatPanelStore.isChatHubModeActive);
const isFullscreen = computed(() => chatPanelStore.isFullscreen);
const isPoppedOut = computed(() => chatPanelStore.isPoppedOut);

const chatWidth = computed(() => chatPanelStore.width);
const canPopOut = computed(() => window.parent === window);

const chatTriggerNode = computed(() =>
	workflowsStore.allNodes.find((node) => node.type === CHAT_TRIGGER_NODE_TYPE),
);

const agentDisplayName = computed(() => {
	const triggerName = chatTriggerNode.value?.parameters?.agentName;
	if (typeof triggerName === 'string' && triggerName.trim()) return triggerName.trim();
	return workflowsStore.workflowName || 'Workflow';
});

const popOutWindowTitle = computed(() => `Chat - ${workflowsStore.workflowName || 'Workflow'}`);
const shouldPopOut = computed(() => isPoppedOut.value && isChatHubMode.value);

const { popOutWindow } = usePopOutWindow({
	title: popOutWindowTitle,
	initialWidth: 560,
	initialHeight: 700,
	container: popOutContainer,
	content: popOutContent,
	shouldPopOut,
	onRequestClose: () => {
		chatPanelStore.setPreferPoppedOut(false);
	},
});

function onResize(data: { direction: string; x: number; width: number }) {
	chatPanelStore.updateWidth(data.width);
}

function onResizeDebounced(data: { direction: string; x: number; width: number }) {
	void useDebounce().callDebounced(onResize, { debounceTime: 10, trailing: true }, data);
}

async function toggleAssistantMode() {
	const wasOpen = chatPanelStore.isOpen;
	const switchingToBuild = !isBuildMode.value;
	const newMode = switchingToBuild ? 'builder' : 'assistant';

	if (wasOpen) {
		if (switchingToBuild) {
			// Load sessions before switching mode if builder has no messages
			if (builderStore.chatMessages.length === 0) {
				await builderStore.fetchBuilderCredits();
				await builderStore.loadSessions();
			}
		}

		// Now switch the mode - data is already loaded
		chatPanelStore.switchMode(newMode);
	} else {
		// Opening from closed state - use full open logic
		if (switchingToBuild) {
			await chatPanelStore.open({ mode: 'builder' });
		} else {
			await chatPanelStore.open({ mode: 'assistant' });
		}
	}
}

function onClose() {
	chatPanelStore.close();
}

function onPopOut() {
	chatPanelStore.popOut();
}

function onSlideEnterComplete() {
	slideAnimationComplete.value = true;
	if (isChatHubMode.value) {
		canvasChatHubRef.value?.focusInput();
	} else if (isBuildMode.value) {
		askAssistantBuildRef.value?.focusInput();
	} else {
		askAssistantChatRef.value?.focusInput();
	}
}

// Focus input when chatHub opens as floating window (no slide transition to trigger @after-enter)
watch(
	() => isChatHubMode.value && chatPanelStore.isOpen && !isPoppedOut.value,
	async (isFloatingOpen) => {
		if (isFloatingOpen) {
			await nextTick();
			canvasChatHubRef.value?.focusInput();
		}
	},
);

const unsubscribeAssistantStore = assistantStore.$onAction(({ name }) => {
	// When assistant is opened from error or credentials help
	// switch from build mode to chat mode (unless merge is enabled, which keeps builder mode)
	if (['initErrorHelper', 'initCredHelp'].includes(name) && !isMergeAskBuildEnabled.value) {
		chatPanelStore.switchMode('assistant');
	}
});

const unsubscribeBuilderStore = builderStore.$onAction(({ name }) => {
	if (['sendChatMessage'].includes(name)) {
		chatPanelStore.switchMode('builder');
	}
});

// Set default mode based on which flags are enabled
onMounted(() => {
	// If toggle is not available (only one mode enabled), lock to the appropriate mode
	if (!canToggleModes.value) {
		if (builderStore.isAIBuilderEnabled) {
			// Only builder is enabled, lock to builder mode
			chatPanelStore.switchMode('builder');
		} else if (settingsStore.isAiAssistantEnabled) {
			// Only assistant is enabled, lock to assistant mode
			chatPanelStore.switchMode('assistant');
		}
	}
});

onBeforeUnmount(() => {
	unsubscribeAssistantStore();
	unsubscribeBuilderStore();
});
</script>

<template>
	<div ref="popOutContainer" :class="$style.popOutContainer">
		<div ref="popOutContent" :class="[$style.popOutContent, { [$style.poppedOut]: isPoppedOut }]">
			<!-- ChatHub mode: floating window (or pop-out) -->
			<N8nFloatingWindow
				v-if="isChatHubMode && chatPanelStore.isOpen && !isPoppedOut"
				:width="chatWidth"
				:height="700"
				:min-width="chatPanelStore.activeMinWidth"
				:min-height="300"
				data-test-id="canvas-chat-floating-window"
				@close="onClose"
			>
				<template #header-icon>
					<ChatAgentAvatar :agent="null" size="sm" />
				</template>
				<template #header>
					<N8nText size="medium" :bold="true" :class="$style.floatingHeaderTitle">
						{{ agentDisplayName }}
					</N8nText>
					<span :class="$style.previewBadge">
						{{ i18n.baseText('chatHub.canvas.previewBadge') }}
					</span>
				</template>
				<template #header-actions>
					<CanvasChatSessionDropdown
						v-if="canvasChatHubRef?.sessionId"
						:session-id="canvasChatHubRef.sessionId"
						:session-title="canvasChatHubRef.sessionIdText"
						:workflow-id="workflowsStore.workflowId"
						@select-session="canvasChatHubRef.handleSelectSession"
					/>
					<N8nTooltip v-if="canvasChatHubRef?.sessionId" placement="bottom">
						<template #content>
							{{ canvasChatHubRef.sessionId }}
							<br />
							{{ i18n.baseText('chat.window.session.id.copy') }}
						</template>
						<N8nIconButton
							icon="copy"
							variant="ghost"
							size="small"
							data-test-id="canvas-chat-session-id"
							@click="canvasChatHubRef.copySessionId()"
						/>
					</N8nTooltip>
					<N8nTooltip v-if="canvasChatHubRef" placement="bottom">
						<template #content>
							{{ i18n.baseText('chat.window.session.resetSession') }}
						</template>
						<N8nIconButton
							icon="undo-2"
							variant="ghost"
							size="small"
							data-test-id="canvas-chat-hub-new-session"
							@click="canvasChatHubRef.handleNewSession()"
						/>
					</N8nTooltip>
					<N8nTooltip v-if="canPopOut" placement="bottom">
						<template #content>
							{{ i18n.baseText('runData.panel.actions.popOut') }}
						</template>
						<N8nIconButton
							icon="external-link"
							variant="ghost"
							size="small"
							data-test-id="canvas-chat-hub-pop-out"
							@click="onPopOut"
						/>
					</N8nTooltip>
				</template>
				<CanvasChatHubPanel
					ref="canvasChatHubRef"
					:floating="true"
					@close="onClose"
					@pop-out="onPopOut"
				/>
			</N8nFloatingWindow>

			<!-- ChatHub pop-out: rendered in pop-out container without floating window -->
			<CanvasChatHubPanel
				v-else-if="isChatHubMode && chatPanelStore.isOpen && isPoppedOut"
				ref="canvasChatHubRef"
				@close="onClose"
				@pop-out="onPopOut"
			/>

			<!-- Assistant/Builder mode: sidebar -->
			<SlideTransition v-if="!isChatHubMode" @after-enter="onSlideEnterComplete">
				<N8nResizeWrapper
					v-show="chatPanelStore.isOpen"
					:supported-directions="isFullscreen || isPoppedOut ? [] : ['left']"
					:width="chatWidth"
					:min-width="isFullscreen ? chatWidth : chatPanelStore.activeMinWidth"
					:max-width="isFullscreen ? chatWidth : chatPanelStore.activeMaxWidth"
					:class="[$style.resizeWrapper, { [$style.fullscreen]: isFullscreen }]"
					:window="popOutWindow"
					data-test-id="ask-assistant-sidebar"
					@resize="onResizeDebounced"
				>
					<div :style="isFullscreen ? {} : { width: `${chatWidth}px` }" :class="$style.wrapper">
						<div :class="$style.assistantContent">
							<AskAssistantBuild v-if="isBuildMode" ref="askAssistantBuildRef" @close="onClose">
								<template v-if="canToggleModes" #header>
									<HubSwitcher :is-build-mode="isBuildMode" @toggle="toggleAssistantMode" />
								</template>
							</AskAssistantBuild>
							<AskAssistantChat v-else ref="askAssistantChatRef" @close="onClose">
								<!-- Header switcher is only visible when both modes are available in current view -->
								<template v-if="canToggleModes" #header>
									<AskModeCoachmark :visible="canShowCoachmark" @dismiss="onDismissCoachmark">
										<HubSwitcher :is-build-mode="isBuildMode" @toggle="toggleAssistantMode" />
									</AskModeCoachmark>
								</template>
							</AskAssistantChat>
						</div>
					</div>
				</N8nResizeWrapper>
			</SlideTransition>
		</div>
	</div>
</template>

<style lang="scss" module>
.popOutContainer {
	height: 100%;
}

.popOutContent {
	height: 100%;

	&.poppedOut {
		height: 100vh;
	}
}

.resizeWrapper {
	z-index: var(--ask-assistant-chat--z);

	&.fullscreen {
		width: 100vw !important;
	}
}

.wrapper {
	height: 100%;
	width: 100%;
	display: flex;
	flex-direction: column;
}

.assistantContent {
	flex: 1;
	overflow: hidden;
}

.floatingHeaderTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.previewBadge {
	flex-shrink: 0;
	display: inline-block;
	color: var(--color--secondary);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	background-color: var(--color--secondary--tint-2);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: 16px;
}
</style>
