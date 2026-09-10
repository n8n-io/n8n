<script setup lang="ts">
import type { BrowserAutomationIdea } from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';

import type { RecommendationsStatus } from '../../types';

// A plain literal, not `MAX_BROWSER_AUTOMATION_IDEAS` from `@n8n/api-types` — that package's
// root barrel pulls in `n8n-workflow` (xml2js/sax), which assumes Node globals the extension
// doesn't have. Only `import type` from `@n8n/api-types` is safe here.
const MAX_IDEAS = 3;

defineProps<{
	status: RecommendationsStatus;
	ideas: BrowserAutomationIdea[];
}>();

defineEmits<{ pick: [idea: BrowserAutomationIdea] }>();
</script>

<template>
	<div v-if="status === 'loading'" class="ideas skeleton" aria-hidden="true">
		<div class="idea-card skeleton-card" v-for="n in MAX_IDEAS" :key="n" />
	</div>
	<div v-else-if="status === 'ready'" class="ideas">
		<button v-for="idea in ideas" :key="idea.id" class="idea-card" @click="$emit('pick', idea)">
			<span class="marker">
				<N8nIcon icon="lightbulb" size="large" />
			</span>
			<span class="idea-text">
				<span class="idea-title">{{ idea.title }}</span>
				<span class="idea-description">{{ idea.description }}</span>
			</span>
		</button>
	</div>
	<p v-else-if="status === 'sent'" class="sent">
		AI Assistant is building this in a new conversation.
	</p>
</template>

<style scoped lang="scss">
.ideas {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-bottom: var(--spacing--md);
}

.idea-card {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--sm);
	width: 100%;
	padding: var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	border-radius: var(--radius--lg);
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.marker {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--row-marker-size);
	height: var(--row-marker-size);
	border-radius: 50%;
	background: var(--color--background);
	color: var(--color--text--shade-1);
}

.idea-text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
	padding-top: var(--spacing--4xs);
}

.idea-title {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
}

.idea-description {
	font-size: var(--font-size--xs);
	color: var(--text-color--subtler);
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.skeleton-card {
	height: 52px;
	background: var(--color--foreground--tint-2);
	border-color: transparent;
	animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
	0%,
	100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}

.sent {
	font-size: var(--font-size--sm);
	color: var(--text-color--subtler);
	margin: 0 0 var(--spacing--sm);
}
</style>
