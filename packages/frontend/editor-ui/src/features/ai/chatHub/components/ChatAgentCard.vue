<script setup lang="ts">
import type { ChatHubAgentDto } from '@n8n/api-types';
import { N8nCard, N8nIconButton, N8nText } from '@n8n/design-system';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';

defineProps<{
	agent: ChatHubAgentDto;
}>();

const emit = defineEmits<{
	click: [];
	edit: [event: MouseEvent];
	delete: [event: MouseEvent];
}>();

function formatDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffInMs = now.getTime() - date.getTime();
	const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

	if (diffInDays === 0) {
		return 'Today';
	}
	if (diffInDays === 1) {
		return 'Yesterday';
	}
	if (diffInDays < 7) {
		return `${diffInDays} days ago`;
	}

	return date.toLocaleDateString();
}
</script>

<template>
	<N8nCard :class="$style.card" hoverable @click="emit('click')">
		<template #header>
			<N8nText tag="h3" size="medium" bold>{{ agent.name }}</N8nText>
			<div :class="$style.cardActions" @click.stop>
				<N8nIconButton
					icon="pen"
					type="tertiary"
					size="small"
					title="Edit agent"
					@click="emit('edit', $event)"
				/>
				<N8nIconButton
					icon="trash-2"
					type="tertiary"
					size="small"
					title="Delete agent"
					@click="emit('delete', $event)"
				/>
			</div>
		</template>

		<div :class="$style.descriptionContainer">
			<N8nText :class="$style.description" color="text-light">
				{{ agent.description }}
			</N8nText>
		</div>

		<template #footer>
			<N8nText size="xsmall" color="text-light">
				<span v-if="agent.provider && agent.model">
					{{ providerDisplayNames[agent.provider] }} • {{ agent.model }}
				</span>
				<span v-else>No model configured</span>
			</N8nText>
			<N8nText size="xsmall" color="text-light" :class="$style.lastUpdate">
				Updated {{ formatDate(agent.updatedAt) }}
			</N8nText>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	cursor: pointer;
	transition: transform 0.2s ease;

	& > div {
		height: 100%;
	}
}

.cardActions {
	display: flex;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.descriptionContainer {
	padding-block: var(--spacing--sm);
}

.description {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	text-overflow: ellipsis;
	word-break: break-word;
}

.lastUpdate {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}
</style>
