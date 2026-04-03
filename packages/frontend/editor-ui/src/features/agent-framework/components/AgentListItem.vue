<script setup lang="ts">
import type { SdkAgentDto } from '../composables/useAgentApi';

defineProps<{
	agent: SdkAgentDto;
}>();

const emit = defineEmits<{
	select: [agentId: string];
}>();

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}
</script>

<template>
	<div
		:class="$style.card"
		data-testid="agent-list-item"
		role="button"
		tabindex="0"
		@click="emit('select', agent.id)"
		@keydown.enter="emit('select', agent.id)"
	>
		<div :class="$style.header">
			<span :class="$style.name">{{ agent.name }}</span>
		</div>
		<p v-if="agent.description" :class="$style.description">
			{{ agent.description }}
		</p>
		<p v-else :class="$style.descriptionEmpty">No description</p>
		<div :class="$style.footer">
			<span :class="$style.updated">Updated {{ formatDate(agent.updatedAt) }}</span>
		</div>
	</div>
</template>

<style module>
.card {
	background: var(--color--background);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	padding: var(--spacing--lg);
	cursor: pointer;
	transition: border-color 0.2s ease;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.card:hover {
	border-color: var(--color--primary);
}

.card:focus-visible {
	outline: 2px solid var(--color--primary);
	outline-offset: 2px;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.name {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.badge {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius);
	white-space: nowrap;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.description {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
	margin: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.descriptionEmpty {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-3);
	font-style: italic;
	line-height: var(--line-height--xl);
	margin: 0;
}

.footer {
	margin-top: var(--spacing--4xs);
}

.updated {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
}
</style>
