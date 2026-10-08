<script setup lang="ts">
import {
	N8nCallout,
	N8nCodeBlock,
	N8nIcon,
	N8nLink,
	N8nLoading,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import { computed, onMounted, ref } from 'vue';

import type { IterationDetail, IterationSummary, ViewerIndex } from '../../schema';
import { loadIteration } from '../data';
import type { IterationTab, Selection } from '../selection';
import IterationHeader from './IterationHeader.vue';
import ScenarioVerdict from './ScenarioVerdict.vue';
import SunburstPanel from './SunburstPanel.vue';
import TimelinePanel from './TimelinePanel.vue';
import ToolDonut, { type ToolMode } from './ToolDonut.vue';
import TracePanel from './TracePanel.vue';
import TranscriptPanel from './TranscriptPanel.vue';

const props = defineProps<{ index: ViewerIndex; iteration: IterationSummary; tab: IterationTab }>();
const emit = defineEmits<{ select: [selection: Selection] }>();

const detail = ref<IterationDetail>();
const loadError = ref<string>();
const focus = ref<string | null>(null);

const tabs: Array<{ value: IterationTab; label: string }> = [
	{ value: 'transcript', label: 'Transcript' },
	{ value: 'trace', label: 'Trace' },
	{ value: 'timeline', label: 'Timeline' },
	{ value: 'sunburst', label: 'Sunburst' },
	{ value: 'tools', label: 'Tools' },
	{ value: 'scenarios', label: 'Scenarios' },
	{ value: 'workflow', label: 'Workflow' },
];
const DONUT_MODES: ToolMode[] = ['calls', 'time', 'tokens'];

const armName = computed(() => props.index.arms[props.iteration.arm]?.name ?? '');
const workflowJson = computed(() =>
	detail.value?.workflow ? JSON.stringify(detail.value.workflow, null, 2) : null,
);

function selectTab(tab: IterationTab) {
	emit('select', { kind: 'iteration', id: props.iteration.id, tab });
}

function openItem(item: string) {
	focus.value = item;
	selectTab('transcript');
}

onMounted(async () => {
	try {
		detail.value = await loadIteration(props.iteration.id);
	} catch (error) {
		loadError.value = error instanceof Error ? error.message : String(error);
	}
});
</script>

<template>
	<div :class="$style.view" data-test-id="iteration-view">
		<IterationHeader :iteration="iteration" :arm-name="armName" />
		<div :class="$style.tabs">
			<N8nTabs :model-value="tab" :options="tabs" @update:model-value="selectTab" />
			<N8nLink
				v-if="iteration.rawDebugId"
				:to="`./raw/${encodeURIComponent(iteration.rawDebugId)}`"
				new-window
				size="small"
				title="The harness run-debug page of this sub-folder. It is large and opens slowly."
			>
				<N8nIcon icon="external-link" size="small" /> Raw LLM debug page
			</N8nLink>
		</div>
		<N8nCallout v-if="loadError" theme="danger">{{ loadError }}</N8nCallout>
		<N8nLoading v-else-if="!detail" :rows="5" />
		<template v-else>
			<TranscriptPanel v-if="tab === 'transcript'" :turns="detail.turns" :focus="focus" />
			<TracePanel v-else-if="tab === 'trace'" :turns="detail.turns" @focus="openItem" />
			<TimelinePanel v-else-if="tab === 'timeline'" :turns="detail.turns" @focus="openItem" />
			<SunburstPanel v-else-if="tab === 'sunburst'" :turns="detail.turns" @focus="openItem" />
			<div v-else-if="tab === 'tools'" :class="$style.donuts" data-test-id="tools-panel">
				<ToolDonut
					v-for="mode in DONUT_MODES"
					:key="mode"
					:stats="iteration.toolStats"
					:mode="mode"
					:title="
						mode === 'calls' ? 'Calls' : mode === 'time' ? 'Time (derived)' : 'Tokens (derived)'
					"
				/>
				<N8nText size="xsmall" color="text-light" :class="$style.note">
					Time: a tool gets the gap between the model step that called it and the next model step,
					split evenly between the calls of one step; model generation is its own slice. Tokens: a
					tool gets the tokens of the model step that called it, split the same way. The harness
					records no tool execution time (performance.toolExecutionMs is empty).
				</N8nText>
			</div>
			<div v-else-if="tab === 'scenarios'" :class="$style.list" data-test-id="scenarios-panel">
				<N8nText v-if="iteration.scenarios.length === 0" color="text-light">
					This case has no scenarios (build only).
				</N8nText>
				<ScenarioVerdict
					v-for="(run, scenarioIndex) in iteration.scenarios"
					:key="scenarioIndex"
					:run="run"
					:detailed="false"
					@open="emit('select', { kind: 'scenario', id: iteration.id, scenario: scenarioIndex })"
				/>
				<template v-if="iteration.expectations.length > 0">
					<N8nText bold>Build expectations</N8nText>
					<div v-for="(entry, i) in iteration.expectations" :key="i" :class="$style.expectation">
						<N8nIcon
							:icon="entry.pass ? 'check' : 'x'"
							:color="entry.pass ? 'success' : 'danger'"
							size="small"
						/>
						<div>
							<N8nText tag="p" size="small">{{ entry.expectation }}</N8nText>
							<N8nText v-if="entry.reason" tag="p" size="xsmall" color="text-light">{{
								entry.reason
							}}</N8nText>
						</div>
					</div>
				</template>
			</div>
			<div v-else-if="tab === 'workflow'" data-test-id="workflow-panel">
				<N8nCodeBlock v-if="workflowJson" :code="workflowJson" language="json" :max-height="900" />
				<N8nText v-else color="text-light">No final workflow JSON in eval-rows.jsonl.</N8nText>
			</div>
		</template>
	</div>
</template>

<style module>
.view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.tabs {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.donuts {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(var(--spacing--5xl), 1fr));
	gap: var(--spacing--lg);
}

.note {
	grid-column: 1 / -1;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.expectation {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: flex-start;
}

.expectation p {
	margin: 0;
}
</style>
