<script setup lang="ts">
import { INSTANCE_AI_MAX_QUEUED_MESSAGES } from '@n8n/api-types';
import { N8nButton, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { computed, ref } from 'vue';

import { useI18n } from '@n8n/i18n';

import { useThread } from '../instanceAi.store';

/**
 * Messages the user submitted while the assistant was working. The server owns
 * the queue; this only renders it and asks for changes. The queue is one turn:
 * it goes as a whole, joined with newlines, after the next tool call — or at
 * once with Send now. An item leaves the list when the server reports it sent
 * (`user-message`), so nothing here removes an item optimistically.
 */
const emit = defineEmits<{ recall: [text: string] }>();

const thread = useThread();
const i18n = useI18n();

// A sent turn is already in the transcript and no longer the user's to edit or
// withdraw, so it leaves the list even while the server still holds it for the
// run it is about to start.
const pendingMessages = computed(() =>
	thread.queuedMessages.filter((message) => message.sentAt === undefined),
);
const isFull = computed(() => pendingMessages.value.length >= INSTANCE_AI_MAX_QUEUED_MESSAGES);

// Send now cancels the tool call in flight, which can take a moment to settle,
// so the button must not invite a second press meanwhile.
const isSending = ref(false);

async function onSendNow(): Promise<void> {
	isSending.value = true;
	try {
		await thread.sendQueueNow();
	} finally {
		isSending.value = false;
	}
}

async function onEdit(messageId: string): Promise<void> {
	const text = await thread.takeQueuedMessageForEdit(messageId);
	if (text !== null) emit('recall', text);
}

function onRemove(messageId: string): void {
	void thread.removeQueuedMessage(messageId);
}
</script>

<template>
	<div
		v-if="pendingMessages.length > 0"
		:class="$style.queue"
		:aria-label="i18n.baseText('instanceAi.queue.title')"
		data-test-id="instance-ai-queued-messages"
	>
		<div :class="$style.header">
			<N8nText size="small" color="text-light" data-test-id="instance-ai-queued-messages-count">
				{{
					i18n.baseText('instanceAi.queue.count', {
						interpolate: {
							count: String(pendingMessages.length),
							max: String(INSTANCE_AI_MAX_QUEUED_MESSAGES),
						},
					})
				}}
			</N8nText>
			<N8nButton
				size="mini"
				variant="subtle"
				icon="send"
				:loading="isSending"
				:label="i18n.baseText(isSending ? 'instanceAi.queue.sending' : 'instanceAi.queue.sendNow')"
				data-test-id="instance-ai-queued-message-send-now"
				@click="onSendNow"
			/>
		</div>
		<div
			v-for="message in pendingMessages"
			:key="message.id"
			:class="$style.item"
			data-test-id="instance-ai-queued-message"
		>
			<N8nText :class="$style.text" size="small" color="text-base" :title="message.text">
				{{ message.text }}
			</N8nText>
			<div :class="$style.actions">
				<N8nTooltip :content="i18n.baseText('instanceAi.queue.edit')" placement="top">
					<N8nIconButton
						icon="pencil"
						size="xsmall"
						variant="ghost"
						:aria-label="i18n.baseText('instanceAi.queue.edit')"
						data-test-id="instance-ai-queued-message-edit"
						@click="onEdit(message.id)"
					/>
				</N8nTooltip>
				<N8nTooltip :content="i18n.baseText('instanceAi.queue.remove')" placement="top">
					<N8nIconButton
						icon="trash-2"
						size="xsmall"
						variant="ghost"
						:aria-label="i18n.baseText('instanceAi.queue.remove')"
						data-test-id="instance-ai-queued-message-remove"
						@click="onRemove(message.id)"
					/>
				</N8nTooltip>
			</div>
		</div>
		<N8nText
			v-if="isFull"
			size="small"
			color="text-light"
			data-test-id="instance-ai-queued-messages-full"
		>
			{{ i18n.baseText('instanceAi.queue.full') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.queue {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--2xs);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--sm);
}

.text {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}
</style>
