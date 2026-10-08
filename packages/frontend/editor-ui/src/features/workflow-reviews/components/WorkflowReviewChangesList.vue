<script setup lang="ts">
import type {
	WorkflowReviewRequestDecision,
	WorkflowReviewRequestState,
	WorkflowReviewRequestWorkflowDetail,
} from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import {
	AccordionContent,
	AccordionHeader,
	AccordionItem,
	AccordionRoot,
	AccordionTrigger,
} from 'reka-ui';

import { getVersionLabel } from '@/features/workflows/workflowHistory/utils';
import WorkflowReviewChangesSection from './WorkflowReviewChangesSection.vue';

defineProps<{
	workflows: WorkflowReviewRequestWorkflowDetail[];
	state: WorkflowReviewRequestState;
	decision: WorkflowReviewRequestDecision;
}>();

/** The open workflow's id. The parent owns it, so it survives a tab switch. */
const expanded = defineModel<string | undefined>('expanded');
</script>

<template>
	<!-- Closed items unmount, so only the open workflow pays for its diff canvases. -->
	<AccordionRoot v-model="expanded" type="single" collapsible unmount-on-hide :class="$style.list">
		<AccordionItem
			v-for="workflow in workflows"
			:key="workflow.workflowId"
			:value="workflow.workflowId"
			:class="$style.item"
			data-test-id="workflow-review-changes-item"
		>
			<AccordionHeader :class="$style.header">
				<AccordionTrigger
					:class="$style.trigger"
					data-test-id="workflow-review-changes-item-trigger"
				>
					<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
					<N8nText bold size="medium" color="text-dark" :class="$style.name">
						{{ workflow.workflowName }}
					</N8nText>
					<N8nText
						v-if="workflow.pinnedVersion"
						size="small"
						color="text-light"
						:class="$style.version"
						data-test-id="workflow-review-changes-item-version"
					>
						{{ getVersionLabel({ workflowHistory: workflow.pinnedVersion }) }}
					</N8nText>
				</AccordionTrigger>
			</AccordionHeader>
			<AccordionContent :class="$style.content">
				<WorkflowReviewChangesSection :workflow="workflow" :state="state" :decision="decision" />
			</AccordionContent>
		</AccordionItem>
	</AccordionRoot>
</template>

<style module lang="scss">
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	/* A definite height, so the diff canvas can size itself with percentages. */
	height: 100%;
}

.item {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	border: var(--border);
	border-radius: var(--radius--2xs);
	overflow: hidden;

	/* Only a diff takes the free height. A callout keeps its natural size. */
	&[data-state='open']:has([data-review-diff]) {
		flex: 1 0 auto;
		min-height: var(--review-diff--min-height, 28rem);
	}
}

.header {
	margin: 0;
}

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: none;
	background: var(--color--background--light-3);
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: calc(-1 * var(--focus--border-width));
	}

	&[data-state='open'] {
		border-bottom: var(--border);
	}
}

.chevron {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	transition: transform 0.15s ease;

	[data-state='closed'] > & {
		transform: rotate(-90deg);
	}
}

.name,
.version {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.version {
	flex-shrink: 0;
	max-width: 40%;
}

.content {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
}
</style>
