<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { InsightsByWorkflow } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { smartDecimal } from '@n8n/utils/number/smartDecimal';
import { VIEWS } from '@/app/constants';
import { formatInsightsTimeSavedLabel } from '@/features/execution/insights/insights.utils';

const props = defineProps<{
	workflows: InsightsByWorkflow['data'];
}>();

const i18n = useI18n();

const rankedWorkflows = computed(() =>
	[...props.workflows].sort((left, right) => right.timeSaved - left.timeSaved),
);

const totalTimeSaved = computed(() =>
	rankedWorkflows.value.reduce((sum, workflow) => sum + workflow.timeSaved, 0),
);

const getShareLabel = (minutes: number) => {
	if (totalTimeSaved.value <= 0) return '';

	const share = (minutes / totalTimeSaved.value) * 100;

	return i18n.baseText('insights.analyst.chat.ranking.share', {
		interpolate: { count: smartDecimal(share) },
	});
};

const getShareWidth = (minutes: number) => {
	if (totalTimeSaved.value <= 0) return '0%';

	return `${Math.max(4, (minutes / totalTimeSaved.value) * 100)}%`;
};
</script>

<template>
	<ol :class="$style.list">
		<li
			v-for="(workflow, index) in rankedWorkflows"
			:key="workflow.workflowId ?? workflow.workflowName"
		>
			<RouterLink
				v-if="workflow.workflowId"
				:to="{ name: VIEWS.WORKFLOW, params: { workflowId: workflow.workflowId } }"
				:class="$style.row"
			>
				<span :class="$style.rank">{{ index + 1 }}</span>
				<span :class="$style.details">
					<strong>{{ workflow.workflowName }}</strong>
					<span :class="$style.metric">{{ formatInsightsTimeSavedLabel(workflow.timeSaved) }}</span>
					<span :class="$style.shareTrack" aria-hidden="true">
						<span :class="$style.shareFill" :style="{ width: getShareWidth(workflow.timeSaved) }" />
					</span>
					<small>{{ getShareLabel(workflow.timeSaved) }}</small>
				</span>
			</RouterLink>
			<div v-else :class="$style.row">
				<span :class="$style.rank">{{ index + 1 }}</span>
				<span :class="$style.details">
					<strong>{{ workflow.workflowName }}</strong>
					<span :class="$style.metric">{{ formatInsightsTimeSavedLabel(workflow.timeSaved) }}</span>
				</span>
			</div>
		</li>
	</ol>
</template>

<style lang="scss" module>
.list {
	display: grid;
	gap: var(--spacing--2xs);
	margin: var(--spacing--sm) 0 0;
	padding: 0;
	list-style: none;
}

.row {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	gap: var(--spacing--sm);
	align-items: start;
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
	color: var(--text-color);
	text-decoration: none;

	&:hover,
	&:focus-visible {
		border-color: var(--border-color--strong);
	}
}

.rank {
	display: inline-grid;
	place-items: center;
	width: var(--spacing--xl);
	height: var(--spacing--xl);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
	flex-shrink: 0;
}

.details {
	display: grid;
	gap: var(--spacing--4xs);
	min-width: 0;

	strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--font-size--md);
	}
}

.metric {
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--sm);
}

.shareTrack {
	display: block;
	height: var(--spacing--4xs);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	overflow: hidden;
}

.shareFill {
	display: block;
	height: 100%;
	border-radius: inherit;
	background: var(--color--primary);
}

small {
	color: var(--text-color--subtle);
}
</style>
