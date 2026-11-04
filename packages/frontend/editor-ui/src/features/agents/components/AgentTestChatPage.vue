<script setup lang="ts">
import { inject, ref, useTemplateRef, watch } from 'vue';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type {
	AgentContinueLoadedEvent,
	AgentUsageUpdate,
	AgentSendToAssistantEvent,
	AgentJsonConfig,
	AgentResource,
} from '../types';
import type { BudgetAmountField } from '../utils/budget-config';
import AgentChatPanel from './AgentChatPanel.vue';
import { AGENT_BUILDER_STANDALONE_KEY } from './agentBuilderInjectionKeys';

const standaloneBuilder = inject(AGENT_BUILDER_STANDALONE_KEY, false);

const props = withDefaults(
	defineProps<{
		visible?: boolean;
		initialized: boolean;
		projectId: string;
		agentId: string;
		agent: AgentResource | null;
		localConfig: AgentJsonConfig | null;
		connectedTriggers: string[];
		effectiveSessionId?: string;
		newSession?: boolean;
		initialPrompt?: string;
		placeholder?: string;
		composerHeight?: string;
		canSendToAssistant?: boolean;
		dismissedFixToolCallIds?: string[];
		beforeSend?: () => Promise<void> | void;
		layout?: 'page' | 'dock';
		budgetCards?: boolean;
		/** Persists a raised budget cap. Omitted when the agent is read-only. */
		increaseBudget?: (payload: { field: BudgetAmountField; amount: number }) => Promise<boolean>;
	}>(),
	{
		visible: true,
		newSession: false,
		layout: 'dock',
		dismissedFixToolCallIds: () => [],
		budgetCards: false,
		increaseBudget: undefined,
	},
);

const emit = defineEmits<{
	'continue-loaded': [event: AgentContinueLoadedEvent];
	'usage-updated': [event: AgentUsageUpdate];
	'session-created': [sessionId: string];
	'open-build': [];
	'send-to-assistant': [event?: AgentSendToAssistantEvent];
	'initial-consumed': [];
	'message-sent': [];
}>();

const inputDraft = ref('');
const chatPanel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('chatPanel');

function onFirstUserMessage(text: string | undefined) {
	if (text !== undefined) emit('message-sent');
}

function focusInput(options?: FocusOptions) {
	chatPanel.value?.focusInput(options);
}

function getConversationMarkdown(): string {
	return chatPanel.value?.getConversationMarkdown() ?? '';
}

function clearBudgetStops(fields: BudgetAmountField[]) {
	chatPanel.value?.clearBudgetStops(fields);
}

watch(
	[() => props.initialPrompt, chatPanel],
	([prompt, panel]) => {
		if (!prompt || !panel) return;
		panel.sendMessageFromOutside(prompt);
	},
	{ immediate: true, flush: 'post' },
);

defineExpose({ focusInput, getConversationMarkdown, clearBudgetStops });
</script>

<template>
	<component
		:is="layout === 'page' ? 'main' : 'div'"
		:class="[$style.previewPage, { [$style.pageLayout]: layout === 'page' }]"
		data-testid="agent-preview-chat-page"
	>
		<div :class="$style.chatFrame">
			<AgentChatPanel
				v-if="initialized && effectiveSessionId"
				:key="`preview-${effectiveSessionId}`"
				ref="chatPanel"
				v-model:input-draft="inputDraft"
				:project-id="projectId"
				:agent-id="agentId"
				:placeholder="placeholder"
				:composer-height="composerHeight"
				:attach-button-icon="standaloneBuilder ? 'plus' : 'paperclip'"
				:visible="visible"
				:background-jobs-active="visible"
				mode="inline"
				:continue-session-id="effectiveSessionId"
				:new-session="newSession"
				:agent-config="localConfig"
				:agent-status="deriveAgentStatus(agent)"
				:connected-triggers="connectedTriggers"
				:can-send-to-assistant="canSendToAssistant"
				:dismissed-fix-tool-call-ids="dismissedFixToolCallIds"
				:before-send="beforeSend"
				:budget-cards="budgetCards"
				:increase-budget="increaseBudget"
				@continue-loaded="emit('continue-loaded', $event)"
				@usage-updated="emit('usage-updated', $event)"
				@session-created="emit('session-created', $event)"
				@initial-consumed="emit('initial-consumed')"
				@open-build="emit('open-build')"
				@send-to-assistant="emit('send-to-assistant', $event)"
				@first-user-message="onFirstUserMessage"
			>
				<template v-if="$slots['composer-start']" #composer-start>
					<slot name="composer-start" />
				</template>
				<template v-if="$slots['composer-footer']" #composer-footer>
					<slot name="composer-footer" />
				</template>
			</AgentChatPanel>
		</div>
	</component>
</template>

<style lang="scss" module>
.previewPage {
	flex: 1;
	min-height: 0;
	display: flex;
	justify-content: center;
	background-color: transparent;
	overflow: hidden;
}

.pageLayout {
	background-color: var(--background--surface);
}

.chatFrame {
	width: 100%;
	min-height: 0;
	display: flex;
}
</style>
