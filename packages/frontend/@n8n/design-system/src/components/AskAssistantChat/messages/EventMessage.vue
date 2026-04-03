<script setup lang="ts">
import BaseMessage from './BaseMessage.vue';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import InlineAskAssistantButton from '../../InlineAskAssistantButton/InlineAskAssistantButton.vue';

type EventName = 'end-session' | 'session-timeout' | 'session-error';

interface Props {
	message: {
		role: 'assistant';
		type: 'event';
		eventName: EventName;
		id: string;
		read: boolean;
	};
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

defineProps<Props>();
const { t } = useI18n();

const eventMessages: Record<EventName, Record<'part1' | 'part2', BaseTextKey>> = {
	'end-session': {
		part1: 'aiAssistant.sessionEndMessage.1',
		part2: 'aiAssistant.sessionEndMessage.2',
	},
	'session-timeout': {
		// @ts-expect-error TODO: i18n key doesn't exist
		part1: 'assistantChat.sessionTimeoutMessage.1',
		// @ts-expect-error TODO: i18n key doesn't exist
		part2: 'assistantChat.sessionTimeoutMessage.2',
	},
	'session-error': {
		// @ts-expect-error TODO: i18n key doesn't exist
		part1: 'assistantChat.sessionErrorMessage.1',
		// @ts-expect-error TODO: i18n key doesn't exist
		part2: 'assistantChat.sessionErrorMessage.2',
	},
} as const;

// TODO: i18n key doesn't exist
// `assistantChat.unknownEvent` is affected too.
</script>

<template>
	<BaseMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		<div :class="$style.eventText" data-test-id="chat-message-system">
			<span>
				{{ t(eventMessages[message.eventName]?.part1 || 'assistantChat.unknownEvent') }}
			</span>
			<InlineAskAssistantButton size="small" :static="true" />
			<span>
				{{ t(eventMessages[message.eventName]?.part2 || '') }}
			</span>
		</div>
	</BaseMessage>
</template>

<style lang="scss" module>
.eventText {
	margin-top: var(--spacing--lg);
	padding-top: var(--spacing--3xs);
	border-top: var(--border);
	color: var(--color--text);

	> button,
	> span {
		margin-right: var(--spacing--3xs);
	}

	button {
		display: inline-flex;
	}
}
</style>
