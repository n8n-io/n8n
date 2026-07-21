<script setup lang="ts">
import { computed, ref, toRef, watch, onMounted, onBeforeUnmount } from 'vue';
import { N8nCallout, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { APPROVAL_TOOL_NAME } from '@n8n/api-types';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import { useAgentChatStream } from '../composables/useAgentChatStream';
import { findOpenInteractive } from '@/features/ai/shared/agentsChat/messageMappers';
import AgentChatEmptyState from './AgentChatEmptyState.vue';
import AgentChatMessageList from './AgentChatMessageList.vue';
import type { AgentJsonConfig } from '../types';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import { buildAgentConfigFingerprint } from '../composables/agentTelemetry.utils';

const props = withDefaults(
	defineProps<{
		visible?: boolean;
		projectId: string;
		agentId: string;
		mode?: 'panel' | 'inline';
		continueSessionId?: string;
		agentConfig: AgentJsonConfig | null;
		agentStatus: 'draft' | 'production';
		connectedTriggers: string[];
		canEditAgent?: boolean;
		canSendToAssistant?: boolean;
		beforeSend?: () => Promise<void> | void;
		inputDraft?: string;
	}>(),
	{
		visible: true,
		mode: 'panel',
		continueSessionId: undefined,
		canEditAgent: true,
		canSendToAssistant: false,
		beforeSend: undefined,
		inputDraft: undefined,
	},
);

const emit = defineEmits<{
	'update:streaming': [streaming: boolean];
	'update:inputDraft': [value: string];
	'continue-loaded': [count: number];
	'initial-consumed': [];
	back: [];
	'open-build': [];
	'send-to-assistant': [];
}>();

const locale = useI18n();
const agentTelemetry = useAgentTelemetry();

const internalInputText = ref(props.inputDraft ?? '');
const inputText = computed<string>({
	get: () => (props.inputDraft !== undefined ? props.inputDraft : internalInputText.value),
	set: (value) => {
		if (props.inputDraft !== undefined) {
			emit('update:inputDraft', value);
		} else {
			internalInputText.value = value;
		}
	},
});
const isPreparingToSend = ref(false);

const {
	messages,
	isStreaming,
	messagingState,
	fatalError,
	loadHistory,
	sendMessage,
	stopGenerating,
	resume,
	cancelAndSteer,
	dismissFatalError,
} = useAgentChatStream({
	projectId: toRef(props, 'projectId'),
	agentId: toRef(props, 'agentId'),
	continueSessionId: toRef(props, 'continueSessionId'),
	onHistoryLoaded: (count) => {
		if (props.continueSessionId) emit('continue-loaded', count);
	},
});

const RUNTIME_ISSUE_PATH_PREFIXES = [
	{ prefix: 'tools.', key: 'agents.chat.misconfigured.missing.tools' },
	{ prefix: 'mcpServers.', key: 'agents.chat.misconfigured.missing.mcpServers' },
	{ prefix: 'subAgents.agents.', key: 'agents.chat.misconfigured.missing.subAgents.agents' },
] as const;

function humaniseMissingField(field: string): string {
	if (field.startsWith('skill:')) {
		return locale.baseText('agents.chat.misconfigured.missing.skill', {
			interpolate: { id: field.slice('skill:'.length) },
		});
	}
	const exactKey = `agents.chat.misconfigured.missing.${field}`;
	const exactTranslation = locale.baseText(exactKey as never);
	if (exactTranslation !== exactKey) {
		return exactTranslation;
	}
	for (const { prefix, key } of RUNTIME_ISSUE_PATH_PREFIXES) {
		if (field.startsWith(prefix)) {
			return locale.baseText(key);
		}
	}
	return field;
}

const missingFields = computed(() => {
	if (!fatalError.value) return '';
	return fatalError.value.missing.map(humaniseMissingField).join(', ');
});

const openInteractive = computed(() => findOpenInteractive(messages.value));
const hasOpenInteraction = computed(() => openInteractive.value !== undefined);
const hasOpenApproval = computed(() => openInteractive.value?.toolName === APPROVAL_TOOL_NAME);
const hasOpenInteractiveQuestion = computed(
	() => hasOpenInteraction.value && !hasOpenApproval.value,
);
const areConfigurationActionsDisabled = computed(
	() => isStreaming.value || isPreparingToSend.value || hasOpenInteraction.value,
);

const chatPlaceholder = computed(() =>
	hasOpenApproval.value
		? locale.baseText('agents.chat.approval.inputPlaceholder')
		: hasOpenInteractiveQuestion.value
			? locale.baseText('agents.chat.answerQuestionPlaceholder')
			: locale.baseText('agents.chat.input.placeholder'),
);

watch(isStreaming, (v) => emit('update:streaming', v));

async function onSubmit() {
	const text = inputText.value.trim();
	if (!text || isStreaming.value || isPreparingToSend.value || hasOpenApproval.value) return;

	if (hasOpenInteractiveQuestion.value) {
		inputText.value = '';
		await cancelAndSteer(text);
		return;
	}

	isPreparingToSend.value = true;
	try {
		await props.beforeSend?.();
	} catch {
		isPreparingToSend.value = false;
		return;
	}

	try {
		inputText.value = '';

		const fingerprint = await buildAgentConfigFingerprint(
			props.agentConfig,
			props.connectedTriggers,
		);
		agentTelemetry.trackSubmittedMessage({
			agentId: props.agentId,
			status: props.agentStatus,
			agentConfig: fingerprint,
		});

		await sendMessage(text);
	} finally {
		isPreparingToSend.value = false;
	}
}

function sendMessageFromOutside(message: string) {
	if (hasOpenApproval.value) return;
	inputText.value = message;
	void onSubmit();
}

defineExpose({ sendMessageFromOutside });

onMounted(() => {
	void loadHistory();
});

onBeforeUnmount(() => {
	stopGenerating();
});
</script>

<template>
	<aside v-if="visible" :class="[mode === 'inline' ? $style.inlinePanel : $style.panel]">
		<N8nCallout v-if="fatalError" theme="danger" :class="$style.errorBanner" slim>
			<div :class="$style.errorBannerBody">
				<span :class="$style.errorBannerTitle">
					{{ locale.baseText('agents.chat.misconfigured.title') }}
				</span>
				<span v-if="missingFields" :class="$style.errorBannerDetail">
					{{ locale.baseText('agents.chat.misconfigured.issuesPrefix') }} {{ missingFields }}
				</span>
			</div>
			<template #trailingContent>
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="xsmall"
					:aria-label="locale.baseText('agents.chat.misconfigured.dismiss')"
					:title="locale.baseText('agents.chat.misconfigured.dismiss')"
					@click="dismissFatalError"
				/>
			</template>
		</N8nCallout>

		<AgentChatEmptyState v-if="messages.length === 0 && !isStreaming" />
		<AgentChatMessageList
			v-else
			:messages="messages"
			:messaging-state="messagingState"
			:project-id="projectId"
			:agent-id="agentId"
			:session-id="continueSessionId"
			:can-send-to-assistant="canSendToAssistant"
			@resume="resume"
			@send-to-assistant="emit('send-to-assistant')"
		/>

		<div :class="$style.inputArea">
			<slot name="above-input" :disabled="areConfigurationActionsDisabled" />
			<ChatInputBase
				v-model="inputText"
				:placeholder="chatPlaceholder"
				:is-streaming="messagingState === 'receiving'"
				:can-submit="
					!hasOpenApproval && !isStreaming && !isPreparingToSend && inputText.trim().length > 0
				"
				:disabled="
					hasOpenApproval || isPreparingToSend || (isStreaming && messagingState !== 'receiving')
				"
				data-testid="chat-input"
				@submit="onSubmit"
				@stop="stopGenerating"
			>
				<template #footer-start>
					<slot name="footer-start" />
				</template>
			</ChatInputBase>
		</div>
	</aside>
</template>

<style lang="scss" module>
.panel {
	position: relative;
	width: 400px;
	min-width: 400px;
	border-left: var(--border);
	display: flex;
	flex-direction: column;
}

.inlinePanel {
	position: relative;
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.inputArea {
	padding: var(--spacing--xs) var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.errorBanner {
	margin: var(--spacing--sm);
	flex-shrink: 0;
}

.errorBannerBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.errorBannerTitle {
	font-weight: var(--font-weight--bold);
}

.errorBannerDetail {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtle);
}
</style>
