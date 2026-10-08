<script setup lang="ts">
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nLink,
	N8nLoading2,
	N8nSegmentControl,
	N8nSelect2,
	N8nText,
	type SegmentOption,
	type SelectOptionBase,
	type SelectValue,
} from '@n8n/design-system';
import { computed, ref, watch } from 'vue';

import { iterationPassed } from '../../metrics';
import type { IterationDetail, IterationSummary, ViewerIndex } from '../../schema';
import { armColorVar } from '../colors';
import { loadIteration } from '../data';
import { countVariant, formatCost, formatSeconds } from '../format';
import type { CompareTab } from '../selection';
import { buildTrace } from '../trace';
import AttemptOutcome from './AttemptOutcome.vue';
import TracePanel from './TracePanel.vue';
import TranscriptPanel from './TranscriptPanel.vue';

/** Two attempts side by side. Both columns pick from all attempts of the case. */
const props = defineProps<{
	index: ViewerIndex;
	attempts: IterationSummary[];
	/** The typical attempt of each arm, marked in the pickers. */
	typicalIds: string[];
}>();
const ids = defineModel<Array<string | undefined>>('ids', { required: true });
const tab = defineModel<CompareTab>('tab', { required: true });

const COLUMN_NAMES = ['A', 'B'];
const tabs: Array<SegmentOption<CompareTab>> = [
	{ value: 'trace', label: 'Trace' },
	{ value: 'outcome', label: 'Outcome' },
	{ value: 'transcript', label: 'Transcript' },
	{ value: 'workflow', label: 'Workflow' },
];

const entries = computed(() =>
	ids.value.map((id) => props.attempts.find((entry) => entry.id === id)),
);

const armName = (entry: IterationSummary) => props.index.arms[entry.arm]?.name ?? '';
const selectItems = computed(() =>
	props.attempts.map(
		(entry): SelectOptionBase<string> => ({
			value: entry.id,
			label: [
				armName(entry),
				`attempt ${entry.index + 1}`,
				formatCost(entry.metrics?.cost),
				formatSeconds(entry.metrics?.wallSeconds),
				props.typicalIds.includes(entry.id) ? '(typical)' : null,
			]
				.filter(Boolean)
				.join(' · '),
		}),
	),
);
const passedById = computed(
	() => new Map(props.attempts.map((entry) => [entry.id, iterationPassed(entry)])),
);
function selectAttempt(at: number, value: SelectValue | undefined) {
	if (typeof value === 'string') ids.value = ids.value.map((id, i) => (i === at ? value : id));
}

const passCount = (entry: IterationSummary) => {
	const grades = [
		...entry.scenarios.map((run) => run.passed),
		...entry.expectations.map((expectation) => expectation.pass),
	];
	return { pass: grades.filter(Boolean).length, total: grades.length };
};

const details = ref<Record<string, IterationDetail>>({});
const errors = ref<Record<string, string>>({});
watch(
	ids,
	(next) => {
		for (const id of next) {
			if (!id || details.value[id]) continue;
			loadIteration(id)
				.then((detail) => (details.value = { ...details.value, [id]: detail }))
				.catch((error: unknown) => {
					errors.value = {
						...errors.value,
						[id]: error instanceof Error ? error.message : String(error),
					};
				});
		}
	},
	{ immediate: true },
);

/** The longest trace of the loaded columns, so both traces share one time scale. */
const durationMs = computed(() =>
	Math.max(
		0,
		...ids.value.flatMap((id) => {
			const detail = id ? details.value[id] : undefined;
			if (!detail) return [];
			const trace = buildTrace(detail.turns);
			return [trace.end - trace.start];
		}),
	),
);

const workflowJson = (id: string) => {
	const workflow = details.value[id]?.workflow;
	return workflow ? JSON.stringify(workflow, null, 2) : null;
};
const copiedId = ref<string>();
async function copyWorkflow(id: string) {
	const json = workflowJson(id);
	if (!json) return;
	await navigator.clipboard.writeText(json);
	copiedId.value = id;
	setTimeout(() => (copiedId.value = undefined), 2000);
}
</script>

<template>
	<div :class="$style.compare" data-test-id="build-compare">
		<N8nSegmentControl v-model="tab" :options="tabs" :class="$style.tabs" aria-label="View" />
		<div :class="$style.columns">
			<div v-for="(entry, at) in entries" :key="at" :class="$style.column">
				<div :class="$style.head">
					<N8nBadge variant="subtle">{{ COLUMN_NAMES[at] }}</N8nBadge>
					<N8nSelect2
						:model-value="ids[at]"
						:items="selectItems"
						:class="$style.select"
						size="small"
						placeholder="Pick an attempt"
						:aria-label="`Attempt in column ${COLUMN_NAMES[at]}`"
						data-test-id="compare-select"
						@update:model-value="selectAttempt(at, $event)"
					>
						<template #item-leading="{ item, ui }">
							<N8nIcon
								v-if="(passedById.get(String(item.value)) ?? null) !== null"
								v-bind="ui"
								:icon="passedById.get(String(item.value)) ? 'check' : 'x'"
								:color="passedById.get(String(item.value)) ? 'success' : 'danger'"
								:aria-label="passedById.get(String(item.value)) ? 'passed' : 'failed'"
								size="small"
							/>
						</template>
					</N8nSelect2>
				</div>
				<template v-if="entry">
					<div :class="$style.meta">
						<span
							:class="$style.dot"
							:style="{ backgroundColor: `var(${armColorVar(entry.arm)})` }"
						/>
						<N8nBadge :variant="countVariant(passCount(entry).pass, passCount(entry).total)">
							{{ passCount(entry).pass }}/{{ passCount(entry).total }} passed
						</N8nBadge>
						<N8nText size="small" color="text-light">
							{{ entry.built === false ? 'not built · ' : '' }}{{ entry.sub }}
						</N8nText>
						<N8nLink
							v-if="entry.rawDebugId"
							:href="`./raw/${encodeURIComponent(entry.rawDebugId)}`"
							target="_blank"
							theme="text"
							size="small"
							title="The harness run-debug page of this sub-folder. It is large and opens slowly."
						>
							Raw LLM debug page
						</N8nLink>
					</div>
					<N8nCallout v-if="entry.buildError" theme="danger">{{ entry.buildError }}</N8nCallout>
				</template>

				<N8nText v-if="!entry" color="text-light">Pick an attempt in the list.</N8nText>
				<AttemptOutcome v-else-if="tab === 'outcome'" :iteration="entry" />
				<N8nCallout v-else-if="errors[entry.id]" theme="danger">
					{{ errors[entry.id] }}
				</N8nCallout>
				<N8nLoading2 v-else-if="!details[entry.id]" :rows="5" />
				<TranscriptPanel v-else-if="tab === 'transcript'" :turns="details[entry.id].turns" />
				<TracePanel
					v-else-if="tab === 'trace'"
					:turns="details[entry.id].turns"
					:duration-ms="durationMs || undefined"
				/>
				<template v-else>
					<div v-if="workflowJson(entry.id)" :class="$style.codeWrap">
						<N8nButton
							variant="outline"
							size="small"
							:icon="copiedId === entry.id ? 'check' : 'copy'"
							:class="$style.copy"
							data-test-id="workflow-copy"
							@click="copyWorkflow(entry.id)"
						>
							{{ copiedId === entry.id ? 'Copied' : 'Copy' }}
						</N8nButton>
						<pre :class="$style.code">{{ workflowJson(entry.id) }}</pre>
					</div>
					<N8nText v-else color="text-light">No final workflow JSON in eval-rows.jsonl.</N8nText>
				</template>
			</div>
		</div>
	</div>
</template>

<style module>
.compare {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.tabs {
	align-self: flex-start;
}

.columns {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--lg);
}

.column {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-width: 0;
}

.head,
.meta {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.select {
	flex: 1;
}

.dot {
	display: inline-block;
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
}

/* Button and code share one grid cell, so the sticky button stays in view over long JSON. */
.codeWrap {
	display: grid;

	> * {
		grid-area: 1 / 1;
	}
}

.copy {
	position: sticky;
	top: var(--spacing--xs);
	z-index: 1;
	justify-self: end;
	align-self: start;
	margin: var(--spacing--xs);
}

.code {
	margin: 0;
	padding: var(--spacing--sm);
	overflow: auto;
	background-color: var(--background--subtle);
	border: var(--border);
	border-radius: var(--radius--xs);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
}
</style>
