<script setup lang="ts">
import type {
	WorkflowReviewRequestDecision,
	WorkflowReviewRequestState,
	WorkflowReviewRequestWorkflowDetail,
} from '@n8n/api-types';
import {
	N8nAccordion,
	N8nAccordionContent,
	N8nAccordionHeader,
	N8nAccordionItem,
	N8nAccordionTrigger,
	N8nText,
} from '@n8n/design-system';

import { getVersionLabel } from '@n8n/composables/useWorkflowVersionLabel';
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
	<N8nAccordion v-model="expanded" type="single" collapsible unmount-on-hide :class="$style.list">
		<N8nAccordionItem
			v-for="workflow in workflows"
			:key="workflow.workflowId"
			:value="workflow.workflowId"
			:class="$style.item"
			data-test-id="workflow-review-changes-item"
		>
			<N8nAccordionHeader>
				<N8nAccordionTrigger
					:class="$style.trigger"
					data-test-id="workflow-review-changes-item-trigger"
				>
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
				</N8nAccordionTrigger>
			</N8nAccordionHeader>
			<N8nAccordionContent :class="$style.content">
				<WorkflowReviewChangesSection :workflow="workflow" :state="state" :decision="decision" />
			</N8nAccordionContent>
		</N8nAccordionItem>
	</N8nAccordion>
</template>

<style module lang="scss">
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	/* A definite height, so the diff canvas can size itself with percentages. */
	height: 100%;
	/* Each workflow is its own card. Drop the grouped border from N8nAccordion. */
	border: none;
	border-radius: 0;
	background: transparent;
	overflow: visible;
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

.trigger {
	background: var(--color--background--light-3);
}

.name {
	flex: 1;
	min-width: 0;
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
	/* The diff canvas sizes itself. The shared content padding and height animation do not apply. */
	--accordion--content--padding: 0;
	--animation--collapsible-slide--duration: 0s;
}
</style>
