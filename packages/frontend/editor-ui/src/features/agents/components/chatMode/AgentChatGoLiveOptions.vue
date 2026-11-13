<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { AgentLiveAvailability } from './chatMode.types';

const props = withDefaults(
	defineProps<{
		liveAvailability: AgentLiveAvailability;
		/** False before the first message, when there is nothing to run again. */
		canRunThisChat?: boolean;
		/** False when the user cannot publish or run the agent. */
		disabled?: boolean;
	}>(),
	{ canRunThisChat: true, disabled: false },
);

const emit = defineEmits<{
	'run-this-chat': [];
	'new-chat': [];
}>();

const i18n = useI18n();

function select(action: 'run-this-chat' | 'new-chat') {
	if (props.disabled) return;
	if (action === 'run-this-chat') emit('run-this-chat');
	else emit('new-chat');
}

const heading = computed(() => {
	switch (props.liveAvailability) {
		case 'unpublished':
			return i18n.baseText('agents.testRun.mode.goLive.heading.publish');
		case 'changed':
			return i18n.baseText('agents.testRun.mode.goLive.heading.republish');
		default:
			return i18n.baseText('agents.testRun.mode.goLive.heading.goLive');
	}
});
</script>

<template>
	<div
		:class="$style.group"
		role="group"
		:aria-label="heading"
		data-testid="agent-chat-go-live-options"
	>
		<N8nText
			tag="div"
			size="xsmall"
			bold
			color="text-light"
			:class="$style.heading"
			data-testid="agent-chat-go-live-heading"
		>
			{{ heading }}
		</N8nText>
		<button
			v-if="props.canRunThisChat"
			type="button"
			:class="$style.option"
			:disabled="props.disabled"
			data-testid="agent-chat-go-live-run-this-chat"
			@click="select('run-this-chat')"
		>
			<N8nIcon icon="zap" size="medium" :class="$style.icon" aria-hidden="true" />
			<span :class="$style.text">
				<span :class="$style.title">{{
					i18n.baseText('agents.testRun.mode.goLive.runThisChat.title')
				}}</span>
				<span :class="$style.description">{{
					i18n.baseText('agents.testRun.mode.goLive.runThisChat.description')
				}}</span>
			</span>
		</button>
		<button
			type="button"
			:class="$style.option"
			:disabled="props.disabled"
			data-testid="agent-chat-go-live-new-chat"
			@click="select('new-chat')"
		>
			<N8nIcon icon="zap" size="medium" :class="$style.icon" aria-hidden="true" />
			<span :class="$style.text">
				<span :class="$style.title">{{
					i18n.baseText('agents.testRun.mode.goLive.newChat.title')
				}}</span>
				<span :class="$style.description">{{
					i18n.baseText('agents.testRun.mode.goLive.newChat.description')
				}}</span>
			</span>
		</button>
	</div>
</template>

<style lang="scss" module>
.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.heading {
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--4xs);
}

.option {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	color: var(--text-color);
	font: inherit;
	text-align: start;
	cursor: pointer;

	&:hover:not(:disabled) {
		background: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: calc(-1 * var(--spacing--5xs));
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
	color: light-dark(var(--color--green-700), var(--color--green-300));
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.description {
	font-size: var(--font-size--xs);
	color: var(--text-color--subtle);
}
</style>
