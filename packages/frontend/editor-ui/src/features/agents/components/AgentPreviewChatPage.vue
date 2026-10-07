<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useSessionStorage } from '@vueuse/core';

import { deriveAgentStatus } from '../composables/agentTelemetry.utils';
import type {
	AgentContinueLoadedEvent,
	AgentSendToAssistantEvent,
	AgentJsonConfig,
	AgentResource,
} from '../types';
import type { BudgetAmountField } from '../utils/budget-config';
import AgentChatPanel from './AgentChatPanel.vue';

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
	'session-created': [sessionId: string];
	'open-build': [];
	'send-to-assistant': [event?: AgentSendToAssistantEvent];
	'initial-consumed': [];
	'update:streaming': [value: boolean];
}>();

const defaultDraft = ref('');
const codingDrafts = useSessionStorage<Record<string, string>>(
	`n8n-coding-drafts:${props.projectId}:${props.agentId}`,
	{},
);
const inputDraft = computed({
	get() {
		if (props.localConfig?.coding && props.effectiveSessionId) {
			return codingDrafts.value[props.effectiveSessionId] ?? '';
		}
		return defaultDraft.value;
	},
	set(value: string) {
		if (props.localConfig?.coding && props.effectiveSessionId) {
			codingDrafts.value[props.effectiveSessionId] = value;
			return;
		}
		defaultDraft.value = value;
	},
});
const chatPanel = useTemplateRef<InstanceType<typeof AgentChatPanel>>('chatPanel');

function focusInput(options?: FocusOptions) {
	chatPanel.value?.focusInput(options);
}

function getConversationMarkdown(): string {
	return chatPanel.value?.getConversationMarkdown() ?? '';
}

function clearBudgetStops(fields: BudgetAmountField[]) {
	chatPanel.value?.clearBudgetStops(fields);
}

function addContext(context: string) {
	inputDraft.value = [inputDraft.value, context].filter(Boolean).join('\n\n');
	focusInput();
}

watch(
	[() => props.initialPrompt, chatPanel],
	([prompt, panel]) => {
		if (!prompt || !panel) return;
		panel.sendMessageFromOutside(prompt);
	},
	{ immediate: true, flush: 'post' },
);

async function sendReview(message: string) {
	return (await chatPanel.value?.sendReview(message)) ?? false;
}

defineExpose({ focusInput, getConversationMarkdown, clearBudgetStops, addContext, sendReview });
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
				@session-created="emit('session-created', $event)"
				@initial-consumed="emit('initial-consumed')"
				@update:streaming="emit('update:streaming', $event)"
				@open-build="emit('open-build')"
				@send-to-assistant="emit('send-to-assistant', $event)"
			/>
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
