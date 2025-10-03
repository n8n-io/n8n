<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import WorkflowExecutionsInfoAccordion from './WorkflowExecutionsInfoAccordion.vue';
import { useI18n } from '@n8n/i18n';
import { VIEWS } from '@/constants';

import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
const router = useRouter();
const route = useRoute();
const locale = useI18n();

const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();

const executionCount = computed(() => workflowsStore.currentWorkflowExecutions.length);
const containsTrigger = computed(() => workflowsStore.workflowTriggerNodes.length > 0);

function onSetupFirstStep(): void {
	uiStore.addFirstStepOnLoad = true;

	void router.push({
		name: VIEWS.WORKFLOW,
		params: { name: workflowsStore.workflowId },
		query: { ...route.query },
	});
}
</script>

<template>
	<div :class="['workflow-executions-container', $style.container]">
		<div v-if="executionCount === 0" :class="[$style.messageContainer, $style.noExecutionsMessage]">
			<div v-if="!containsTrigger" data-test-id="workflow-execution-no-trigger-content">
				<N8nHeading tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
					{{ locale.baseText('executionsLandingPage.emptyState.noTrigger.heading') }}
				</N8nHeading>
				<N8nText size="medium">
					{{ locale.baseText('executionsLandingPage.emptyState.message') }}
				</N8nText>
				<N8nButton class="mt-l" type="tertiary" size="large" @click="onSetupFirstStep">
					{{ locale.baseText('executionsLandingPage.emptyState.noTrigger.buttonText') }}
				</N8nButton>
			</div>
			<div v-else data-test-id="workflow-execution-no-content">
				<N8nHeading tag="h2" size="xlarge" color="text-dark" class="mb-2xs">
					{{ locale.baseText('executionsLandingPage.emptyState.heading') }}
				</N8nHeading>
				<WorkflowExecutionsInfoAccordion />
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	width: 100%;
	height: 100%;
	flex: 1;
	background-color: var(--color-background-light);
	display: flex;
	flex-direction: column;
	align-items: center;
}

.messageContainer {
	margin-top: var(--spacing-4xl);
	color: var(--color-text-base);

	div {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
}

.icon {
	font-size: 24px;
	color: var(--color-foreground-dark);
}
</style>
