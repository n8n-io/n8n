<script setup lang="ts">
import type { SelfHealingResultDetail, WorkflowSuggestionActivity } from '@n8n/api-types';
import { N8nAssistantAvatar, N8nIcon, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed } from 'vue';

const props = defineProps<{ detail: SelfHealingResultDetail }>();
const i18n = useI18n();
const rootStore = useRootStore();

type Activity = Omit<WorkflowSuggestionActivity, 'action'> & {
	action:
		| WorkflowSuggestionActivity['action']
		| 'completed'
		| 'dismissed'
		| 'continuedInEditor'
		| 'continuedInChat';
};

const entries = computed<Activity[]>(() => {
	const result = props.detail;
	const activity: Activity[] = result.suggestion
		? [...result.suggestion.activity]
		: [
				{
					id: `${result.resultId}:completed`,
					action: 'completed',
					author: 'assistant',
					actorId: null,
					createdAt: result.completedAt,
				},
			];
	if (result.dismissedAt) {
		activity.push({
			id: `${result.resultId}:dismissed`,
			action: 'dismissed',
			author: 'human',
			actorId: result.dismissedById,
			createdAt: result.dismissedAt,
		});
	}
	if (result.continuedAt && result.continuationDestination) {
		activity.push({
			id: `${result.resultId}:continued`,
			action: result.continuationDestination === 'chat' ? 'continuedInChat' : 'continuedInEditor',
			author: 'human',
			actorId: result.continuedById,
			createdAt: result.continuedAt,
		});
	}
	return activity.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
});

function actorLabel(author: Activity['author']) {
	if (author === 'assistant') return i18n.baseText('inbox.selfHealing.metadata.assistant');
	if (author === 'system') return i18n.baseText('inbox.selfHealing.activity.system');
	// The result stores the actor ID without a display name.
	return i18n.baseText('inbox.selfHealing.activity.user');
}
</script>

<template>
	<ol :class="$style.entries" data-test-id="self-healing-activity">
		<li
			v-for="entry in entries"
			:key="entry.id"
			:class="$style.entry"
			:data-action="entry.action"
			data-test-id="self-healing-activity-entry"
		>
			<N8nAssistantAvatar v-if="entry.author === 'assistant'" size="mini" />
			<N8nIcon
				v-else
				:icon="entry.author === 'human' ? 'user' : 'info'"
				size="medium"
				color="text-light"
				aria-hidden="true"
			/>
			<div :class="$style.headline">
				<N8nText size="medium" color="text-dark">{{ actorLabel(entry.author) }}</N8nText>
				<span aria-hidden="true" :class="$style.separator">|</span>
				<N8nText size="medium" color="text-light">
					{{ i18n.baseText(`inbox.selfHealing.activity.${entry.action}`) }}
				</N8nText>
				<N8nText size="medium" color="text-light">
					<time :datetime="entry.createdAt">
						<N8nTimeAgo :date="entry.createdAt" :locale="rootStore.defaultLocale" />
					</time>
				</N8nText>
			</div>
		</li>
	</ol>
</template>

<style module lang="scss">
.entries {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	list-style: none;
	margin: 0;
	padding: var(--spacing--xs) var(--spacing--sm);
}

.entry {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);

	> :first-child {
		flex-shrink: 0;
		margin-top: var(--spacing--5xs);
	}
}

.headline {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.separator {
	margin-inline: var(--spacing--3xs);
	color: var(--text-color--subtler);
}
</style>
