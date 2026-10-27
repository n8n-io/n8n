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
	action: WorkflowSuggestionActivity['action'] | 'completed' | 'dismissed' | 'closed';
};

const entries = computed<Activity[]>(() => {
	const result = props.detail;
	let activity: Activity[];
	if (result.suggestion) {
		activity = [...result.suggestion.activity];
	} else {
		activity = [
			{
				id: `${result.resultId}:completed`,
				action: 'completed',
				author: 'assistant',
				actorId: null,
				createdAt: result.completedAt,
			},
		];
	}

	if (result.reviewState === 'closed') {
		activity.push({
			id: `${result.resultId}:closed`,
			action: 'closed',
			author: 'system',
			actorId: null,
			createdAt: result.completedAt,
		});
	}

	if (result.dismissedAt) {
		activity.push({
			id: `${result.resultId}:dismissed`,
			action: 'dismissed',
			author: 'human',
			actorId: result.dismissedById,
			createdAt: result.dismissedAt,
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
	<div :class="$style.activity">
		<N8nText tag="h3" bold size="medium" color="text-light" :class="$style.heading">{{
			i18n.baseText('inbox.selfHealing.tabs.activity')
		}}</N8nText>
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
					size="large"
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
	</div>
</template>

<style module lang="scss">
@use '../reviews/components/activity-card' as activity;

.activity {
	--review-activity--avatar-size: var(--height--3xs);
	--review-activity--line-height: var(--height--2xs);
	--review-activity--gap: var(--spacing--md);

	padding-bottom: var(--spacing--md);
}

.heading {
	margin: 0;
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}

.entries {
	display: flex;
	flex-direction: column;
	gap: var(--review-activity--gap);
	list-style: none;
	margin: 0;
	padding: 0 var(--spacing--sm);
}

.entry {
	@include activity.activity-row;
	position: relative;

	> :first-child {
		@include activity.activity-avatar;
	}
}

/* Join consecutive events through the space between their avatars. */
.entry:not(:first-child)::before {
	content: '';
	position: absolute;
	bottom: calc(100% + var(--spacing--5xs));
	height: calc(var(--review-activity--gap) - 2 * var(--spacing--5xs));
	left: calc(var(--review-activity--avatar-size) / 2);
	border-left: var(--border);
}

.headline {
	@include activity.activity-headline;
	min-width: 0;
	line-height: var(--review-activity--line-height);

	> :global(.n8n-text) {
		line-height: inherit;
	}
}

.separator {
	margin-inline: var(--spacing--3xs);
	color: var(--text-color--subtler);
}
</style>
