<script setup lang="ts">
import TimeAgo from '@/app/components/TimeAgo.vue';
import { getAgentRoute } from '@/features/ai/chatHub/chat.utils';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import type { ChatModelDto } from '@n8n/api-types';
import { N8nIconButton, N8nText } from '@n8n/design-system';
import { RouterLink } from 'vue-router';

const { agent } = defineProps<{
	agent: ChatModelDto;
}>();

const emit = defineEmits<{
	edit: [];
	delete: [];
}>();
</script>

<template>
	<RouterLink :to="getAgentRoute(agent.model)" :class="$style.card">
		<ChatAgentAvatar :agent="agent" size="lg" />

		<div :class="$style.content">
			<N8nText tag="h3" size="medium" bold :class="$style.title">
				{{ agent.name }}
			</N8nText>
			<N8nText size="small" color="text-light" :class="$style.description">
				{{ agent.description || 'No description' }}
			</N8nText>
			<div :class="$style.metadata">
				<N8nText size="small" color="text-light">
					{{ agent.model.provider === 'n8n' ? 'n8n workflow' : 'Custom agent' }}
				</N8nText>
				<N8nText v-if="agent.updatedAt" size="small" color="text-light">
					Last updated <TimeAgo :date="agent.updatedAt" />
				</N8nText>
				<N8nText v-if="agent.createdAt" size="small" color="text-light">
					Created <TimeAgo :date="agent.createdAt" />
				</N8nText>
			</div>
		</div>

		<div :class="$style.actions">
			<N8nIconButton
				icon="pen"
				type="tertiary"
				size="medium"
				title="Edit"
				@click.prevent="emit('edit')"
			/>
			<N8nIconButton
				v-if="agent.model.provider === 'custom-agent'"
				icon="trash-2"
				type="tertiary"
				size="medium"
				title="More options"
				@click.prevent="emit('delete')"
			/>
		</div>
	</RouterLink>
</template>

<style lang="scss" module>
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
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.avatar {
	flex-shrink: 0;
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
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.metadata {
	display: flex;
	align-items: center;

	& > * {
		display: flex;
		align-items: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: pre;
	}

	& > *:not(:last-child):after {
		content: '|';
		display: block;
		padding-inline: var(--spacing--3xs);
	}
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}
</style>
