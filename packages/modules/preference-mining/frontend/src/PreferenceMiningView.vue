<script setup lang="ts">
import {
	preferenceMiningApproaches,
	type PreferenceMiningApproach,
	type PreferenceMiningResult,
	type PreferenceMiningMetrics,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCard,
	N8nCheckbox,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nInputNumber,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import { computed, ref, watch } from 'vue';

import PreferenceList from './PreferenceList.vue';
import { usePreferenceMining } from './usePreferenceMining';

const {
	i18n,
	projectId,
	projects,
	options,
	approaches,
	model,
	maxOutputTokens,
	minimumWorkflows,
	minimumShare,
	minimumMargin,
	run,
	loading,
	starting,
	error,
	query,
	folderId,
	contexts,
	preview,
	recalling,
	running,
	labels,
	statuses,
	typeNames,
	changeProject,
	start,
	cancel,
	recall,
} = usePreferenceMining();
const advanced = ref(false);
const filters = ref(false);
const section = ref<'preferences' | 'recall' | 'details'>('preferences');
const selectedApproach = ref<PreferenceMiningApproach>('nodes');
const busy = computed(() => running.value || starting.value);
const needsModel = computed(() =>
	approaches.value.some((a) => ['workflows', 'threads', 'combined'].includes(a)),
);
const canRun = computed(
	() =>
		!loading.value &&
		!!projectId.value &&
		approaches.value.length > 0 &&
		(!needsModel.value || options.value.assistant.available),
);
const selectedResult = computed(
	() =>
		run.value?.results.find((r) => r.approach === selectedApproach.value) ?? run.value?.results[0],
);
const selectedPreview = computed(() =>
	preview.value.find((r) => r.approach === selectedResult.value?.approach),
);
const tabOptions = computed(() => [
	{ value: 'preferences' as const, label: i18n.baseText('preferenceMining.tabs.preferences') },
	{
		value: 'recall' as const,
		label: i18n.baseText('preferenceMining.tabs.recall'),
		disabled: busy.value,
	},
	{ value: 'details' as const, label: i18n.baseText('preferenceMining.tabs.details') },
]);
const descriptions = computed<Record<PreferenceMiningApproach, string>>(() => ({
	baseline: i18n.baseText('preferenceMining.description.baseline'),
	nodes: i18n.baseText('preferenceMining.description.nodes'),
	credentials: i18n.baseText('preferenceMining.description.credentials'),
	workflows: i18n.baseText('preferenceMining.description.workflows'),
	threads: i18n.baseText('preferenceMining.description.threads'),
	combined: i18n.baseText('preferenceMining.description.combined'),
}));
const sharePercent = computed({
	get: () => Math.round(minimumShare.value * 100),
	set: (n: number) => {
		minimumShare.value = n / 100;
	},
});
const marginPercent = computed({
	get: () => Math.round(minimumMargin.value * 100),
	set: (n: number) => {
		minimumMargin.value = n / 100;
	},
});
const categories = computed<Record<string, string>>(() => ({
	'team-notifications': i18n.baseText('preferenceMining.context.notifications'),
	'issue-tracking': i18n.baseText('preferenceMining.context.issues'),
	'chat-model-provider': i18n.baseText('preferenceMining.context.models'),
	project: i18n.baseText('preferenceMining.projectScope'),
}));
function contextLabel(context: string) {
	return typeNames.value[context] ?? categories.value[context] ?? context;
}
function toggleApproach(approach: PreferenceMiningApproach, selected: boolean) {
	if (selected && approach === 'combined') {
		approaches.value = [...preferenceMiningApproaches];
		return;
	}
	const next = new Set(approaches.value);
	if (selected) next.add(approach);
	else {
		next.delete(approach);
		if (['nodes', 'credentials', 'workflows', 'threads'].includes(approach))
			next.delete('combined');
	}
	approaches.value = preferenceMiningApproaches.filter((a) => next.has(a));
}
function statusVariant(status: PreferenceMiningResult['status']) {
	return status === 'complete' ? 'success' : status === 'failed' ? 'danger' : 'warning';
}
function formatCost(value: number | null | undefined) {
	return value === null || value === undefined
		? i18n.baseText('preferenceMining.unknownCost')
		: new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
				maximumFractionDigits: 6,
			}).format(value);
}
function cost(metrics: PreferenceMiningMetrics) {
	return metrics.estimatedCost === null && (metrics.knownCost ?? 0) > 0
		? i18n.baseText('preferenceMining.partialCost', {
				interpolate: { cost: formatCost(metrics.knownCost) },
			})
		: formatCost(metrics.estimatedCost);
}

function emptyDescription(result: PreferenceMiningResult) {
	if (result.status !== 'complete') return i18n.baseText('preferenceMining.emptyUnavailable');
	if (result.approach === 'baseline') return descriptions.value.baseline;
	return i18n.baseText('preferenceMining.emptySupported');
}
watch(
	() => run.value?.id,
	() => {
		section.value = 'preferences';
		selectedApproach.value = 'nodes';
	},
);
watch(
	[query, folderId, contexts],
	() => {
		preview.value = [];
	},
	{ deep: true },
);
</script>

<template>
	<main :class="$style.page" data-test-id="preference-mining">
		<div :class="$style.container">
			<header :class="$style.header">
				<div :class="$style.title">
					<div :class="$style.titleRow">
						<N8nHeading tag="h1" size="xlarge">{{
							i18n.baseText('preferenceMining.title')
						}}</N8nHeading
						><N8nBadge variant="subtle">{{ i18n.baseText('preferenceMining.spike') }}</N8nBadge>
					</div>
					<N8nText color="text-light">{{ i18n.baseText('preferenceMining.subtitle') }}</N8nText>
				</div>
				<N8nInputLabel
					:class="$style.project"
					:label="i18n.baseText('preferenceMining.project')"
					input-name="mining-project"
				>
					<N8nSelect
						id="mining-project"
						:model-value="projectId"
						:disabled="busy"
						filterable
						:aria-label="i18n.baseText('preferenceMining.project')"
						data-test-id="preference-mining-project"
						@update:model-value="changeProject"
						><N8nOption
							v-for="project in projects"
							:key="project.id"
							:value="project.id"
							:label="project.name"
					/></N8nSelect>
				</N8nInputLabel>
			</header>
			<N8nNotice v-if="error" theme="danger" :content="error" />
			<div :class="$style.layout">
				<aside>
					<N8nCard :class="$style.setup">
						<div :class="$style.stack">
							<div :class="$style.sectionHeading">
								<N8nHeading tag="h2" size="medium">{{
									i18n.baseText('preferenceMining.configure')
								}}</N8nHeading
								><N8nText size="small" color="text-light">{{
									i18n.baseText('preferenceMining.configureHint')
								}}</N8nText>
							</div>
							<div :class="$style.presets">
								<N8nButton
									variant="subtle"
									size="small"
									:disabled="busy"
									@click="approaches = ['nodes', 'credentials']"
									>{{ i18n.baseText('preferenceMining.usageOnly') }}</N8nButton
								><N8nButton
									variant="ghost"
									size="small"
									:disabled="busy"
									@click="approaches = [...preferenceMiningApproaches]"
									>{{ i18n.baseText('preferenceMining.selectAll') }}</N8nButton
								>
							</div>
							<div :class="$style.approaches">
								<div
									v-for="approach in preferenceMiningApproaches"
									:key="approach"
									:class="$style.approachOption"
								>
									<N8nCheckbox
										:model-value="approaches.includes(approach)"
										:disabled="busy"
										:aria-label="labels[approach]"
										@update:model-value="toggleApproach(approach, $event)"
									>
										<template #label
											><span :class="$style.choice"
												><N8nText bold>{{ labels[approach] }}</N8nText
												><N8nText size="small" color="text-light">{{
													descriptions[approach]
												}}</N8nText></span
											></template
										>
									</N8nCheckbox>
								</div>
							</div>
							<div v-if="needsModel" :class="[$style.stack, $style.divider]">
								<N8nHeading tag="h3" size="small">{{
									i18n.baseText('preferenceMining.agentConnection')
								}}</N8nHeading>
								<N8nText v-if="options.assistant.model" bold>{{ options.assistant.model }}</N8nText>
								<N8nInputLabel
									:label="i18n.baseText('preferenceMining.runModel')"
									input-name="mining-model"
								>
									<N8nSelect
										id="mining-model"
										v-model="model"
										:disabled="busy"
										:aria-label="i18n.baseText('preferenceMining.runModel')"
									>
										<N8nOption
											value="assistant"
											:label="i18n.baseText('preferenceMining.assistantModel')"
										/>
										<N8nOption
											value="claude-sonnet-5"
											:label="i18n.baseText('preferenceMining.sonnetModel')"
										/>
									</N8nSelect>
								</N8nInputLabel>
								<N8nText size="small" color="text-light">{{
									i18n.baseText('preferenceMining.modelHint')
								}}</N8nText>
								<N8nNotice
									v-if="!loading && !options.assistant.available"
									:content="i18n.baseText('preferenceMining.assistantUnavailable')"
								/>
							</div>
							<div :class="$style.divider">
								<N8nButton
									variant="ghost"
									size="small"
									:aria-expanded="advanced"
									aria-controls="mining-advanced"
									@click="advanced = !advanced"
									><N8nIcon :icon="advanced ? 'chevron-up' : 'chevron-down'" size="small" />{{
										i18n.baseText('preferenceMining.advanced')
									}}</N8nButton
								>
								<div v-if="advanced" id="mining-advanced" :class="[$style.stack, $style.advanced]">
									<N8nInputLabel
										v-if="needsModel"
										:label="i18n.baseText('preferenceMining.maxOutputTokens')"
										input-name="mining-output-tokens"
									>
										<N8nInputNumber
											id="mining-output-tokens"
											v-model="maxOutputTokens"
											:min="1024"
											:max="16384"
											:step="1024"
											:disabled="busy"
										/>
									</N8nInputLabel>
									<N8nText size="small" color="text-light">{{
										i18n.baseText('preferenceMining.thresholdHint')
									}}</N8nText>
									<N8nInputLabel
										:label="i18n.baseText('preferenceMining.support')"
										input-name="mining-support"
										><N8nInputNumber
											id="mining-support"
											v-model="minimumWorkflows"
											:min="1"
											:max="100"
											:disabled="busy"
									/></N8nInputLabel>
									<N8nInputLabel
										:label="i18n.baseText('preferenceMining.share')"
										input-name="mining-share"
										><N8nInputNumber
											id="mining-share"
											v-model="sharePercent"
											:min="50"
											:max="100"
											:step="5"
											:disabled="busy"
									/></N8nInputLabel>
									<N8nInputLabel
										:label="i18n.baseText('preferenceMining.margin')"
										input-name="mining-margin"
										><N8nInputNumber
											id="mining-margin"
											v-model="marginPercent"
											:min="0"
											:max="100"
											:step="5"
											:disabled="busy"
									/></N8nInputLabel>
								</div>
							</div>
							<div :class="$style.runActions">
								<N8nButton
									:disabled="!canRun || busy"
									:loading="busy"
									data-test-id="preference-mining-run"
									@click="start"
									><N8nIcon icon="play" size="small" />{{
										i18n.baseText('preferenceMining.run')
									}}</N8nButton
								><N8nButton v-if="running" variant="outline" @click="cancel">{{
									i18n.baseText('preferenceMining.cancel')
								}}</N8nButton>
							</div>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('preferenceMining.scopeHint')
							}}</N8nText>
						</div>
					</N8nCard>
				</aside>
				<section :class="$style.workspace" :aria-label="i18n.baseText('preferenceMining.compare')">
					<N8nCard v-if="!run" :class="$style.emptyCard">
						<N8nEmptyState
							:icon="{ type: 'icon', value: 'flask-conical' }"
							:heading="i18n.baseText('preferenceMining.ready')"
							:description="i18n.baseText('preferenceMining.readyHint')"
						/>
						<div :class="$style.emptySteps">
							<div v-for="(key, index) in ['choose', 'compare', 'inspect'] as const" :key="key">
								<N8nBadge variant="subtle">{{ index + 1 }}</N8nBadge
								><N8nText size="small">{{ i18n.baseText(`preferenceMining.step.${key}`) }}</N8nText>
							</div>
						</div>
					</N8nCard>
					<template v-else>
						<header :class="$style.resultHeader">
							<N8nHeading tag="h2" size="large">{{
								i18n.baseText('preferenceMining.compare')
							}}</N8nHeading
							><N8nBadge
								:variant="
									run.status === 'complete'
										? 'success'
										: run.status === 'failed'
											? 'danger'
											: 'subtle'
								"
								>{{ statuses[run.status] }}</N8nBadge
							>
						</header>
						<N8nText v-if="running" aria-live="polite" color="text-light">{{ run.stage }}</N8nText>
						<div v-if="run.sources" :class="$style.sources">
							<span
								><strong>{{ run.sources.workflows }}</strong>
								{{ i18n.baseText('preferenceMining.sourceWorkflows').toLowerCase() }}</span
							><span
								><strong>{{ run.sources.credentials }}</strong>
								{{ i18n.baseText('preferenceMining.sourceCredentials').toLowerCase() }}</span
							><span
								><strong>{{ run.sources.threads }}</strong>
								{{ i18n.baseText('preferenceMining.sourceThreads').toLowerCase() }}</span
							>
						</div>
						<N8nNotice
							v-if="run.sources?.warnings.length"
							:content="i18n.baseText('preferenceMining.limitedSources')"
						/>
						<div
							v-if="run.results.length"
							:class="$style.resultGrid"
							:aria-label="i18n.baseText('preferenceMining.approaches')"
						>
							<button
								v-for="result in run.results"
								:key="result.approach"
								type="button"
								:class="[
									$style.resultButton,
									{ [$style.selected]: selectedResult?.approach === result.approach },
								]"
								:aria-pressed="selectedResult?.approach === result.approach"
								@click="selectedApproach = result.approach"
							>
								<N8nCard :class="$style.resultCard"
									><div :class="$style.methodTitle">
										<N8nText bold>{{ labels[result.approach] }}</N8nText
										><N8nIcon
											v-if="selectedResult?.approach === result.approach"
											icon="check"
											size="small"
										/>
									</div>
									<div :class="$style.methodCount">
										<strong>{{ result.preferences.length }}</strong
										><N8nText size="small" color="text-light">{{
											i18n.baseText('preferenceMining.preferences').toLowerCase()
										}}</N8nText>
									</div>
									<N8nBadge :variant="statusVariant(result.status)">{{
										statuses[result.status]
									}}</N8nBadge></N8nCard
								>
							</button>
						</div>
						<N8nCard v-if="selectedResult" :class="$style.resultsPanel">
							<div :class="$style.stack">
								<N8nTabs v-model="section" :options="tabOptions" variant="modern" />
								<template v-if="section === 'preferences'">
									<div :class="$style.sectionHeading">
										<N8nHeading tag="h3" size="medium">{{
											labels[selectedResult.approach]
										}}</N8nHeading
										><N8nText size="small" color="text-light">{{
											descriptions[selectedResult.approach]
										}}</N8nText>
									</div>
									<PreferenceList
										v-if="selectedResult.preferences.length"
										:preferences="selectedResult.preferences"
										:type-names="typeNames"
										:folders="run.sources?.folders"
									/>
									<div v-else :class="$style.emptyResult">
										<N8nEmptyState
											:heading="i18n.baseText('preferenceMining.empty')"
											:description="emptyDescription(selectedResult)"
										/><N8nButton
											v-if="selectedResult.notes.length"
											variant="ghost"
											@click="section = 'details'"
											>{{ i18n.baseText('preferenceMining.viewDetails') }}</N8nButton
										>
									</div>
								</template>
								<template v-else-if="section === 'recall'">
									<div :class="$style.sectionHeading">
										<N8nHeading tag="h3" size="medium">{{
											i18n.baseText('preferenceMining.preview')
										}}</N8nHeading
										><N8nText size="small" color="text-light">{{
											i18n.baseText('preferenceMining.previewHint')
										}}</N8nText>
									</div>
									<form :class="$style.stack" @submit.prevent="recall">
										<N8nInputLabel
											:label="i18n.baseText('preferenceMining.request')"
											input-name="mining-query"
											><N8nInput
												id="mining-query"
												v-model="query"
												type="textarea"
												:rows="3"
												:placeholder="i18n.baseText('preferenceMining.query')"
												:aria-label="i18n.baseText('preferenceMining.request')"
										/></N8nInputLabel>
										<div>
											<N8nButton
												variant="ghost"
												size="small"
												:aria-expanded="filters"
												aria-controls="mining-filters"
												@click="filters = !filters"
												><N8nIcon :icon="filters ? 'chevron-up' : 'chevron-down'" size="small" />{{
													i18n.baseText('preferenceMining.recallFilters')
												}}</N8nButton
											>
										</div>
										<div v-if="filters" id="mining-filters" :class="$style.filterGrid">
											<N8nInputLabel
												:label="i18n.baseText('preferenceMining.folder')"
												input-name="mining-folder"
												><N8nSelect
													id="mining-folder"
													v-model="folderId"
													clearable
													:placeholder="i18n.baseText('preferenceMining.projectScope')"
													><N8nOption
														v-for="folder in run.sources?.folders"
														:key="folder.id"
														:value="folder.id"
														:label="folder.name" /></N8nSelect
											></N8nInputLabel>
											<N8nInputLabel
												:label="i18n.baseText('preferenceMining.contexts')"
												input-name="mining-contexts"
												><N8nSelect
													id="mining-contexts"
													v-model="contexts"
													multiple
													filterable
													collapse-tags
													collapse-tags-tooltip
													:max-collapse-tags="1"
													><N8nOption
														v-for="context in run.sources?.contexts"
														:key="context"
														:value="context"
														:label="contextLabel(context)" /></N8nSelect
											></N8nInputLabel>
										</div>
										<div>
											<N8nButton
												type="submit"
												:loading="recalling"
												:disabled="!query.trim() || !contexts.length || recalling"
												>{{ i18n.baseText('preferenceMining.recall') }}</N8nButton
											>
										</div>
									</form>
									<N8nNotice
										v-if="selectedPreview && selectedPreview.status !== 'complete'"
										theme="warning"
									>
										{{ i18n.baseText('preferenceMining.emptyUnavailable') }}
									</N8nNotice>
									<div v-else-if="selectedPreview" :class="$style.previewGrid">
										<N8nText size="small" color="text-light" :class="$style.fullWidth">{{
											i18n.baseText('preferenceMining.contextEstimateHint')
										}}</N8nText>
										<div
											v-for="mode in ['prompt', 'recall'] as const"
											:key="mode"
											:class="$style.previewColumn"
										>
											<div :class="$style.methodTitle">
												<N8nText bold>{{
													i18n.baseText(`preferenceMining.preview.${mode}`)
												}}</N8nText
												><N8nBadge variant="subtle">{{ selectedPreview[mode].length }}</N8nBadge>
											</div>
											<N8nText v-if="selectedPreview.estimates" size="small" color="text-light">
												{{
													i18n.baseText('preferenceMining.contextEstimate', {
														interpolate: {
															tokens: selectedPreview.estimates[mode].tokens.toLocaleString(),
															cost: formatCost(selectedPreview.estimates[mode].estimatedInputCost),
														},
													})
												}}
											</N8nText>
											<PreferenceList
												:preferences="selectedPreview[mode]"
												:type-names="typeNames"
												compact
											/><N8nText
												v-if="!selectedPreview[mode].length"
												color="text-light"
												size="small"
												>{{
													i18n.baseText(
														mode === 'recall'
															? 'preferenceMining.noRecalledPreferences'
															: 'preferenceMining.noRecall',
													)
												}}</N8nText
											>
										</div>
									</div>
								</template>
								<template v-else>
									<div :class="$style.sectionHeading">
										<N8nHeading tag="h3" size="medium">{{
											i18n.baseText('preferenceMining.tabs.details')
										}}</N8nHeading
										><N8nText size="small" color="text-light">{{
											i18n.baseText('preferenceMining.compareHint')
										}}</N8nText>
									</div>
									<div :class="$style.tableScroll">
										<table :class="$style.table">
											<caption>
												{{
													i18n.baseText('preferenceMining.metricsCaption')
												}}
											</caption>
											<thead>
												<tr>
													<th>{{ i18n.baseText('preferenceMining.approach') }}</th>
													<th>{{ i18n.baseText('preferenceMining.calls') }}</th>
													<th>{{ i18n.baseText('preferenceMining.tokens') }}</th>
													<th>{{ i18n.baseText('preferenceMining.seconds') }}</th>
													<th>{{ i18n.baseText('preferenceMining.cost') }}</th>
												</tr>
											</thead>
											<tbody>
												<tr v-for="result in run.results" :key="result.approach">
													<td>{{ labels[result.approach] }}</td>
													<td>{{ result.metrics.modelCalls }}</td>
													<td>
														{{ result.metrics.inputTokens.toLocaleString() }} /
														{{ result.metrics.outputTokens.toLocaleString() }}
														<N8nBadge
															v-if="result.metrics.usageComplete === false"
															variant="warning"
															>{{ i18n.baseText('preferenceMining.partialUsage') }}</N8nBadge
														>
													</td>
													<td>{{ (result.metrics.elapsedMs / 1000).toFixed(1) }}</td>
													<td>{{ cost(result.metrics) }}</td>
												</tr>
											</tbody>
											<tfoot v-if="run.metrics">
												<tr>
													<th>{{ i18n.baseText('preferenceMining.totalOnce') }}</th>
													<td>{{ run.metrics.modelCalls }}</td>
													<td>
														{{ run.metrics.inputTokens.toLocaleString() }} /
														{{ run.metrics.outputTokens.toLocaleString() }}
														<N8nBadge
															v-if="run.metrics.usageComplete === false"
															variant="warning"
															>{{ i18n.baseText('preferenceMining.partialUsage') }}</N8nBadge
														>
													</td>
													<td>{{ (run.metrics.elapsedMs / 1000).toFixed(1) }}</td>
													<td>{{ cost(run.metrics) }}</td>
												</tr>
											</tfoot>
										</table>
									</div>
									<N8nText size="small" color="text-light">{{
										i18n.baseText('preferenceMining.usageHint')
									}}</N8nText>
									<N8nText v-if="run.model?.pricing" size="small" color="text-light">{{
										i18n.baseText('preferenceMining.pricingHint', {
											interpolate: {
												model: run.model.pricing.modelId,
												input: formatCost(run.model.pricing.input),
												output: formatCost(run.model.pricing.output),
											},
										})
									}}</N8nText>
									<details v-if="selectedResult.metrics.calls?.length" :class="$style.trace">
										<summary>{{ i18n.baseText('preferenceMining.callMeasurements') }}</summary>
										<pre>{{ JSON.stringify(selectedResult.metrics.calls, null, 2) }}</pre>
									</details>
									<N8nHeading tag="h4" size="small">{{
										labels[selectedResult.approach]
									}}</N8nHeading>
									<ul :class="$style.notes">
										<li v-for="note in selectedResult.notes" :key="note">{{ note }}</li>
									</ul>
									<template v-if="run.sources?.warnings.length"
										><N8nHeading tag="h4" size="small">{{
											i18n.baseText('preferenceMining.sourceLimits')
										}}</N8nHeading>
										<ul :class="$style.notes">
											<li v-for="warning in run.sources.warnings" :key="warning">{{ warning }}</li>
										</ul></template
									>
									<details
										v-if="selectedResult.trace.length || selectedResult.timeline?.length"
										:class="$style.trace"
									>
										<summary>{{ i18n.baseText('preferenceMining.trace') }}</summary>
										<pre>{{
											JSON.stringify(
												{ trace: selectedResult.trace, timeline: selectedResult.timeline },
												null,
												2,
											)
										}}</pre>
									</details>
									<details :class="$style.trace">
										<summary>{{ i18n.baseText('preferenceMining.runData') }}</summary>
										<pre data-test-id="preference-mining-run-data">{{
											JSON.stringify(run, null, 2)
										}}</pre>
									</details>
									<N8nButton
										variant="outline"
										:href="`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(run, null, 2))}`"
										:download="`preference-mining-${run.id}.json`"
										:disabled="busy"
										>{{ i18n.baseText('preferenceMining.downloadRun') }}</N8nButton
									>
								</template>
							</div>
						</N8nCard>
					</template>
				</section>
			</div>
		</div>
	</main>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/breakpoints' as breakpoints;
.fullWidth {
	grid-column: 1 / -1;
}
.page {
	height: 100%;
	overflow-y: auto;
	background: var(--background--subtle);
}
.container {
	max-width: calc(var(--spacing--5xl) * 6);
	margin-inline: auto;
	padding: var(--spacing--xl);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}
.header,
.titleRow,
.resultHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}
.title,
.sectionHeading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.titleRow {
	justify-content: flex-start;
}
.project {
	width: calc(var(--spacing--5xl) + var(--spacing--xl));
	flex-shrink: 0;
}
.layout {
	display: grid;
	grid-template-columns: calc(var(--spacing--5xl) + var(--spacing--3xl)) minmax(0, 1fr);
	gap: var(--spacing--lg);
	align-items: start;
}
.setup,
.resultsPanel {
	--card--padding: var(--spacing--lg);
}
.stack,
.workspace {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	min-width: 0;
}
.presets {
	display: flex;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
}
.approaches {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}
.approachOption {
	display: flex;
}
.choice {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
.divider {
	border-top: var(--border);
	padding-top: var(--spacing--sm);
}
.advanced {
	margin-top: var(--spacing--sm);
}
.runActions {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.emptyCard {
	min-height: calc(var(--spacing--5xl) * 2);
	--card--padding: var(--spacing--xl);
}
.emptySteps {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	align-self: center;
	padding-block: var(--spacing--xl);
}
.emptySteps > div {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
.sources {
	display: flex;
	align-items: center;
	gap: var(--spacing--lg);
	flex-wrap: wrap;
	font-size: var(--font-size--sm);
	color: var(--text-color--subtle);
}
.sources strong {
	color: var(--text-color);
	font-weight: var(--font-weight--bold);
}
.resultGrid {
	display: grid;
	grid-template-columns: repeat(
		auto-fit,
		minmax(calc(var(--spacing--4xl) + var(--spacing--2xl)), 1fr)
	);
	gap: var(--spacing--xs);
}
.resultButton {
	appearance: none;
	padding: 0;
	border: 0;
	background: transparent;
	text-align: left;
	cursor: pointer;
	border-radius: var(--radius--lg);
	color: inherit;
	font: inherit;
}
.resultButton:focus-visible {
	outline: var(--focus--border-width) solid var(--focus--border-color);
	outline-offset: var(--spacing--4xs);
}
.resultButton:hover .resultCard {
	border-color: var(--border-color--stronger);
}
.selected .resultCard {
	border-color: var(--color--primary);
	background: var(--color--primary--tint-3);
}
.resultCard {
	height: 100%;
	--n8n--card-body--gap: var(--spacing--xs);
}
.resultCard :deep([data-test-id='card-content']) {
	min-width: 0;
}
.methodTitle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}
.methodCount {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
}
.methodCount strong {
	font-size: var(--font-size--2xl);
	font-weight: var(--font-weight--bold);
}
.resultCard :global(.n8n-badge) {
	align-self: flex-start;
}
.emptyResult {
	padding-block: var(--spacing--lg);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
}
.filterGrid,
.previewGrid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);
}
.previewColumn {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
}
.tableScroll {
	overflow-x: auto;
}
.table {
	width: 100%;
	border-collapse: collapse;
	font-size: var(--font-size--sm);
	font-variant-numeric: tabular-nums;
	text-align: left;
}
.table caption {
	text-align: left;
	color: var(--text-color--subtler);
	padding-bottom: var(--spacing--xs);
}
.table th,
.table td {
	padding: var(--spacing--xs);
	border-bottom: var(--border);
	white-space: nowrap;
}
.table th {
	font-weight: var(--font-weight--medium);
	color: var(--text-color--subtle);
	background: var(--background--subtle);
}
.notes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding-left: var(--spacing--sm);
	font-size: var(--font-size--sm);
	overflow-wrap: anywhere;
	line-height: var(--line-height--xl);
}
.trace summary {
	cursor: pointer;
	font-size: var(--font-size--sm);
}
.trace pre {
	margin-top: var(--spacing--sm);
	padding: var(--spacing--sm);
	overflow: auto;
	max-height: calc(var(--spacing--5xl) * 2);
	background: var(--background--subtle);
	border-radius: var(--radius--xs);
	font-size: var(--font-size--xs);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
@include breakpoints.breakpoint('sm-and-down') {
	.container {
		padding: var(--spacing--sm);
	}
	.header {
		align-items: flex-start;
		flex-direction: column;
	}
	.project {
		width: 100%;
	}
	.layout,
	.filterGrid,
	.previewGrid {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
