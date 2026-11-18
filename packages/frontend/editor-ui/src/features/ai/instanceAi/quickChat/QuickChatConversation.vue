<script lang="ts" setup>
/**
 * The conversation of the quick chat, for one thread. The parent keys it by thread id, so a
 * new chat mounts a new conversation with its own thread runtime.
 */
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { provideThread, useInstanceAiStore } from '../instanceAi.store';
import InstanceAiConversation from '../components/InstanceAiConversation.vue';

const props = defineProps<{
	threadId: string;
	isDraft: boolean;
	projectId: string;
}>();

const emit = defineEmits<{
	persisted: [threadId: string];
	'thread-missing': [];
}>();

const i18n = useI18n();
const store = useInstanceAiStore();

provideThread(store.getOrCreateRuntime(props.threadId, props.projectId));

// A quick chat is a normal Assistant thread, so it shows in the chat history. The source
// context tells it apart from chats started on the Assistant page.
const QUICK_CHAT_LAUNCH = {
	source: 'assistant_page',
	origin: 'internal',
	sourceContext: { surface: 'quick_chat' },
} as const;

/** Saves the draft thread on the server before its first message, like the Assistant page. */
async function beforeSend() {
	if (!props.isDraft) return;
	await store.syncThread(props.threadId, props.projectId, QUICK_CHAT_LAUNCH);
	emit('persisted', props.threadId);
}
</script>

<template>
	<InstanceAiConversation
		:new-thread="isDraft"
		:before-send="beforeSend"
		:placeholder="i18n.baseText('quickChat.placeholder')"
		autofocus
		@thread-missing="emit('thread-missing')"
	>
		<template #empty>
			<div :class="$style.empty" data-test-id="quick-chat-empty">
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('quickChat.empty') }}
				</N8nText>
			</div>
		</template>
	</InstanceAiConversation>
</template>

<style lang="scss" module>
.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	// Fills the message list, so the text centers between the header and the composer.
	flex: 1;
	padding: var(--spacing--lg);
	text-align: center;
}
</style>
