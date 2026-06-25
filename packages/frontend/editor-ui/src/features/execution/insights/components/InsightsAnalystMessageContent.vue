<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { InsightsAnalystCitation, InsightsByWorkflow } from '@n8n/api-types';
import { N8nHeading } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
import { VIEWS } from '@/app/constants';
import ChatMarkdownChunk from '@/features/ai/chatHub/components/ChatMarkdownChunk.vue';
import InsightsAnalystChatRanking from '@/features/execution/insights/components/InsightsAnalystChatRanking.vue';
import { formatInsightsTimeSavedLabel } from '@/features/execution/insights/insights.utils';

const props = defineProps<{
	content: string;
	citations?: InsightsAnalystCitation[];
	workflowRows?: InsightsByWorkflow['data'];
	isStreaming?: boolean;
}>();

const i18n = useI18n();

const TAKEAWAY_HEADING_PATTERN = /\*\*Key takeaways?:?\*\*:?\s*/i;
const RANKING_INTRO_PATTERN =
	/ranked by time saved|from most to least|workflows saved (?:us )?the most time|most time saved/i;
const NUMBERED_LIST_PATTERN = /^\s*1\.\s/m;

const parsedContent = computed(() => {
	const takeawayMatch = props.content.match(TAKEAWAY_HEADING_PATTERN);
	if (!takeawayMatch || takeawayMatch.index === undefined) {
		return { intro: props.content.trim(), takeaways: '' };
	}

	return {
		intro: props.content.slice(0, takeawayMatch.index).trim(),
		takeaways: props.content.slice(takeawayMatch.index + takeawayMatch[0].length).trim(),
	};
});

const shouldShowRanking = computed(
	() =>
		!props.isStreaming &&
		(props.workflowRows?.length ?? 0) > 0 &&
		RANKING_INTRO_PATTERN.test(parsedContent.value.intro) &&
		NUMBERED_LIST_PATTERN.test(parsedContent.value.intro),
);

const introMarkdown = computed(() => {
	if (!shouldShowRanking.value) return parsedContent.value.intro;

	const listStart = parsedContent.value.intro.search(NUMBERED_LIST_PATTERN);
	if (listStart === -1) return parsedContent.value.intro;

	return parsedContent.value.intro.slice(0, listStart).trim();
});

const supplementalCitations = computed(() => {
	if (!props.citations?.length) return [];

	if (!shouldShowRanking.value) return props.citations;

	return props.citations.filter(
		(citation) => !(citation.unit === 'minute' && /time saved/i.test(citation.metric)),
	);
});

const getCitationValue = (citation: InsightsAnalystCitation) => {
	if (citation.unit === 'minute') return formatInsightsTimeSavedLabel(citation.value);
	if (citation.unit === 'ratio') {
		return i18n.baseText('insights.analyst.citation.percent', {
			interpolate: { count: smartDecimal(citation.value * 100) },
		});
	}
	return smartDecimal(citation.value).toLocaleString('en-US');
};
</script>

<template>
	<div :class="$style.content">
		<div v-if="introMarkdown" :class="$style.prose">
			<ChatMarkdownChunk :source="{ type: 'text', content: introMarkdown }" />
		</div>

		<InsightsAnalystChatRanking
			v-if="shouldShowRanking && workflowRows"
			:workflows="workflowRows"
		/>

		<section v-if="parsedContent.takeaways" :class="$style.takeaways">
			<N8nHeading tag="h4" size="small" bold>
				{{ i18n.baseText('insights.analyst.chat.takeaways') }}
			</N8nHeading>
			<div :class="$style.prose">
				<ChatMarkdownChunk :source="{ type: 'text', content: parsedContent.takeaways }" />
			</div>
		</section>

		<div v-if="supplementalCitations.length" :class="$style.citations">
			<RouterLink
				v-for="citation in supplementalCitations"
				:key="`${citation.workflowId}-${citation.metric}`"
				:to="{ name: VIEWS.WORKFLOW, params: { workflowId: citation.workflowId } }"
				:class="$style.citation"
			>
				<strong>{{ citation.workflowName }}</strong>
				<span>{{ citation.metric }}: {{ getCitationValue(citation) }}</span>
			</RouterLink>
		</div>
	</div>
</template>

<style lang="scss" module>
.content {
	display: grid;
	gap: var(--spacing--md);
	font-size: var(--font-size--md);
	line-height: var(--line-height--lg);
}

.prose {
	:deep(*) {
		font-size: inherit;
		line-height: inherit;
	}

	:deep(p),
	:deep(li) {
		margin: var(--spacing--xs) 0;

		&:first-child {
			margin-top: 0;
		}

		&:last-child {
			margin-bottom: 0;
		}
	}

	:deep(strong),
	:deep(b) {
		font-weight: var(--font-weight--bold);
		color: var(--color--text--shade-1);
	}

	:deep(em),
	:deep(i) {
		font-style: italic;
		color: var(--color--text--shade-1);
	}

	:deep(ol) {
		display: grid;
		gap: var(--spacing--2xs);
		margin: var(--spacing--sm) 0 0;
		padding: 0;
		list-style: none;
		counter-reset: rank;

		li {
			counter-increment: rank;
			margin: 0;
			padding: var(--spacing--sm);
			border: var(--border);
			border-radius: var(--radius--lg);
			background: var(--background--surface);

			&::marker {
				content: none;
			}

			strong,
			b {
				display: inline-block;
				margin-bottom: var(--spacing--5xs);
				font-size: var(--font-size--md);
			}
		}
	}

	:deep(ul) {
		margin: var(--spacing--sm) 0 0;
		padding-left: var(--spacing--lg);

		li + li {
			margin-top: var(--spacing--2xs);
		}
	}
}

.takeaways {
	display: grid;
	gap: var(--spacing--xs);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.citations {
	display: grid;
	gap: var(--spacing--2xs);
}

.citation {
	display: grid;
	gap: var(--spacing--4xs);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	color: var(--text-color);
	text-decoration: none;
	background: var(--background--surface);
	font-size: var(--font-size--sm);

	strong {
		font-size: var(--font-size--md);
	}

	span {
		color: var(--text-color--subtle);
	}

	&:hover {
		border-color: var(--border-color--strong);
	}
}
</style>
