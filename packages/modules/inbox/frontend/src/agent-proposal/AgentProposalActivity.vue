<script setup lang="ts">
import type { SelfHealingAgentResultDetail } from '@n8n/api-types';
import { N8nAssistantAvatar, N8nIcon, N8nText, N8nTimeAgo } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed } from 'vue';

const props = defineProps<{ detail: SelfHealingAgentResultDetail }>();
const i18n = useI18n();
const rootStore = useRootStore();

type Entry = {
	action:
		| 'investigated'
		| 'proposed'
		| 'publishedAutomatically'
		| 'applied'
		| 'dismissed'
		| 'outdated';
	author: 'assistant' | 'human' | 'system';
	actor: string;
	label: string;
	createdAt: string;
};

// The result has no activity table. The timeline comes from the timestamps of the result.
const entries = computed<Entry[]>(() => {
	const result = props.detail;
	const assistant = i18n.baseText('inbox.selfHealing.metadata.assistant');
	const activity: Entry[] = [
		{
			action: 'investigated',
			author: 'assistant',
			actor: assistant,
			label: i18n.baseText(`inbox.agentProposal.activity.investigated.${result.trigger}`),
			// The trace window ends when the investigation starts.
			createdAt: result.traceWindow.end,
		},
		{
			action: 'proposed',
			author: 'assistant',
			actor: assistant,
			label: i18n.baseText('inbox.agentProposal.activity.proposed'),
			createdAt: result.createdAt,
		},
	];

	if (result.closedAt !== null && result.reviewState !== 'open') {
		if (result.appliedAutomatically) {
			activity.push({
				action: 'publishedAutomatically',
				author: 'assistant',
				actor: assistant,
				label: i18n.baseText('inbox.agentProposal.activity.publishedAutomatically'),
				createdAt: result.closedAt,
			});
		} else if (result.reviewState === 'outdated' && result.closedBy === null) {
			// The server closes an outdated proposal without a recorded user.
			activity.push({
				action: 'outdated',
				author: 'system',
				actor: i18n.baseText('inbox.selfHealing.activity.system'),
				label: i18n.baseText('inbox.agentProposal.activity.outdated'),
				createdAt: result.closedAt,
			});
		} else {
			const name = [result.closedBy?.firstName, result.closedBy?.lastName]
				.filter(Boolean)
				.join(' ');
			activity.push({
				action: result.reviewState,
				author: 'human',
				actor: name || i18n.baseText('inbox.selfHealing.activity.user'),
				label: i18n.baseText(`inbox.agentProposal.activity.${result.reviewState}`),
				createdAt: result.closedAt,
			});
		}
	}

	return activity.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
});
</script>

<template>
	<div :class="$style.activity">
		<N8nText tag="h3" bold size="medium" color="text-light" :class="$style.heading">{{
			i18n.baseText('inbox.agentProposal.tabs.activity')
		}}</N8nText>
		<ol :class="$style.entries" data-test-id="agent-proposal-activity">
			<li
				v-for="entry in entries"
				:key="entry.action"
				:class="$style.entry"
				:data-action="entry.action"
				data-test-id="agent-proposal-activity-entry"
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
					<N8nText size="medium" color="text-dark">{{ entry.actor }}</N8nText>
					<span aria-hidden="true" :class="$style.separator">|</span>
					<N8nText size="medium" color="text-light">{{ entry.label }}</N8nText>
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
