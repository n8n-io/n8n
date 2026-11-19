<script lang="ts" setup>
import type {
	McpServerDetailDto,
	McpServerPlaygroundMessageDto,
	McpServerPlaygroundRequestDto,
	McpServerPlaygroundToolCallDto,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nInput,
	N8nMarkdown,
	N8nText,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { isRecord } from '@n8n/utils/is-record';
import { computed, nextTick, ref, useTemplateRef } from 'vue';

import { sendMcpServerPlayground } from '../mcpServers.api';
import {
	CALL_STATUS_BADGE_VARIANTS,
	CALL_STATUS_LABEL_KEYS,
	formatDuration,
	toPrettyJson,
} from '../mcpServers.utils';

const props = defineProps<{ server: McpServerDetailDto }>();

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const messages = ref<McpServerPlaygroundMessageDto[]>([]);
const draft = ref('');
const sending = ref(false);
const unavailableReason = ref<string | null>(null);
/** Confirmation cards the person already answered: tool call id → approved. */
const answered = ref<Record<string, boolean>>({});
const openInputs = ref<Record<string, boolean>>({});
const logRef = useTemplateRef<HTMLElement>('log');

const enabledToolCount = computed(() => props.server.tools.filter((tool) => tool.enabled).length);

async function scrollToEnd() {
	await nextTick();
	logRef.value?.scrollTo({ top: logRef.value.scrollHeight, behavior: 'smooth' });
}

function history(): McpServerPlaygroundRequestDto['messages'] {
	return messages.value
		.filter((message) => message.text.trim().length > 0)
		.slice(-50)
		.map(({ role, text }) => ({ role, text }));
}

async function request(body: McpServerPlaygroundRequestDto) {
	sending.value = true;
	try {
		const result = await sendMcpServerPlayground(rootStore.restApiContext, props.server.id, body);
		unavailableReason.value = result.unavailableReason ?? null;
		messages.value.push(...result.messages);
	} catch (error) {
		toast.showError(error, i18n.baseText('mcpServers.playground.error'));
	} finally {
		sending.value = false;
		void scrollToEnd();
	}
}

async function send() {
	const text = draft.value.trim();
	if (!text || sending.value) return;
	draft.value = '';
	messages.value.push({ role: 'user', text });
	void scrollToEnd();
	await request({ messages: history() });
}

async function answer(call: McpServerPlaygroundToolCallDto, approved: boolean) {
	if (sending.value || answered.value[call.id] !== undefined) return;
	answered.value = { ...answered.value, [call.id]: approved };
	await request({
		messages: history(),
		confirmation: {
			toolCallId: call.id,
			name: call.name,
			input: isRecord(call.input) ? call.input : {},
			approved,
		},
	});
}

function clear() {
	messages.value = [];
	answered.value = {};
	openInputs.value = {};
	unavailableReason.value = null;
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		void send();
	}
}

function toggleInput(id: string) {
	openInputs.value = { ...openInputs.value, [id]: !openInputs.value[id] };
}

function statusVariant(call: McpServerPlaygroundToolCallDto) {
	if (call.status === 'pending' || call.status === 'confirm') return 'subtle' as const;
	return CALL_STATUS_BADGE_VARIANTS[call.status];
}

function statusLabel(call: McpServerPlaygroundToolCallDto) {
	if (call.status === 'pending') return i18n.baseText('mcpServers.playground.status.pending');
	if (call.status === 'confirm') {
		const decision = answered.value[call.id];
		if (decision === true) return i18n.baseText('mcpServers.playground.status.approved');
		if (decision === false) return i18n.baseText('mcpServers.playground.status.cancelled');
		return i18n.baseText('mcpServers.playground.status.waiting');
	}
	return i18n.baseText(CALL_STATUS_LABEL_KEYS[call.status]);
}

const suggestions = computed(() => props.server.tools.filter((tool) => tool.enabled).slice(0, 3));
</script>

<template>
	<div :class="$style.playground" data-testid="mcp-server-playground-tab">
		<div :class="$style.header">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('mcpServers.playground.note') }}
			</N8nText>
			<span :class="$style.spacer" />
			<N8nButton
				variant="ghost"
				size="small"
				icon="trash-2"
				:disabled="messages.length === 0 || sending"
				data-testid="mcp-server-playground-clear"
				@click="clear"
			>
				{{ i18n.baseText('mcpServers.playground.clear') }}
			</N8nButton>
		</div>

		<N8nCallout v-if="unavailableReason" theme="warning" icon="triangle-alert">
			{{ unavailableReason }}
		</N8nCallout>
		<N8nCallout v-else-if="enabledToolCount === 0" theme="info" icon="info">
			{{ i18n.baseText('mcpServers.playground.noTools') }}
		</N8nCallout>

		<div ref="log" :class="$style.log" data-testid="mcp-server-playground-log">
			<div v-if="messages.length === 0" :class="$style.empty">
				<N8nIcon icon="message-square" :size="24" />
				<N8nText color="text-light">{{ i18n.baseText('mcpServers.playground.empty') }}</N8nText>
				<div v-if="suggestions.length" :class="$style.suggestions">
					<N8nButton
						v-for="tool in suggestions"
						:key="tool.id"
						variant="outline"
						size="small"
						@click="
							draft = i18n.baseText('mcpServers.playground.suggestion', {
								interpolate: { name: tool.name },
							})
						"
					>
						{{ tool.name }}
					</N8nButton>
				</div>
			</div>
			<template v-for="(message, index) in messages" :key="index">
				<div v-if="message.role === 'user'" :class="[$style.message, $style.user]">
					{{ message.text }}
				</div>
				<template v-else>
					<div v-for="call in message.toolCalls ?? []" :key="call.id" :class="$style.call">
						<div :class="$style.callHeader">
							<N8nIcon icon="wrench" size="small" />
							<span :class="$style.mono">{{ call.name }}</span>
							<button type="button" :class="$style.inputToggle" @click="toggleInput(call.id)">
								<N8nIcon
									:icon="openInputs[call.id] ? 'chevron-down' : 'chevron-right'"
									size="xsmall"
								/>
								{{ i18n.baseText('mcpServers.playground.input') }}
							</button>
							<span :class="$style.spacer" />
							<N8nText v-if="call.durationMs !== undefined" size="xsmall" color="text-light">
								{{ formatDuration(call.durationMs) }}
							</N8nText>
							<N8nBadge :variant="statusVariant(call)" size="xsmall">
								{{ statusLabel(call) }}
							</N8nBadge>
						</div>
						<pre v-if="openInputs[call.id]" :class="$style.json">{{
							toPrettyJson(call.input)
						}}</pre>
						<div
							v-if="call.status === 'confirm'"
							:class="$style.confirm"
							data-testid="mcp-server-playground-confirm"
						>
							<N8nText size="small">
								<b>{{
									i18n.baseText('mcpServers.playground.confirm.asks', {
										interpolate: { server: server.name },
									})
								}}</b>
								{{ call.confirmMessage }}
							</N8nText>
							<div :class="$style.confirmActions">
								<N8nButton
									variant="brand"
									size="small"
									:disabled="sending || answered[call.id] !== undefined"
									data-testid="mcp-server-playground-approve"
									@click="answer(call, true)"
								>
									{{ i18n.baseText('mcpServers.playground.confirm.approve') }}
								</N8nButton>
								<N8nButton
									variant="outline"
									size="small"
									:disabled="sending || answered[call.id] !== undefined"
									data-testid="mcp-server-playground-cancel"
									@click="answer(call, false)"
								>
									{{ i18n.baseText('generic.cancel') }}
								</N8nButton>
								<N8nBadge variant="subtle" size="xsmall">
									{{ i18n.baseText('mcpServers.playground.confirm.tag') }}
								</N8nBadge>
							</div>
						</div>
					</div>
					<div v-if="message.text" :class="[$style.message, $style.assistant]">
						<N8nMarkdown :content="message.text" />
					</div>
				</template>
			</template>
			<div v-if="sending" :class="[$style.message, $style.assistant, $style.thinking]">
				<N8nIcon icon="loader-circle" spin size="small" />
				{{ i18n.baseText('mcpServers.playground.thinking') }}
			</div>
		</div>

		<div :class="$style.composer">
			<N8nInput
				v-model="draft"
				type="textarea"
				:rows="2"
				:placeholder="i18n.baseText('mcpServers.playground.placeholder')"
				:disabled="sending"
				data-testid="mcp-server-playground-input"
				@keydown="onKeydown"
			/>
			<N8nButton
				variant="brand"
				icon="send"
				:loading="sending"
				:disabled="!draft.trim()"
				data-testid="mcp-server-playground-send"
				@click="send"
			>
				{{ i18n.baseText('mcpServers.playground.send') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.playground {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-height: 480px;
	height: 100%;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.spacer {
	flex: 1;
}

.log {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	flex: 1;
	min-height: 320px;
	max-height: 60vh;
	overflow-y: auto;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--subtle);
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	flex: 1;
	color: var(--text-color--subtle);
	text-align: center;
}

.suggestions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: var(--spacing--3xs);
}

.message {
	max-width: 85%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius--lg);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	white-space: pre-wrap;
}

.user {
	align-self: flex-end;
	background: var(--background--user-bubble);
}

.assistant {
	align-self: flex-start;
	background: var(--background--surface);
	border: var(--border);
	white-space: normal;
}

.thinking {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--text-color--subtle);
}

.call {
	align-self: flex-start;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: min(100%, 560px);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
}

.callHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--text-color--subtle);
}

.mono {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--text-color);
}

.inputToggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: 0;
	border: none;
	background: none;
	color: var(--text-color--subtle);
	font-size: var(--font-size--3xs);
	cursor: pointer;
}

.json {
	margin: 0;
	padding: var(--spacing--2xs);
	border-radius: var(--radius);
	background: var(--background--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	white-space: pre-wrap;
	word-break: break-word;
}

.confirm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border: var(--border-width) solid var(--color--warning);
	border-radius: var(--radius);
}

.confirmActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.composer {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing--xs);
}
</style>
