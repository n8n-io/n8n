<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import {
	N8nAiActivityStepGroup,
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentChatQueueItem } from '@n8n/api-types';
import { formatBytes } from '@n8n/utils/number/bytes';

type QueuedMessage = Extract<AgentChatQueueItem, { kind: 'message' }>;
const props = withDefaults(
	defineProps<{
		messages: QueuedMessage[];
		saveMessage: (id: string, message: string) => Promise<void>;
		removeMessage: (id: string) => Promise<void>;
		sendNow: (id: string) => Promise<void>;
		sendAgain: (id: string) => Promise<void>;
		canSendNow?: boolean;
		startsNewTurn?: boolean;
		sendNowUnavailableReason?: 'hitl-pending' | 'no-active-run';
	}>(),
	{ canSendNow: false, startsNewTurn: false, sendNowUnavailableReason: undefined },
);

const locale = useI18n();
const editor = ref<{ item: QueuedMessage; text: string }>();
const input = useTemplateRef<Array<InstanceType<typeof N8nInput>>>('input');
const saving = ref(false);
const removingId = ref<string>();
const sendingId = ref<string>();
const error = ref('');
const canSave = computed(
	() =>
		editor.value &&
		props.messages.some(({ id, status }) => id === editor.value?.item.id && status === 'queued'),
);
const rows = computed(() =>
	editor.value && !canSave.value ? [...props.messages, editor.value.item] : props.messages,
);
const title = computed(() =>
	locale.baseText('agents.chat.queue.count', {
		adjustToNumber: props.messages.length,
		interpolate: { count: String(props.messages.length) },
	}),
);

async function edit(item: QueuedMessage) {
	editor.value = { item, text: item.message };
	error.value = '';
	await nextTick();
	input.value?.[0]?.focus();
}

function cancel() {
	editor.value = undefined;
	error.value = '';
}

async function save() {
	const draft = editor.value;
	if (!draft || !canSave.value || saving.value) return;
	saving.value = true;
	error.value = '';
	try {
		await props.saveMessage(draft.item.id, draft.text);
		if (editor.value === draft) cancel();
	} catch {
		error.value = locale.baseText('agents.chat.queue.save.error');
	} finally {
		saving.value = false;
	}
}

async function remove(id: string) {
	removingId.value = id;
	error.value = '';
	try {
		await props.removeMessage(id);
	} catch {
		error.value = locale.baseText('agents.chat.queue.remove.error');
	} finally {
		removingId.value = undefined;
	}
}

async function sendMessageNow(id: string) {
	sendingId.value = id;
	error.value = '';
	try {
		await props.sendNow(id);
	} catch {
		error.value = locale.baseText('agents.chat.queue.sendNow.error');
	} finally {
		sendingId.value = undefined;
	}
}

async function sendMessageAgain(id: string) {
	sendingId.value = id;
	error.value = '';
	try {
		await props.sendAgain(id);
	} catch {
		error.value = locale.baseText('agents.chat.queue.sendAgain.error');
	} finally {
		sendingId.value = undefined;
	}
}

const sendNowTooltip = computed(() => {
	if (props.canSendNow) {
		return locale.baseText(
			props.startsNewTurn ? 'agents.chat.queue.sendNow.newParentTurn' : 'agents.chat.queue.sendNow',
		);
	}
	return locale.baseText(
		props.sendNowUnavailableReason === 'hitl-pending'
			? 'agents.chat.queue.sendNow.hitlPending'
			: 'agents.chat.queue.sendNow.noActiveRun',
	);
});
</script>

<template>
	<div v-if="messages.length || editor" :class="$style.queue" data-testid="agent-chat-queue">
		<N8nAiActivityStepGroup :label="title" full-width content-position="above">
			<template #prefix><N8nIcon icon="list" size="small" aria-hidden="true" /></template>
			<div :class="$style.details">
				<p v-if="error" role="alert">{{ error }}</p>
				<ol :class="$style.list">
					<li
						v-for="item in rows"
						:key="item.id"
						:class="$style.item"
						data-testid="agent-chat-queue-message"
					>
						<form v-if="editor?.item.id === item.id" :class="$style.editor" @submit.prevent="save">
							<N8nInput
								ref="input"
								v-model="editor.text"
								type="textarea"
								:disabled="saving"
								:aria-label="locale.baseText('agents.chat.queue.editLabel')"
								:autosize="{ minRows: 2, maxRows: 6 }"
								@keydown.esc.prevent="cancel"
							/>
							<p v-if="!canSave" role="status">
								{{ locale.baseText('agents.chat.queue.noLongerWaiting') }}
							</p>
							<div :class="$style.actions">
								<N8nButton
									size="small"
									:disabled="
										!canSave || saving || (!editor.text.trim() && !item.attachments.length)
									"
									@click="save"
									>{{ locale.baseText('generic.save') }}</N8nButton
								>
								<N8nButton size="small" variant="ghost" @click="cancel">{{
									locale.baseText('generic.cancel')
								}}</N8nButton>
							</div>
						</form>
						<div v-else :class="$style.messageRow" data-testid="agent-chat-queue-message-row">
							<div :class="$style.message">
								<p>{{ item.message }}</p>
								<p v-if="item.status === 'steering'" :class="$style.status">
									{{ locale.baseText('agents.chat.queue.sendNow.pending') }}
								</p>
								<p v-else-if="item.status === 'undelivered'" :class="$style.status">
									{{
										item.failureReason ?? locale.baseText('agents.chat.queue.sendNow.undelivered')
									}}
								</p>
							</div>
							<div :class="$style.actions">
								<N8nButton
									v-if="item.status === 'undelivered'"
									size="small"
									variant="ghost"
									:disabled="sendingId !== undefined"
									data-test-id="agent-chat-queue-send-again"
									@click="sendMessageAgain(item.id)"
								>
									{{ locale.baseText('agents.chat.queue.sendAgain') }}
								</N8nButton>
								<N8nTooltip
									v-if="item.status === 'queued'"
									:content="sendNowTooltip"
									placement="top"
								>
									<N8nButton
										size="small"
										variant="ghost"
										:disabled="!canSendNow || !!editor || sendingId !== undefined"
										data-test-id="agent-chat-queue-send-now"
										@click="sendMessageNow(item.id)"
									>
										{{ locale.baseText('agents.chat.queue.sendNow') }}
									</N8nButton>
								</N8nTooltip>
								<N8nTooltip
									v-if="item.status === 'queued'"
									:content="locale.baseText('generic.edit')"
									placement="top"
								>
									<N8nIconButton
										icon="pencil"
										size="xsmall"
										variant="ghost"
										:aria-label="locale.baseText('generic.edit')"
										:disabled="!!editor || removingId === item.id"
										data-test-id="agent-chat-queue-edit"
										@click="edit(item)"
									/>
								</N8nTooltip>
								<N8nTooltip
									v-if="item.status === 'queued' || item.status === 'undelivered'"
									:content="locale.baseText('agents.chat.queue.remove')"
									placement="top"
								>
									<N8nIconButton
										icon="trash-2"
										size="xsmall"
										variant="ghost"
										:aria-label="locale.baseText('agents.chat.queue.remove')"
										:disabled="removingId !== undefined"
										data-test-id="agent-chat-queue-remove"
										@click="remove(item.id)"
									/>
								</N8nTooltip>
							</div>
						</div>
						<ul v-if="item.attachments.length" :class="$style.attachments">
							<li v-for="attachment in item.attachments" :key="attachment.id">
								<N8nIcon icon="paperclip" size="small" aria-hidden="true" />
								<span
									>{{ attachment.fileName }} · {{ attachment.mimeType }} ·
									{{ formatBytes(attachment.sizeBytes) }}</span
								>
							</li>
						</ul>
					</li>
				</ol>
			</div>
		</N8nAiActivityStepGroup>
	</div>
</template>

<style lang="scss" module>
.queue {
	width: 100%;
	border-bottom: var(--border);
}

.details {
	padding: var(--spacing--xs);
	max-height: calc(var(--height--5xl) * 3);
	overflow-y: auto;
	font-size: var(--font-size--sm);
}

.list,
.attachments {
	list-style: none;
	padding: 0;
	margin: 0;
}

.item + .item {
	border-top: var(--border);
	margin-top: var(--spacing--xs);
	padding-top: var(--spacing--xs);
}

.message {
	flex: 1;
	min-width: 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	margin: 0;
}

.message p {
	margin: 0;
}

.status {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
}

.messageRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.editor {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.actions,
.attachments li {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.actions {
	flex-shrink: 0;
}

.attachments {
	font-size: var(--font-size--2xs);
	overflow-wrap: anywhere;
}
</style>
