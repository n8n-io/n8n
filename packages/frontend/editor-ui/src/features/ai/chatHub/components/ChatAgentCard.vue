<script setup lang="ts">
import type { AgentCardData } from '@/features/ai/chatHub/chat.types';
import { N8nCard, N8nIconButton, N8nText } from '@n8n/design-system';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import { RouterLink } from 'vue-router';
import { computed } from 'vue';
import { getAgentRoute } from '@/features/ai/chatHub/chat.utils';

const props = defineProps<{
	data: AgentCardData;
}>();

const emit = defineEmits<{
	edit: [];
	delete: [];
}>();

const name = computed(() => {
	if (props.data.type === 'custom-agent') {
		return props.data.agent.name;
	}
	return props.data.name;
});

const description = computed(() => {
	if (props.data.type === 'custom-agent') {
		return props.data.agent.description;
	}
	return 'n8n workflow agent';
});

const provider = computed(() => {
	if (props.data.type === 'custom-agent') {
		return props.data.agent.provider;
	}
	return 'n8n';
});

const model = computed(() => {
	if (props.data.type === 'custom-agent') {
		return props.data.agent.model;
	}
	return null;
});

const updatedAt = computed(() => {
	if (props.data.type === 'custom-agent') {
		return props.data.agent.updatedAt;
	}
	return null;
});

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
	<N8nCard :class="$style.card" hoverable>
		<template #header>
			<N8nText tag="h3" size="medium" bold>
				<RouterLink :to="getAgentRoute(data)" :class="$style.cardLink">
					{{ name }}
				</RouterLink>
			</N8nText>
			<div v-if="data.type === 'custom-agent'" :class="$style.cardActions">
				<N8nIconButton
					icon="pen"
					type="tertiary"
					size="small"
					title="Edit agent"
					@click="emit('edit')"
				/>
				<N8nIconButton
					icon="trash-2"
					type="tertiary"
					size="small"
					title="Delete agent"
					@click="emit('delete')"
				/>
			</div>
		</template>

		<div :class="$style.descriptionContainer">
			<N8nText :class="$style.description" color="text-light">
				{{ description }}
			</N8nText>
		</div>

		<template #footer>
			<N8nText size="xsmall" color="text-light">
				<span v-if="provider === 'n8n'"> {{ providerDisplayNames[provider] }} workflow </span>
				<span v-else-if="provider && model">
					{{ providerDisplayNames[provider] }} • {{ model }}
				</span>
				<span v-else>No model configured</span>
			</N8nText>
			<N8nText v-if="updatedAt" size="xsmall" color="text-light" :class="$style.lastUpdate">
				Updated {{ formatDate(updatedAt) }}
			</N8nText>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	position: relative;
	cursor: pointer;
	transition: transform 0.2s ease;

	& > div {
		height: 100%;
	}
}

.cardLink {
	color: inherit;
	text-decoration: none;

	&::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 0;
	}
}

.cardActions {
	display: flex;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
	position: relative;
	z-index: 1;
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
