<script setup lang="ts">
import type { MetricScale } from '@n8n/api-types';
import { N8nTabs, N8nText } from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import type { CompareCaseRow } from '../../composables/useCompareCases';
import type { CompareMetricGroup, CompareVersion } from '../../composables/useCompareData';
import { deriveRunsStatus } from '../../evaluation.utils';
import CasesTable from './CasesTable.vue';
import OutputsTab from './OutputsTab.vue';
import MetricsTab from './MetricsTab.vue';
import WorkflowDiffTab from './WorkflowDiffTab.vue';

const props = defineProps<{
	versions: CompareVersion[];
	metricGroups: CompareMetricGroup[];
	caseRows: CompareCaseRow[];
	casesLoading: boolean;
	casesError?: boolean;
	workflowId: string;
	// metric name → its custom LLM-judge prompt, when configured.
	metricPrompts?: Record<string, string>;
	// metric name → scale, so OutputsTab can normalize raw values before display.
	metricScales?: Record<string, MetricScale>;
}>();

const i18n = useI18n();

type TabValue = 'cases' | 'outputs' | 'metrics' | 'workflowDiff';

const activeTab = ref<TabValue>('cases');
const selectedCaseIndex = ref(0);

const tabs = computed<Array<TabOptions<TabValue>>>(() => [
	{ value: 'cases', label: i18n.baseText('evaluation.compare.tabs.cases') },
	{ value: 'outputs', label: i18n.baseText('evaluation.compare.tabs.outputs') },
	{ value: 'metrics', label: i18n.baseText('evaluation.compare.tabs.metrics') },
	{ value: 'workflowDiff', label: i18n.baseText('evaluation.compare.tabs.workflowDiff') },
]);

const hasCases = computed(() => props.caseRows.length > 0);

// Scores stream in while runs execute; used to flag the partially-filled table as in-progress.
const isRunning = computed(() => deriveRunsStatus(props.versions) === 'running');

// A case row drills into its side-by-side outputs rather than a separate drawer.
function onDrilldown(caseIndex: number) {
	selectedCaseIndex.value = caseIndex;
	activeTab.value = 'outputs';
}
</script>

<template>
	<section :class="$style.tabs" data-test-id="compare-tabs">
		<N8nTabs v-model="activeTab" :options="tabs" />

		<N8nText v-if="casesError" size="xsmall" color="danger" data-test-id="compare-cases-error">
			{{ i18n.baseText('evaluation.compare.cases.loadError') }}
		</N8nText>

		<div :class="$style.panel">
			<template v-if="activeTab === 'cases'">
				<!-- Gate on loading first: per-version fetches resolve independently, so
				     rendering mid-load flashes partial rows and a false dataset mismatch. -->
				<N8nText v-if="casesLoading" size="small" color="text-light">
					{{ i18n.baseText('evaluation.compare.cases.loading') }}
				</N8nText>
				<N8nText v-else-if="!hasCases" size="small" color="text-light">
					{{ i18n.baseText('evaluation.compare.cases.empty') }}
				</N8nText>
				<template v-else>
					<N8nText
						v-if="isRunning"
						size="xsmall"
						color="text-light"
						:class="$style.runningNote"
						data-test-id="compare-cases-running"
					>
						{{ i18n.baseText('evaluation.compare.cases.running') }}
					</N8nText>
					<CasesTable
						:versions="versions"
						:case-rows="caseRows"
						:is-running="isRunning"
						@drilldown="onDrilldown"
					/>
				</template>
			</template>

			<template v-else-if="activeTab === 'outputs'">
				<N8nText v-if="casesLoading" size="small" color="text-light">
					{{ i18n.baseText('evaluation.compare.cases.loading') }}
				</N8nText>
				<OutputsTab
					v-else
					:versions="versions"
					:case-rows="caseRows"
					:selected-index="selectedCaseIndex"
					:workflow-id="workflowId"
					:metric-scales="metricScales"
					@update:selected-index="selectedCaseIndex = $event"
				/>
			</template>

			<MetricsTab
				v-else-if="activeTab === 'metrics'"
				:versions="versions"
				:metric-groups="metricGroups"
				:metric-prompts="metricPrompts"
			/>

			<WorkflowDiffTab v-else :versions="versions" :workflow-id="workflowId" />
		</div>
	</section>
</template>

<style module lang="scss">
.tabs {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.panel {
	min-height: 120px;
}

.runningNote {
	display: block;
	margin-bottom: var(--spacing--2xs);
}
</style>
