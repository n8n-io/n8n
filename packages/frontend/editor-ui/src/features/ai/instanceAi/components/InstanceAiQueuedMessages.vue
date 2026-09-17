<script setup lang="ts">
import { N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { computed, ref } from 'vue';

import { useI18n } from '@n8n/i18n';

import { useThread } from '../instanceAi.store';

/**
 * Messages the user submitted while the assistant was working. The server owns
 * the queue; this only renders it and asks for changes. An item leaves the list
 * when the server reports it delivered (`user-message`), so nothing here removes
 * an item optimistically.
 */
const emit = defineEmits<{ recall: [text: string] }>();

const thread = useThread();
const i18n = useI18n();

// A message sent now is already in the transcript and no longer the user's to
// edit or withdraw, so it leaves the list even while the server still holds it
// for the run it is about to start.
const pendingMessages = computed(() =>
	thread.queuedMessages.filter((message) => message.steerRequestedAt === undefined),
);

// Per-item pending state: a steer lands at the next tool boundary, which can be
// a while away, so the button must not invite a second press meanwhile.
const steeringIds = ref(new Set<string>());

async function onSteer(messageId: string): Promise<void> {
	steeringIds.value = new Set([...steeringIds.value, messageId]);
	try {
		await thread.steerQueuedMessage(messageId);
	} finally {
		const next = new Set(steeringIds.value);
		next.delete(messageId);
		steeringIds.value = next;
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
				<N8nText v-if="steeringIds.has(message.id)" size="small" color="text-light">
					{{ i18n.baseText('instanceAi.queue.sending') }}
				</N8nText>
				<N8nTooltip v-else :content="i18n.baseText('instanceAi.queue.sendNow')" placement="top">
					<N8nIconButton
						icon="send"
						size="xsmall"
						variant="ghost"
						:aria-label="i18n.baseText('instanceAi.queue.sendNow')"
						data-test-id="instance-ai-queued-message-send-now"
						@click="onSteer(message.id)"
					/>
				</N8nTooltip>
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
	</div>
</template>

<style lang="scss" module>
.queue {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--2xs);
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
