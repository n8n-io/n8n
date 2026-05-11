<script setup lang="ts">
import { computed, ref, toRef, watch, onMounted, onBeforeUnmount } from 'vue';
import { N8nButton, N8nCallout, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import { useAgentChatStream } from '../composables/useAgentChatStream';
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
		endpoint?: 'build' | 'chat';
		initialMessage?: string;
		continueSessionId?: string;
		agentConfig: AgentJsonConfig | null;
		agentStatus: 'draft' | 'production';
		connectedTriggers: string[];
		beforeSend?: () => Promise<void> | void;
	}>(),
	{
		visible: true,
		mode: 'panel',
		endpoint: 'chat',
		initialMessage: undefined,
		continueSessionId: undefined,
		beforeSend: undefined,
	},
);

const emit = defineEmits<{
	codeUpdated: [];
	codeDelta: [delta: string];
	configUpdated: [];
	'update:streaming': [streaming: boolean];
	'continue-loaded': [count: number];
	'initial-consumed': [];
	back: [];
	'open-build': [];
}>();

const locale = useI18n();
const agentTelemetry = useAgentTelemetry();

const inputText = ref('');
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
	dismissFatalError,
} = useAgentChatStream({
	projectId: toRef(props, 'projectId'),
	agentId: toRef(props, 'agentId'),
	endpoint: toRef(props, 'endpoint'),
	continueSessionId: toRef(props, 'continueSessionId'),
	onCodeUpdated: () => emit('codeUpdated'),
	onCodeDelta: (d) => emit('codeDelta', d),
	onConfigUpdated: () => emit('configUpdated'),
	onHistoryLoaded: (count) => {
		if (props.continueSessionId) emit('continue-loaded', count);
	},
});

function humaniseMissingField(field: string): string {
	// `skill:<id>` is a parameterised token — render it through a single i18n
	// entry so a new id doesn't require a translations change.
	if (field.startsWith('skill:')) {
		return locale.baseText('agents.chat.misconfigured.missing.skill', {
			interpolate: { id: field.slice('skill:'.length) },
		});
	}
	// Map backend-emitted field ids onto i18n keys. Unknown fields fall back to
	// their raw id so a new backend-side value still renders something useful.
	const key = `agents.chat.misconfigured.missing.${field}`;
	const translated = locale.baseText(key as never);
	return translated === key ? field : translated;
}

const missingFields = computed(() => {
	if (!fatalError.value) return '';
	return fatalError.value.missing.map(humaniseMissingField).join(', ');
});

const hasOpenInteractiveQuestion = computed(() =>
	messages.value.some((message) => message.interactive && !message.interactive.resolvedAt),
);

const chatPlaceholder = computed(() =>
	hasOpenInteractiveQuestion.value
		? locale.baseText('agents.chat.answerQuestionPlaceholder')
		: locale.baseText('agents.chat.input.placeholder'),
);

function onOpenBuild() {
	dismissFatalError();
	emit('open-build');
}

watch(isStreaming, (v) => emit('update:streaming', v));

async function onSubmit() {
	const text = inputText.value.trim();
	if (!text || isStreaming.value || isPreparingToSend.value || hasOpenInteractiveQuestion.value) {
		return;
	}

	isPreparingToSend.value = true;
	try {
		await props.beforeSend?.();
	} catch {
		// Autosave errors are surfaced by the caller that owns the flush.
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
			mode: props.endpoint === 'build' ? 'build' : 'test',
			status: props.agentStatus,
			agentConfig: fingerprint,
		});

		await sendMessage(text);
	} finally {
		isPreparingToSend.value = false;
	}
}

function sendMessageFromOutside(message: string) {
	if (hasOpenInteractiveQuestion.value) return;
	inputText.value = message;
	void onSubmit();
}

defineExpose({ sendMessageFromOutside });

// Capture the seed message locally so later clearing of `props.initialMessage`
// by the parent (which does so on `nextTick` to prevent the same prompt
// bleeding into the other chat panel) can't race the `onMounted` guard below.
const seedMessage = props.initialMessage;

// Seed the initial message synchronously during setup (not onMounted) so the
// user bubble is in `messages` before Vue performs the first render. Without
// this, the panel renders once with an empty message list and THEN the user
// message appears — visible as a 1-frame flash of the blank/centered layout.
//
// `sendMessage` is an async function but the push to `messages` happens
// before any await, so calling it here runs the sync prefix (push + set
// `isStreaming = true` inside streamFromEndpoint) before setup returns. The
// fetch itself continues to run async in the background.
async function sendSeedMessage(message: string): Promise<void> {
	try {
		await props.beforeSend?.();
		const sending = sendMessage(message);
		emit('initial-consumed');
		await sending;
	} catch {
		// Autosave errors are surfaced by the caller that owns the flush.
	}
}

if (seedMessage) {
	void sendSeedMessage(seedMessage);
}

onMounted(() => {
	// A supplied `initialMessage` means the parent just minted a fresh session
	// and wants us to seed it with the first message — there's no thread to
	// load yet, and hitting the history endpoint would 404. The seed was
	// already sent synchronously during setup (see the `seedMessage` block
	// above).
	if (seedMessage) {
		return;
	}
	void loadHistory();
});

// Abort any in-flight stream when the panel unmounts (e.g. route change,
// chat mode reset). Without this the fetch keeps running and its reader
// accumulates bytes until the browser gc's it.
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
					{{ locale.baseText('agents.chat.misconfigured.missingPrefix') }} {{ missingFields }}
				</span>
			</div>
			<template #trailingContent>
				<N8nButton
					variant="outline"
					size="xsmall"
					data-testid="agent-misconfigured-open-build"
					@click="onOpenBuild"
				>
					{{ locale.baseText('agents.chat.misconfigured.openBuild') }}
				</N8nButton>
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

		<!--
			Suppress the centered empty state when we have an `initialMessage` to
			seed. Without this, the panel briefly renders the empty view before
			the seedMessage push (during setup) lands in `messages` — visible as
			a flicker of the centered layout under the mode transition.
		-->
		<AgentChatEmptyState
			v-if="messages.length === 0 && !isStreaming && !initialMessage"
			:endpoint="endpoint"
		/>
		<AgentChatMessageList
			v-else
			:messages="messages"
			:messaging-state="messagingState"
			:project-id="projectId"
			:agent-id="agentId"
			@resume="resume"
		/>

		<div :class="$style.inputArea">
			<slot name="above-input" />
			<ChatInputBase
				v-model="inputText"
				:placeholder="chatPlaceholder"
				:is-streaming="messagingState === 'receiving'"
				:can-submit="
					!hasOpenInteractiveQuestion &&
					!isStreaming &&
					!isPreparingToSend &&
					inputText.trim().length > 0
				"
				:disabled="
					hasOpenInteractiveQuestion ||
					isPreparingToSend ||
					(isStreaming && messagingState !== 'receiving')
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
