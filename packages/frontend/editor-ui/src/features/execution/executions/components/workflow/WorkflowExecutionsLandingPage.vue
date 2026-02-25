<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import WorkflowExecutionsInfoAccordion from './WorkflowExecutionsInfoAccordion.vue';
import { useI18n } from '@n8n/i18n';

import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
const router = useRouter();
const route = useRoute();
const locale = useI18n();

const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();

const executionCount = computed(() => workflowsStore.currentWorkflowExecutions.length);
const containsTrigger = computed(() => workflowsStore.workflowTriggerNodes.length > 0);

function onSetupFirstStep(): void {
	const workflowId = workflowsStore.workflowId || route.params.name;

	uiStore.addFirstStepOnLoad = true;

	void router.push({
		name: VIEWS.WORKFLOW,
		params: { name: workflowId },
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
				<N8nButton variant="subtle" class="mt-l" size="large" @click="onSetupFirstStep">
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
	background-color: var(--color--background--light-2);
	display: flex;
	flex-direction: column;
	align-items: center;
}

.messageContainer {
	margin-top: var(--spacing--4xl);
	color: var(--color--text);

	div {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
}

.icon {
	font-size: 24px;
	color: var(--color--foreground--shade-1);
}
</style>
