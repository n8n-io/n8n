<script setup lang="ts">
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUsageStore } from '@/stores/usage.store';
import { useAsyncState } from '@vueuse/core';
import { PLACEHOLDER_EMPTY_WORKFLOW_ID, EVALUATIONS_DOCS_URL } from '@/constants';
import { useCanvasOperations } from '@/composables/useCanvasOperations';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useEvaluationStore } from '../evaluation.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';

import { computed, watch } from 'vue';
import EvaluationsPaywall from '../components/Paywall/EvaluationsPaywall.vue';
import SetupWizard from '../components/SetupWizard/SetupWizard.vue';

import { N8nCallout, N8nLink, N8nText } from '@n8n/design-system';
const props = defineProps<{
	name: string;
}>();

const workflowsStore = useWorkflowsStore();
const usageStore = useUsageStore();
const evaluationStore = useEvaluationStore();
const nodeTypesStore = useNodeTypesStore();
const telemetry = useTelemetry();
const toast = useToast();
const locale = useI18n();
const sourceControlStore = useSourceControlStore();

const { initializeWorkspace } = useCanvasOperations();

const evaluationsLicensed = computed(() => {
	return usageStore.workflowsWithEvaluationsLimit !== 0;
});

const isProtectedEnvironment = computed(() => {
	return sourceControlStore.preferences.branchReadOnly;
});

const runs = computed(() => {
	return Object.values(evaluationStore.testRunsById ?? {}).filter(
		({ workflowId }) => workflowId === props.name,
	);
});

const hasRuns = computed(() => {
	return runs.value.length > 0;
});

const showWizard = computed(() => !hasRuns.value);

// Method to run a test - will be used by the SetupWizard component
async function runTest() {
	try {
		await evaluationStore.startTestRun(props.name);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantStartTestRun'));
		return;
	}
	try {
		await evaluationStore.fetchTestRuns(props.name);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantFetchTestRuns'));
	}
}

const evaluationsQuotaExceeded = computed(() => {
	return (
		usageStore.workflowsWithEvaluationsLimit !== -1 &&
		usageStore.workflowsWithEvaluationsCount >= usageStore.workflowsWithEvaluationsLimit &&
		!hasRuns.value
	);
});

const { isReady } = useAsyncState(async () => {
	try {
		await usageStore.getLicenseInfo();
		await evaluationStore.fetchTestRuns(props.name);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluation.listRuns.error.cantFetchTestRuns'));
	}
	const workflowId = props.name;
	const isAlreadyInitialized = workflowsStore.workflow.id === workflowId;
	if (isAlreadyInitialized) return;

	if (workflowId && workflowId !== 'new') {
		// Check if we are loading the Evaluation tab directly, without having loaded the workflow
		if (workflowsStore.workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
			try {
				const data = await workflowsStore.fetchWorkflow(workflowId);

				// We need to check for the evaluation node with setMetrics operation, so we need to initialize the nodeTypesStore to have node properties initialized
				if (nodeTypesStore.allNodeTypes.length === 0) {
					await nodeTypesStore.getNodeTypes();
				}

				initializeWorkspace(data);
			} catch (error) {
				toast.showError(error, locale.baseText('nodeView.showError.openWorkflow.title'));
			}
		}
	}
}, undefined);

watch(
	isReady,
	(ready) => {
		if (ready) {
			if (showWizard.value) {
				telemetry.track('User viewed tests tab', {
					workflow_id: props.name,
					test_type: 'evaluation',
					view: 'setup',
					trigger_set_up: evaluationStore.evaluationTriggerExists,
					output_set_up: evaluationStore.evaluationSetOutputsNodeExist,
					metrics_set_up: evaluationStore.evaluationSetMetricsNodeExist,
					quota_reached: evaluationsQuotaExceeded.value,
				});
			} else {
				telemetry.track('User viewed tests tab', {
					workflow_id: props.name,
					test_type: 'evaluation',
					view: 'overview',
					run_count: runs.value.length,
				});
			}
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.evaluationsView">
		<template v-if="isReady && showWizard">
			<div :class="$style.setupContent">
				<div>
					<N8nText size="large" color="text-dark" tag="h3" bold>
						{{ locale.baseText('evaluations.setupWizard.title') }}
					</N8nText>
					<N8nText tag="p" size="small" color="text-base" :class="$style.description">
						{{ locale.baseText('evaluations.setupWizard.description') }}
						<N8nLink size="small" :href="EVALUATIONS_DOCS_URL">{{
							locale.baseText('evaluations.setupWizard.moreInfo')
						}}</N8nLink>
					</N8nText>
				</div>

				<N8nCallout v-if="isProtectedEnvironment" theme="info" icon="info">
					{{ locale.baseText('evaluations.readOnlyNotice') }}
				</N8nCallout>
				<div v-else :class="$style.config">
					<iframe
						style="min-width: 500px"
						width="500"
						height="280"
						src="https://www.youtube.com/embed/5LlF196PKaE"
						title="n8n Evaluation quickstart"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						referrerpolicy="strict-origin-when-cross-origin"
						allowfullscreen
					></iframe>
					<SetupWizard v-if="evaluationsLicensed" @run-test="runTest" />
					<EvaluationsPaywall v-else />
				</div>
			</div>
		</template>
		<RouterView v-else-if="isReady" />
	</div>
</template>

<style module lang="scss">
.evaluationsView {
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
}

.setupContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	max-width: 1024px;
	margin-top: var(--spacing--2xl);
	padding: 0;
}

.description {
	max-width: 600px;
	margin-bottom: 20px;
}

.config {
	display: flex;
	flex-direction: row;
	gap: var(--spacing--lg);
}

.setupDescription {
	margin-top: var(--spacing--2xs);

	ul {
		li {
			margin-top: var(--spacing--2xs);
		}
	}
}
</style>
