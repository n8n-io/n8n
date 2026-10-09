<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { AgentChatListItem } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';

import { INSTANCE_AI_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENT_N8N_CHAT_VIEW } from '../../constants';
import { useAgentTelemetry, type N8nChatAgentSource } from '../../composables/useAgentTelemetry';
import AgentPersonalisationIcon from '../../components/AgentPersonalisationIcon.vue';
import { useN8nAssistantIdentity } from '../composables/useN8nAssistantIdentity';

const props = defineProps<{
	/** `null` renders the n8n Assistant, which links back to the Assistant page. */
	agent: AgentChatListItem | null;
	/** Where the card was shown, for the selection telemetry event. */
	source: N8nChatAgentSource;
}>();

const assistant = useN8nAssistantIdentity();
const agentTelemetry = useAgentTelemetry();

const to = computed(() =>
	props.agent
		? { name: AGENT_N8N_CHAT_VIEW, params: { agentId: props.agent.id } }
		: { name: INSTANCE_AI_VIEW },
);
const name = computed(() => props.agent?.name ?? assistant.name.value);
const description = computed(() =>
	props.agent ? props.agent.description : assistant.description.value,
);

function onClick(): void {
	if (!props.agent) return;
	agentTelemetry.trackSelectedN8nChatAgent({ agentId: props.agent.id, source: props.source });
}
</script>

<template>
	<RouterLink :to="to" :class="$style.card" data-test-id="n8n-chat-agent-card" @click="onClick">
		<AgentPersonalisationIcon
			:personalisation="agent ? agent.personalisation : assistant.personalisation"
			:size="40"
		/>
		<div :class="$style.content">
			<N8nText bold :class="$style.title" data-test-id="n8n-chat-agent-card-name">
				{{ name }}
			</N8nText>
			<N8nText
				v-if="description"
				size="small"
				color="text-light"
				:class="$style.description"
				data-test-id="n8n-chat-agent-card-description"
			>
				{{ description }}
			</N8nText>
		</div>
	</RouterLink>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.card {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	background-color: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius--lg);
	text-decoration: none;
	color: inherit;
	transition: box-shadow 0.3s ease;

	&:hover {
		box-shadow: var(--shadow--card-hover);
	}

	@include focus.focus-visible-ring;
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.description {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}
</style>
