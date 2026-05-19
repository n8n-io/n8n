<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import { RouterLink } from 'vue-router';
import type { InsightsAnalystChatResponse, InsightsAnalystCitation } from '@n8n/api-types';
import { N8nHeading, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
import { VIEWS } from '@/app/constants';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import ChatTypingIndicator from '@/features/ai/chatHub/components/ChatTypingIndicator.vue';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { formatInsightsTimeSavedLabel } from '@/features/execution/insights/insights.utils';

type ChatMessage = {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	mode?: InsightsAnalystChatResponse['mode'];
	citations?: InsightsAnalystCitation[];
};

const props = defineProps<{
	suggestedPrompts: string[];
}>();

const i18n = useI18n();
const insightsStore = useInsightsStore();
const input = ref('');
const isWaiting = ref(false);
const isStreaming = ref(false);
const messages = ref<ChatMessage[]>([
	{
		id: 'welcome',
		role: 'assistant',
		content: i18n.baseText('insights.analyst.chat.welcome'),
		citations: [],
	},
]);
const scrollContainer = useTemplateRef<HTMLElement>('scrollContainer');

const canSubmit = computed(
	() => input.value.trim().length > 0 && !isWaiting.value && !isStreaming.value,
);
const showSuggestedPrompts = computed(
	() => messages.value.length === 1 && props.suggestedPrompts.length > 0,
);

const scrollToBottom = async () => {
	await nextTick();
	scrollContainer.value?.scrollTo({ top: scrollContainer.value.scrollHeight, behavior: 'smooth' });
};

const scrollToMessage = async (messageId: string) => {
	await nextTick();

	const container = scrollContainer.value;
	const messageElement = container?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);

	if (!container || !messageElement) return;

	container.scrollTo({
		top: messageElement.offsetTop - container.offsetTop,
		behavior: 'smooth',
	});
};

const submitPrompt = async (prompt = input.value) => {
	const question = prompt.trim();
	if (!question || isWaiting.value || isStreaming.value) return;

	messages.value.push({
		id: `user-${Date.now()}`,
		role: 'user',
		content: question,
	});
	input.value = '';
	isWaiting.value = true;
	await scrollToBottom();

	let responseMessageId = '';
	try {
		responseMessageId = `assistant-${Date.now()}`;
		messages.value.push({
			id: responseMessageId,
			role: 'assistant',
			content: '',
			citations: [],
		});
		isWaiting.value = false;
		isStreaming.value = true;
		await scrollToMessage(responseMessageId);

		await insightsStore.streamAnalyst(question, (chunk) => {
			const message = messages.value.find(({ id }) => id === responseMessageId);
			if (!message) return;

			if (chunk.type === 'delta') {
				message.content += chunk.text;
				return;
			}

			message.content = chunk.response.answer;
			message.mode = chunk.response.mode;
			message.citations = chunk.response.citations;
		});
	} catch {
		if (!responseMessageId) {
			responseMessageId = `assistant-${Date.now()}`;
		}

		const message = messages.value.find(({ id }) => id === responseMessageId);
		if (message) {
			message.content = i18n.baseText('insights.analyst.chat.error');
			message.citations = [];
		} else {
			messages.value.push({
				id: responseMessageId,
				role: 'assistant',
				content: i18n.baseText('insights.analyst.chat.error'),
				citations: [],
			});
		}
	} finally {
		isWaiting.value = false;
		isStreaming.value = false;
		await scrollToMessage(responseMessageId);
	}
};

const getCitationValue = (citation: InsightsAnalystCitation) => {
	if (citation.unit === 'minute') return formatInsightsTimeSavedLabel(citation.value);
	if (citation.unit === 'ratio') {
		return i18n.baseText('insights.analyst.citation.percent', {
			interpolate: { count: smartDecimal(citation.value * 100) },
		});
	}
	return smartDecimal(citation.value).toLocaleString('en-US');
};
</script>

<template>
	<aside :class="$style.panel" data-test-id="insights-analyst-panel">
		<header :class="$style.header">
			<div>
				<N8nHeading tag="h3" size="medium" bold>
					{{ i18n.baseText('insights.analyst.chat.title') }}
				</N8nHeading>
				<p>{{ i18n.baseText('insights.analyst.chat.description') }}</p>
			</div>
		</header>

		<div ref="scrollContainer" :class="$style.messages">
			<div
				v-for="message in messages"
				:key="message.id"
				:data-message-id="message.id"
				:class="[$style.message, $style[message.role]]"
			>
				<div :class="$style.bubble">
					<div v-if="message.mode === 'llm'" :class="$style.powered">
						<N8nIcon icon="sparkles" size="small" />
						{{ i18n.baseText('insights.analyst.chat.poweredByClaude') }}
					</div>
					<p>{{ message.content }}</p>
					<div v-if="message.citations?.length" :class="$style.citations">
						<RouterLink
							v-for="citation in message.citations"
							:key="`${message.id}-${citation.workflowId}-${citation.metric}`"
							:to="{ name: VIEWS.WORKFLOW, params: { workflowId: citation.workflowId } }"
							:class="$style.citation"
						>
							<strong>{{ citation.workflowName }}</strong>
							<span>{{ citation.metric }}: {{ getCitationValue(citation) }}</span>
						</RouterLink>
					</div>
				</div>
			</div>
			<div v-if="isWaiting" :class="[$style.message, $style.assistant]">
				<div :class="[$style.bubble, $style.waitingBubble]">
					<ChatTypingIndicator />
					<span>{{ i18n.baseText('insights.analyst.chat.thinking') }}</span>
				</div>
			</div>
		</div>

		<div :class="$style.promptArea">
			<div v-if="showSuggestedPrompts" :class="$style.suggestions">
				<button
					v-for="prompt in props.suggestedPrompts"
					:key="prompt"
					type="button"
					:class="$style.suggestion"
					:disabled="isWaiting"
					@click="submitPrompt(prompt)"
				>
					{{ prompt }}
				</button>
			</div>
			<ChatInputBase
				v-model="input"
				:placeholder="i18n.baseText('insights.analyst.chat.placeholder')"
				:is-streaming="isStreaming"
				:can-submit="canSubmit"
				:disabled="isWaiting || isStreaming"
				:show-voice="false"
				:show-attach="false"
				@submit="submitPrompt()"
			/>
		</div>
	</aside>
</template>

<style lang="scss" module>
@use '@/features/ai/shared/styles/prompt-suggestion-buttons';

.panel {
	display: grid;
	grid-template-rows: auto 1fr auto;
	min-height: 0;
	height: calc(100vh - var(--spacing--5xl) - var(--spacing--5xl));
	border: var(--border);
	border-radius: var(--radius--xl);
	background: var(--background--surface);
	overflow: hidden;
}

.header {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	border-bottom: var(--border);

	p {
		margin: var(--spacing--3xs) 0 0;
		color: var(--text-color--subtle);
	}
}

.messages {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	overflow: auto;
	min-height: 0;
}

.message {
	display: flex;
}

.user {
	justify-content: flex-end;
}

.assistant {
	justify-content: stretch;
}

.bubble {
	max-width: min(100%, var(--content-container--width));
	padding: var(--spacing--sm);
	border-radius: var(--radius--xl);
	background: var(--background--subtle);
	color: var(--text-color);

	p {
		margin: 0;
		line-height: var(--line-height--lg);
		overflow-wrap: anywhere;
		white-space: pre-wrap;
	}
}

.user .bubble {
	background: var(--background--brand);
	color: var(--color--foreground-xlight);
}

.assistant .bubble {
	width: 100%;
}

.waitingBubble {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	color: var(--text-color--subtle);
}

.powered {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}

.citations {
	display: grid;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}

.citation {
	display: grid;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	color: var(--text-color);
	text-decoration: none;
	background: var(--background--surface);

	span {
		color: var(--text-color--subtle);
	}

	&:hover {
		border-color: var(--border-color--strong);
	}
}

.promptArea {
	position: sticky;
	bottom: 0;
	display: grid;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	border-top: var(--border);
	background: var(--background--surface);
}

.suggestions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.suggestion {
	@include prompt-suggestion-buttons.prompt-suggestion-button;
}
</style>
