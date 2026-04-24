<script setup lang="ts">
import { computed, ref, toRef, watch, onMounted, onBeforeUnmount } from 'vue';
import { N8nIcon } from '@n8n/design-system';
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
	}>(),
	{
		visible: true,
		mode: 'panel',
		endpoint: 'chat',
		initialMessage: undefined,
		continueSessionId: undefined,
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

function onOpenBuild() {
	dismissFatalError();
	emit('open-build');
}

watch(isStreaming, (v) => emit('update:streaming', v));

async function onSubmit() {
	const text = inputText.value.trim();
	if (!text || isStreaming.value) return;
	inputText.value = '';

	const fingerprint = await buildAgentConfigFingerprint(props.agentConfig, props.connectedTriggers);
	// Raw `message` is sent intentionally — matches the text-to-workflow
	// builder's `User submitted builder message` event, which also sends the
	// raw prompt. Revisit if the product-wide privacy posture tightens.
	agentTelemetry.trackSubmittedMessage({
		agentId: props.agentId,
		message: text,
		mode: props.endpoint === 'build' ? 'build' : 'test',
		status: props.agentStatus,
		agentConfig: fingerprint,
	});

	await sendMessage(text);
}

function sendMessageFromOutside(message: string) {
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
if (seedMessage) {
	void sendMessage(seedMessage);
}

onMounted(() => {
	// A supplied `initialMessage` means the parent just minted a fresh session
	// and wants us to seed it with the first message — there's no thread to
	// load yet, and hitting the history endpoint would 404. The seed was
	// already sent synchronously during setup (see the `seedMessage` block
	// above) — here we just emit `initial-consumed` so the parent can clear
	// its source ref. This guards against re-sending on HMR / any re-mount
	// where the parent's prompt ref is still populated.
	if (seedMessage) {
		emit('initial-consumed');
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
		<div v-if="fatalError" :class="$style.errorBanner" role="alert">
			<N8nIcon icon="triangle-alert" :size="16" :class="$style.errorBannerIcon" />
			<div :class="$style.errorBannerBody">
				<span :class="$style.errorBannerTitle">
					{{ locale.baseText('agents.chat.misconfigured.title') }}
				</span>
				<span v-if="missingFields" :class="$style.errorBannerDetail">
					{{ locale.baseText('agents.chat.misconfigured.missingPrefix') }} {{ missingFields }}
				</span>
			</div>
			<div :class="$style.errorBannerActions">
				<button
					:class="$style.errorBannerBtn"
					data-testid="agent-misconfigured-open-build"
					@click="onOpenBuild"
				>
					{{ locale.baseText('agents.chat.misconfigured.openBuild') }}
				</button>
				<button
					:class="$style.errorBannerDismiss"
					:title="locale.baseText('agents.chat.misconfigured.dismiss')"
					@click="dismissFatalError"
				>
					<N8nIcon icon="x" :size="14" />
				</button>
			</div>
		</div>

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
				placeholder="Type a message..."
				:is-streaming="messagingState === 'receiving'"
				:can-submit="!isStreaming && inputText.trim().length > 0"
				:disabled="isStreaming && messagingState !== 'receiving'"
				data-testid="chat-input"
				@submit="onSubmit"
				@stop="stopGenerating"
			/>
		</div>
	</aside>
</template>

<style lang="scss" module>
.panel {
	position: relative;
	width: 400px;
	min-width: 400px;
	border-left: var(--border-width) var(--border-style) var(--color--foreground);
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
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
	border-top: var(--border);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.errorBanner {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	margin: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--color--danger--tint-3);
	background-color: var(--color--danger--tint-4);
	border-radius: var(--radius);
	color: var(--color--text);
	flex-shrink: 0;
}

.errorBannerIcon {
	color: var(--color--danger);
	margin-top: 2px;
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
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--xl);
}

.errorBannerDetail {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
}

.errorBannerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.errorBannerBtn {
	display: inline-flex;
	align-items: center;
	border: var(--border-width) var(--border-style) var(--color--primary);
	background-color: transparent;
	color: var(--color--primary);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background-color: var(--color--primary--tint-3);
	}
}

.errorBannerDismiss {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: none;
	background: none;
	color: var(--color--text--tint-2);
	width: 24px;
	height: 24px;
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background-color: var(--color--foreground--tint-2);
		color: var(--color--text);
	}
}
</style>
