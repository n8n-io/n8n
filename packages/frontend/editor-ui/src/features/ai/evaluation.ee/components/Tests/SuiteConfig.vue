<script setup lang="ts">
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useDebounceFn } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import {
	N8nActionDropdown,
	N8nButton,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';

import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useTestCasePersistence } from '../../composables/useTestCasePersistence';
import { useAiRootNodes } from '../../composables/useAiRootNodes';
import {
	CANNED_METRICS,
	cannedMetricLabelKey,
	type CannedMetricKey,
} from '../../evaluation.constants';

// Canned metrics offered in the "Add metric" menu (maps to the existing checks).
const OFFERED_METRIC_KEYS: CannedMetricKey[] = ['correctness', 'stringSimilarity', 'toolsUsed'];

const locale = useI18n();
const wizardStore = useEvaluationsWizardSidepanelStore();
const aiRootNodes = useAiRootNodes();
const { saveConfig } = useTestCasePersistence();

const { aiNodeName, selectedMetricKeys, customChecks, judgeSelectionByMetric } =
	storeToRefs(wizardStore);

const selectedCannedMetrics = computed(() =>
	CANNED_METRICS.filter((m) => selectedMetricKeys.value.includes(m.key)),
);

const addMetricItems = computed<Array<{ id: string; label: string }>>(() => {
	const items = OFFERED_METRIC_KEYS.filter((k) => !selectedMetricKeys.value.includes(k)).map(
		(k) => {
			const metric = CANNED_METRICS.find((m) => m.key === k);
			return {
				id: k as string,
				label: metric ? locale.baseText(cannedMetricLabelKey(metric)) : k,
			};
		},
	);
	items.push({ id: 'custom', label: locale.baseText('evaluations.tests.detail.addMetric.custom') });
	return items;
});

function onAddMetric(action: string) {
	if (action === 'custom') {
		wizardStore.addCustomCheck({ name: `Custom ${customChecks.value.length + 1}`, expression: '' });
		return;
	}
	wizardStore.toggleMetric(action as CannedMetricKey);
}

function removeMetric(key: CannedMetricKey) {
	if (selectedMetricKeys.value.includes(key)) wizardStore.toggleMetric(key);
}

// A pick here means "this is the node under test", so force single-node mode: a
// slice-mode-hydrated config (e.g. after the old target node was replaced) would
// otherwise ignore aiNodeName and keep re-saving the stale node.
function onSelectNode(name: string) {
	wizardStore.setAiNodeName(name);
	wizardStore.exitSliceMode();
}

// Persist suite-config edits (node + metrics) with a debounced, silent save.
const persist = useDebounceFn(
	() => void saveConfig({ silent: true }),
	getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE),
);

watch(
	[aiNodeName, selectedMetricKeys, customChecks, judgeSelectionByMetric],
	() => void persist(),
	{
		deep: true,
	},
);
</script>

<template>
	<section :class="$style.config" data-test-id="tests-suite-config">
		<!-- Node under test -->
		<div :class="$style.sentence">
			<N8nText size="small" color="text-dark">
				{{ locale.baseText('evaluations.tests.detail.when') }}
			</N8nText>
			<N8nSelect
				:model-value="aiNodeName"
				size="small"
				filterable
				:placeholder="locale.baseText('evaluations.tests.chooseAiNode.placeholder')"
				:class="$style.nodeSelect"
				data-test-id="tests-suite-config-ai-node-select"
				@update:model-value="onSelectNode"
			>
				<N8nOption
					v-for="node in aiRootNodes"
					:key="node.name"
					:label="node.name"
					:value="node.name"
				/>
			</N8nSelect>
			<N8nText size="small" color="text-dark">
				{{ locale.baseText('evaluations.tests.suite.receivesInput') }}
			</N8nText>
		</div>

		<!-- Checks (suite-level). Each canned check is a removable chip: clicking it
			(the leading × plus its label) drops the metric from the suite. -->
		<div :class="$style.checks">
			<N8nButton
				v-for="metric in selectedCannedMetrics"
				:key="metric.key"
				variant="subtle"
				size="small"
				icon="x"
				:aria-label="locale.baseText('evaluations.tests.detail.removeMetric')"
				:data-test-id="`tests-suite-config-metric-${metric.key}`"
				@click="removeMetric(metric.key)"
			>
				{{ locale.baseText(cannedMetricLabelKey(metric)) }}
			</N8nButton>

			<!-- Custom checks: editable expression -->
			<div
				v-for="check in customChecks"
				:key="check.id"
				:class="$style.customRow"
				:data-test-id="`tests-suite-config-custom-${check.id}`"
			>
				<N8nInput
					:model-value="check.expression"
					type="text"
					size="small"
					:class="$style.expressionInput"
					:placeholder="locale.baseText('evaluations.tests.metric.custom.placeholder')"
					@update:model-value="wizardStore.updateCustomCheck(check.id, { expression: $event })"
				/>
				<N8nButton
					variant="ghost"
					size="small"
					icon-only
					icon="x"
					:aria-label="locale.baseText('evaluations.tests.detail.removeMetric')"
					:data-test-id="`tests-suite-config-custom-remove-${check.id}`"
					@click="wizardStore.removeCustomCheck(check.id)"
				/>
			</div>

			<N8nActionDropdown
				:items="addMetricItems"
				placement="bottom-start"
				data-test-id="tests-suite-config-add-metric"
				@select="onAddMetric"
			>
				<template #activator>
					<N8nButton variant="ghost" size="small" icon="plus">
						{{ locale.baseText('evaluations.tests.detail.addMetric') }}
					</N8nButton>
				</template>
			</N8nActionDropdown>
		</div>
	</section>
</template>

<style module lang="scss">
.config {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
}

.sentence {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.nodeSelect {
	width: auto;
	min-width: 140px;
}

.checks {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.customRow {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 220px;
}

.expressionInput {
	flex: 1 1 auto;

	:global(.el-input__inner),
	:global(input) {
		font-family: var(--font-family--monospace, monospace);
	}
}
</style>
