<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import { useI18n } from '@n8n/i18n';
import { N8nActionDropdown, N8nButton, N8nIcon, N8nText } from '@n8n/design-system';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeCreatorStore } from '@/features/shared/nodeCreator/nodeCreator.store';
import { NODE_CREATOR_OPEN_SOURCES } from '@/app/constants';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useEvaluationStore } from '../../evaluation.store';
import { useSliceInputs } from '../../composables/useSliceInputs';
import { useAiRootNodes } from '../../composables/useAiRootNodes';
import { useRunEvalWorkflow } from '../../composables/useRunEvalWorkflow';
import { useDefaultJudgeSelection } from '../../composables/useDefaultJudgeSelection';
import { useWizardHydration } from '../WizardSidepanel/useWizardHydration';
import { useCreateCaseFromExecution } from '../../composables/useCreateCaseFromExecution';
import { useUserExecutions } from '../../composables/useUserExecutions';
import { LLM_JUDGE_METRIC_KEYS } from '../../evaluation.constants';
import TestCaseList from './TestCaseList.vue';
import TestCaseDetail from './TestCaseDetail.vue';
import TestCaseResults from './TestCaseResults.vue';

const wizardStore = useEvaluationsWizardSidepanelStore();
const evaluationStore = useEvaluationStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const workflowsStore = useWorkflowsStore();
const nodeCreatorStore = useNodeCreatorStore();
const { fetchLatestUserExecution } = useUserExecutions();
const locale = useI18n();

const { viewMode, judgeSelectionByMetric } = storeToRefs(wizardStore);

const aiRootNodes = useAiRootNodes();
const defaultJudgeSelection = useDefaultJudgeSelection();
const { runWorkflow, runTriggerNode, triggerNodes } = useRunEvalWorkflow();

// The workflow must have an AI node before any test can be created; otherwise we
// prompt the user to add one (opens the node creator, like the canvas "+").
const hasAiNode = computed(() => aiRootNodes.value.length > 0);
const showAddNode = computed(() => !hasAiNode.value);

// Multiple triggers → offer a picker like the canvas Run button; a single (or
// no) trigger runs directly.
const showTriggerPicker = computed(() => triggerNodes.value.length > 1);
const triggerMenuItems = computed(() =>
	triggerNodes.value.map((node) => ({ id: node.name, label: node.name })),
);

function openNodeCreator() {
	const workflowId = workflowDocumentStore.value?.workflowId;
	if (!workflowId) return;
	// An empty workflow offers triggers first, like the canvas "+" does.
	if (triggerNodes.value.length === 0) {
		nodeCreatorStore.openNodeCreatorForTriggerNodes(
			workflowId,
			NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
		);
	} else {
		nodeCreatorStore.openNodeCreatorForRegularNodes(
			workflowId,
			NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
		);
	}
}

function onTriggerSelect(triggerName: string) {
	const node = triggerNodes.value.find((t) => t.name === triggerName);
	if (node) runTriggerNode(node);
}

// Seed the judge model for every LLM-judge metric from the workflow's own
// chat-model sub-node. Re-seeds any key a hydrate left empty.
watch(
	[() => wizardStore.isOpen, defaultJudgeSelection, judgeSelectionByMetric],
	([isOpen, defaultSelection, currentSelections]) => {
		if (!isOpen || !defaultSelection) return;
		for (const key of LLM_JUDGE_METRIC_KEYS) {
			if (currentSelections[key]) continue;
			wizardStore.setJudgeSelection(key, defaultSelection);
		}
	},
	{ immediate: true },
);

// Gate: the panel is blocked from first-time authoring until the workflow has
// had at least one successful, non-evaluation execution. `probeComplete` guards
// against flashing the gate before the execution lookup resolves.
const probeComplete = ref(false);

// Declared before the probe watcher (which runs immediately): the probe writes
// to `fallbackUserExecution` during setup, so it must exist by then.
const fallbackUserExecution = ref<IExecutionResponse | null>(null);
const sliceInputs = useSliceInputs({ fallbackExecution: fallbackUserExecution });

async function runExecutionProbe() {
	try {
		await Promise.all([
			Promise.resolve(workflowsStore.fetchLastSuccessfulExecution()),
			loadFallbackUserExecution(),
		]);
	} finally {
		probeComplete.value = true;
	}
}

// Run the probe and pick a default AI node when the panel opens.
watch(
	[() => wizardStore.isOpen, aiRootNodes],
	([isOpen, nodes]) => {
		if (!isOpen) return;
		void runExecutionProbe();
		if (wizardStore.aiNodeName) return;
		const first = nodes[0];
		if (first) wizardStore.setAiNodeName(first.name);
	},
	{ immediate: true },
);

// Skip evaluation runs — after a few sessions, lastSuccessfulExecution would
// always be the compiled eval workflow, not the user's graph.
async function loadFallbackUserExecution() {
	try {
		fallbackUserExecution.value = await fetchLatestUserExecution();
	} catch {
		fallbackUserExecution.value = null;
	}
}

// Seed the form inputs from the resolved execution shape, preserving user edits.
// A "start from scratch" case still resolves its field shape from the run but
// keeps values blank, so skip value-seeding while its prefill flag is off.
watch(
	sliceInputs,
	({ values, fieldNames }) => {
		if (fieldNames.length === 0) return;
		if (!wizardStore.prefillInputsFromExecution) return;
		wizardStore.seedInputs(values);
	},
	{ immediate: true },
);

// True once the workflow has a usable successful execution to seed inputs from.
const hasRun = computed(() => sliceInputs.value.hasExecution);
// A configured workflow (hydrated dataset, a pinned run, or any prior run) is
// past the first-run gate — never re-block it.
const hasConfig = computed(() => {
	if (wizardStore.datasetInputsByRow.length > 0) return true;
	if (wizardStore.activeRunId !== null) return true;
	const workflowId = workflowDocumentStore.value?.workflowId;
	return Boolean(workflowId && (evaluationStore.testRunsByWorkflowId[workflowId]?.length ?? 0) > 0);
});

const showGate = computed(() => probeComplete.value && !hasRun.value && !hasConfig.value);
const showProbeLoading = computed(() => !hasRun.value && !probeComplete.value && !hasConfig.value);

const { hydrate } = useWizardHydration();
const { createFromExecution } = useCreateCaseFromExecution();

// Local mirror of n8n-core PLACEHOLDER_EMPTY_WORKFLOW_ID (frontend can't import n8n-core).
const NEW_WORKFLOW_ID = '__EMPTY__';
// Hydrate the latest persisted config on open; reset + re-hydrate on a genuine
// workflow switch so prior-workflow selections don't leak into the new pane.
watch(
	() => [wizardStore.isOpen, workflowDocumentStore.value?.workflowId] as const,
	async ([isOpen]) => {
		const id = workflowDocumentStore.value?.workflowId;
		const prevId = wizardStore.lastWorkflowId;
		// Reset only on a genuine switch between saved workflows. Skip the
		// new→saved id transition so in-progress selections aren't wiped on save.
		if (prevId && prevId !== NEW_WORKFLOW_ID && id && id !== prevId) {
			wizardStore.reset();
		}
		if (id) wizardStore.setLastWorkflowId(id);
		// Wait for the workflow id before hydrating/seeding: hydrate no-ops without
		// it, and consuming the pending seed too early (before the config's node is
		// loaded) lets a later hydrate clobber the seeded case with row 0.
		if (!isOpen || !id) return;
		await hydrate();
		// Apply a seed handed off from another view (e.g. the executions page).
		// Done after hydrate so the config's node is known for answer extraction.
		const pending = wizardStore.pendingSeedExecution;
		if (pending) {
			createFromExecution(pending);
			wizardStore.setPendingSeedExecution(null);
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.panel" data-test-id="tests-panel">
		<div v-if="showAddNode" :class="$style.gate" data-test-id="tests-panel-add-node">
			<N8nText size="large" color="text-dark" :class="$style.gateMessage">
				{{ locale.baseText('evaluations.tests.empty.noNode') }}
			</N8nText>
			<N8nButton
				size="small"
				type="primary"
				data-test-id="tests-panel-add-node-button"
				@click="openNodeCreator"
			>
				{{ locale.baseText('evaluations.tests.empty.noNode.button') }}
			</N8nButton>
		</div>

		<div v-else-if="showProbeLoading" :class="$style.gate" data-test-id="tests-panel-probe-loading">
			<N8nIcon icon="spinner" size="medium" :spin="true" />
		</div>

		<div v-else-if="showGate" :class="$style.gate" data-test-id="tests-panel-gate">
			<N8nText size="large" color="text-dark" :class="$style.gateMessage">
				{{ locale.baseText('evaluations.tests.empty.noExecutions') }}
			</N8nText>
			<N8nActionDropdown
				v-if="showTriggerPicker"
				:items="triggerMenuItems"
				placement="bottom"
				data-test-id="tests-panel-choose-trigger"
				@select="onTriggerSelect"
			>
				<template #activator>
					<N8nButton size="small" type="primary">
						{{ locale.baseText('evaluations.tests.empty.chooseTrigger') }}
						<N8nIcon icon="chevron-down" size="small" />
					</N8nButton>
				</template>
			</N8nActionDropdown>
			<N8nButton
				v-else
				size="small"
				type="primary"
				data-test-id="tests-panel-gate-run"
				@click="runWorkflow"
			>
				{{ locale.baseText('evaluations.tests.empty.execute') }}
			</N8nButton>
		</div>

		<template v-else>
			<TestCaseDetail v-if="viewMode === 'detail'" />
			<TestCaseList v-else-if="viewMode === 'create'" />
			<TestCaseResults v-else />
		</template>
	</div>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	background-color: var(--background--surface);
	overflow: hidden;
}

.gate {
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--xl) var(--spacing--md);
	text-align: center;
}

.gateMessage {
	max-width: 300px;
	line-height: 1.4;
}
</style>
