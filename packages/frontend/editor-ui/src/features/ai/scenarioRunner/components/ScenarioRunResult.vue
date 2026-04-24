<script setup lang="ts">
import type { InstanceAiEvalExecutionResult, InstanceAiEvalNodeResult } from '@n8n/api-types';
import { N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import ScenarioNodeResult from './ScenarioNodeResult.vue';

const props = defineProps<{
	result: InstanceAiEvalExecutionResult;
	durationMs?: number | null;
	/** When true, hide sections that won't have data for historical runs
	 *  (e.g. intercepted requests aren't persisted beyond the originating session). */
	degraded?: boolean;
}>();

const i18n = useI18n();

const orderedNodeResults = computed(() =>
	Object.entries(props.result.nodeResults)
		.map(([name, result]) => ({ name, result: result as InstanceAiEvalNodeResult }))
		.sort((a, b) => (a.result.startTime ?? 0) - (b.result.startTime ?? 0)),
);

const warnings = computed(() => props.result.hints?.warnings ?? []);
const errors = computed(() => props.result.errors ?? []);

const nodesWithConfigIssues = computed(() =>
	orderedNodeResults.value.filter(
		({ result }) => result.configIssues && Object.keys(result.configIssues).length > 0,
	),
);

const mockedCallCount = computed(() =>
	orderedNodeResults.value.reduce(
		(total, { result }) => total + (result.interceptedRequests?.length ?? 0),
		0,
	),
);

const issueCount = computed(
	() => warnings.value.length + errors.value.length + nodesWithConfigIssues.value.length,
);

type VerdictKind = 'passed' | 'passedWithIssues' | 'failed';

const verdictKind = computed<VerdictKind>(() => {
	if (!props.result.success || errors.value.length > 0) return 'failed';
	if (issueCount.value > 0) return 'passedWithIssues';
	return 'passed';
});

const verdictIcon = computed<IconName>(() => {
	switch (verdictKind.value) {
		case 'passed':
			return 'circle-check';
		case 'passedWithIssues':
			return 'triangle-alert';
		case 'failed':
			return 'circle-x';
	}
});

const verdictColor = computed<'success' | 'warning' | 'danger'>(() => {
	switch (verdictKind.value) {
		case 'passed':
			return 'success';
		case 'passedWithIssues':
			return 'warning';
		case 'failed':
			return 'danger';
	}
});

const verdictLabel = computed(() => i18n.baseText(`scenarioRunner.verdict.${verdictKind.value}`));
</script>

<template>
	<div :class="$style.wrapper">
		<section :class="[$style.verdict, $style[`verdict_${verdictKind}`]]">
			<N8nIcon :icon="verdictIcon" :color="verdictColor" size="medium" />
			<div :class="$style.verdictText">
				<N8nText bold size="medium" :color="verdictColor">
					{{ verdictLabel }}
				</N8nText>
				<div :class="$style.verdictStats">
					<N8nText
						v-if="durationMs !== null && durationMs !== undefined"
						size="xsmall"
						color="text-light"
						tag="span"
					>
						{{
							i18n.baseText('scenarioRunner.verdict.duration', {
								interpolate: { s: (durationMs / 1000).toFixed(1) },
							})
						}}
					</N8nText>
					<N8nText size="xsmall" color="text-xlight" tag="span">·</N8nText>
					<N8nText size="xsmall" color="text-light" tag="span">
						{{
							i18n.baseText('scenarioRunner.verdict.nodesRan', {
								interpolate: { count: orderedNodeResults.length },
							})
						}}
					</N8nText>
					<template v-if="!degraded && mockedCallCount > 0">
						<N8nText size="xsmall" color="text-xlight" tag="span">·</N8nText>
						<N8nText size="xsmall" color="text-light" tag="span">
							{{
								i18n.baseText('scenarioRunner.verdict.mockedCalls', {
									interpolate: { count: mockedCallCount },
								})
							}}
						</N8nText>
					</template>
					<template v-if="issueCount > 0">
						<N8nText size="xsmall" color="text-xlight" tag="span">·</N8nText>
						<N8nText size="xsmall" color="warning" tag="span">
							{{
								i18n.baseText('scenarioRunner.verdict.issues', {
									interpolate: { count: issueCount },
								})
							}}
						</N8nText>
					</template>
				</div>
			</div>
		</section>

		<details v-if="issueCount > 0" :class="$style.details" :open="issueCount > 0">
			<summary :class="$style.detailsSummary">
				<N8nIcon icon="chevron-right" size="small" :class="$style.detailsChevron" />
				<N8nText bold size="small" color="text-dark">
					{{ i18n.baseText('scenarioRunner.issues.header') }}
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{ i18n.baseText('scenarioRunner.issues.count', { interpolate: { count: issueCount } }) }}
				</N8nText>
			</summary>
			<div :class="$style.issuesList">
				<div v-for="(err, i) in errors" :key="`err-${i}`" :class="$style.issueRow">
					<N8nIcon icon="circle-x" color="danger" size="small" />
					<N8nText size="small" color="text-base">{{ err }}</N8nText>
				</div>
				<div v-for="(w, i) in warnings" :key="`warn-${i}`" :class="$style.issueRow">
					<N8nIcon icon="triangle-alert" color="warning" size="small" />
					<N8nText size="small" color="text-base">{{ w }}</N8nText>
				</div>
				<div
					v-for="{ name, result } in nodesWithConfigIssues"
					:key="`cfg-${name}`"
					:class="$style.issueRow"
				>
					<N8nIcon icon="triangle-alert" color="warning" size="small" />
					<div :class="$style.issueText">
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('scenarioRunner.issues.configPrefix', { interpolate: { name } }) }}
						</N8nText>
						<N8nText size="xsmall" color="text-light">
							{{ Object.keys(result.configIssues ?? {}).join(', ') }}
						</N8nText>
					</div>
				</div>
			</div>
		</details>

		<details :class="$style.details" open>
			<summary :class="$style.detailsSummary">
				<N8nIcon icon="chevron-right" size="small" :class="$style.detailsChevron" />
				<N8nText bold size="small" color="text-dark">
					{{ i18n.baseText('scenarioRunner.trace.header') }}
				</N8nText>
				<N8nText size="xsmall" color="text-light">
					{{
						i18n.baseText('scenarioRunner.trace.count', {
							interpolate: { count: orderedNodeResults.length },
						})
					}}
				</N8nText>
			</summary>
			<div :class="$style.nodesList">
				<ScenarioNodeResult
					v-for="{ name, result } in orderedNodeResults"
					:key="name"
					:node-name="name"
					:result="result"
				/>
			</div>
		</details>

		<details v-if="result.hints?.globalContext" :class="$style.details">
			<summary :class="$style.detailsSummary">
				<N8nIcon icon="chevron-right" size="small" :class="$style.detailsChevron" />
				<N8nText bold size="small" color="text-dark">
					{{ i18n.baseText('scenarioRunner.technical.header') }}
				</N8nText>
			</summary>
			<pre :class="$style.contextText">{{ result.hints.globalContext }}</pre>
		</details>

		<N8nText v-if="degraded" size="xsmall" color="text-light" :class="$style.degradedNote">
			{{ i18n.baseText('scenarios.result.degradedNote') }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.verdict {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-left-width: 3px;
}

.verdict_passed {
	border-left-color: var(--color--success);
}

.verdict_passedWithIssues {
	border-left-color: var(--color--warning);
}

.verdict_failed {
	border-left-color: var(--color--danger);
}

.verdictText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.verdictStats {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	flex-wrap: wrap;
	line-height: var(--line-height--md);
}

.details {
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background);
	overflow: hidden;

	&[open] .detailsChevron {
		transform: rotate(90deg);
	}
}

.detailsSummary {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	cursor: pointer;
	list-style: none;
	user-select: none;

	&::-webkit-details-marker {
		display: none;
	}

	&:hover {
		background-color: var(--color--background--light-2);
	}
}

.detailsChevron {
	flex-shrink: 0;
	transition: transform 0.15s ease;
}

.issuesList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--xs);
	border-top: var(--border);
}

.issueRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.issueText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.nodesList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--xs);
	border-top: var(--border);
}

.contextText {
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	margin: 0;
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--xs);
	white-space: pre-wrap;
	word-break: break-word;
	color: var(--color--text);
	border-top: var(--border);
	background-color: var(--color--background--light-2);
}

.degradedNote {
	font-style: italic;
	padding: var(--spacing--3xs) var(--spacing--xs);
}
</style>
