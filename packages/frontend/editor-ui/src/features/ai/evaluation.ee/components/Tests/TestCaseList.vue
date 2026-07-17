<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ExecutionSummary } from 'n8n-workflow';

import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useToast } from '@/app/composables/useToast';
import { useCreateCaseFromExecution } from '../../composables/useCreateCaseFromExecution';
import { useUserExecutions } from '../../composables/useUserExecutions';
import ExecutionRow from './ExecutionRow.vue';

const MAX_EXECUTION_CANDIDATES = 20;

const locale = useI18n();
const wizardStore = useEvaluationsWizardSidepanelStore();
const toast = useToast();
const { createFromExecutionId, createManualCase } = useCreateCaseFromExecution();
const { fetchUserExecutionCandidates } = useUserExecutions();

// ─── Executions to base a test case on ───────────────────────────────────────

const executionCandidates = ref<ExecutionSummary[]>([]);

async function fetchExecutionCandidates() {
	try {
		executionCandidates.value = await fetchUserExecutionCandidates(MAX_EXECUTION_CANDIDATES);
	} catch (error) {
		console.warn('[TestCaseList] failed to load execution candidates', error);
	}
}

onMounted(() => {
	void fetchExecutionCandidates();
});

async function handleCreateFromExecution(summary: ExecutionSummary) {
	try {
		await createFromExecutionId(summary.id);
	} catch (error) {
		toast.showError(error, locale.baseText('evaluations.tests.seedFromExecution.error'));
	}
}

async function handleCreateManual() {
	try {
		await createManualCase();
	} catch (error) {
		toast.showError(error, locale.baseText('evaluations.tests.seedFromExecution.error'));
	}
}
</script>

<template>
	<div :class="$style.container" data-test-id="tests-list">
		<!-- Breadcrumb -->
		<div :class="$style.breadcrumb">
			<button
				type="button"
				:class="$style.breadcrumbRoot"
				data-test-id="tests-list-breadcrumb-root"
				@click="wizardStore.openList()"
			>
				<N8nText size="small" color="text-base">
					{{ locale.baseText('setupPanel.tabs.evaluations') }}
				</N8nText>
			</button>
			<N8nText size="small" color="text-light">/</N8nText>
			<N8nText size="small" color="text-dark" bold>
				{{ locale.baseText('evaluations.tests.newCase.title') }}
			</N8nText>
		</div>

		<!-- The node under test is already chosen on the entry page. -->
		<div :class="$style.controls">
			<N8nText size="small" color="text-dark">
				{{ locale.baseText('evaluations.tests.chooseExecution') }}
			</N8nText>
		</div>

		<!-- Executions -->
		<div v-if="executionCandidates.length > 0" data-test-id="tests-list-executions">
			<ExecutionRow
				v-for="(execution, i) in executionCandidates"
				:key="execution.id"
				:execution="execution"
				:alt="i % 2 === 0"
				@create="handleCreateFromExecution(execution)"
			/>
		</div>

		<div v-else :class="$style.empty">
			<N8nText size="small" color="text-light">
				{{ locale.baseText('evaluations.tests.executions.empty') }}
			</N8nText>
		</div>

		<!-- Manual creation: secondary path (starts a blank case, no prefill) -->
		<div :class="$style.manual">
			<N8nText size="small" color="text-light">
				{{ locale.baseText('evaluations.tests.createManually.hint') }}
			</N8nText>
			<N8nButton
				variant="outline"
				size="xsmall"
				data-test-id="tests-list-create-manual"
				@click="handleCreateManual"
			>
				{{ locale.baseText('evaluations.tests.createManually') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	overflow-y: auto;
}

.breadcrumb {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--md);
}

.breadcrumbRoot {
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;

	&:hover :global(.n8n-text) {
		text-decoration: underline;
	}
}

.controls {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: 0 var(--spacing--md) var(--spacing--md);
}

.empty {
	padding: var(--spacing--md);
	text-align: center;
}

.manual {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--md);
	border-top: var(--border);
}
</style>
