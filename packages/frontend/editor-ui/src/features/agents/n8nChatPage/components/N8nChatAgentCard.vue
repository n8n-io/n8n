<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { AgentChatListItem } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';

import { AGENT_N8N_CHAT_VIEW } from '../../constants';
import { useAgentTelemetry, type N8nChatAgentSource } from '../../composables/useAgentTelemetry';
import AgentPersonalisationIcon from '../../components/AgentPersonalisationIcon.vue';

const props = defineProps<{
	agent: AgentChatListItem;
	/** Where the card was shown, for the selection telemetry event. */
	source: N8nChatAgentSource;
}>();

const agentTelemetry = useAgentTelemetry();

function onClick(): void {
	agentTelemetry.trackSelectedN8nChatAgent({ agentId: props.agent.id, source: props.source });
}
</script>

<template>
	<RouterLink
		:to="{ name: AGENT_N8N_CHAT_VIEW, params: { agentId: agent.id } }"
		:class="$style.card"
		data-test-id="n8n-chat-agent-card"
		@click="onClick"
	>
		<AgentPersonalisationIcon :personalisation="agent.personalisation" :size="40" />
		<div :class="$style.content">
			<N8nText bold :class="$style.title" data-test-id="n8n-chat-agent-card-name">
				{{ agent.name }}
			</N8nText>
			<N8nText
				v-if="agent.description"
				size="small"
				color="text-light"
				:class="$style.description"
				data-test-id="n8n-chat-agent-card-description"
			>
				{{ agent.description }}
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
