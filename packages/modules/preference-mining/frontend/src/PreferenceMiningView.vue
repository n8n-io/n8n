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
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nSelect,
	N8nTabs,
	N8nText,
} from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

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
	discoveryTask,
	minimumWorkflows,
	minimumShare,
	minimumMargin,
	run,
	history,
	historyTotal,
	historyLoading,
	loadHistory,
	openRun,
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
const comparisonMode = ref('exploration');
const resultFolder = ref('');
const router = useRouter();
const assistantUrl = computed(
	() => router.resolve({ path: '/assistant', query: { projectId: projectId.value } }).href,
);
const filters = ref(false);
const section = ref<'preferences' | 'observations' | 'recall' | 'details'>('preferences');
const selectedApproach = ref<PreferenceMiningApproach>('exploration');
const busy = computed(() => running.value || starting.value);
const needsModel = computed(() =>
	approaches.value.some((a) =>
		['workflows', 'threads', 'combined', 'exploration-tools', 'exploration'].includes(a),
	),
);
const needsDiscoveryTask = computed(() =>
	approaches.value.some((a) => a.startsWith('exploration')),
);
const canRun = computed(
	() =>
		!loading.value &&
		!!projectId.value &&
		approaches.value.length > 0 &&
		(!needsDiscoveryTask.value || discoveryTask.value.trim().length > 0) &&
		(!needsModel.value || options.value.assistant.available),
);
const selectedResult = computed(
	() =>
		run.value?.results.find((r) => r.approach === selectedApproach.value) ?? run.value?.results[0],
);
const visiblePreferences = computed(() =>
	(selectedResult.value?.preferences ?? []).filter(
		(preference) =>
			!resultFolder.value ||
			preference.folderId === null ||
			preference.folderId === resultFolder.value ||
			preference.folderIds?.includes(resultFolder.value),
	),
);
const comparisonModes = computed(() => [
	{ value: 'exploration', label: i18n.baseText('preferenceMining.mode.exploration') },
	{ value: 'usage', label: i18n.baseText('preferenceMining.mode.usage') },
	{ value: 'custom', label: i18n.baseText('preferenceMining.mode.custom') },
]);
watch(comparisonMode, (mode) => {
	if (mode === 'exploration')
		approaches.value = ['folder-usage', 'exploration-tools', 'exploration'];
	else if (mode === 'usage') approaches.value = ['nodes', 'credentials', 'folder-usage'];
});
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
	{
		value: 'observations' as const,
		label: `${i18n.baseText('preferenceMining.tabs.observations')} (${selectedResult.value?.observations?.length ?? 0})`,
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
	'folder-usage': i18n.baseText('preferenceMining.description.folderUsage'),
	'exploration-tools': i18n.baseText('preferenceMining.description.explorationTools'),
	exploration: i18n.baseText('preferenceMining.description.exploration'),
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
		approaches.value = [
			...new Set([
				...approaches.value,
				'baseline',
				'nodes',
				'credentials',
				'workflows',
				'threads',
				'combined',
			] satisfies PreferenceMiningApproach[]),
		];
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
function runDate(value: string) {
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
		new Date(value),
	);
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
		const matches = (group: PreferenceMiningApproach[]) =>
			group.length === approaches.value.length &&
			group.every((approach) => approaches.value.includes(approach));
		comparisonMode.value = matches(['folder-usage', 'exploration-tools', 'exploration'])
			? 'exploration'
			: matches(['nodes', 'credentials', 'folder-usage'])
				? 'usage'
				: 'custom';
		section.value = 'preferences';
		selectedApproach.value = approaches.value.includes('exploration')
			? 'exploration'
			: (approaches.value[0] ?? 'nodes');
		resultFolder.value = '';
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
			<N8nCard :class="$style.stack">
				<details>
					<summary>
						{{ i18n.baseText('preferenceMining.history.title') }} ({{ historyTotal }})
					</summary>
					<div :class="$style.stack">
						<N8nText size="small" color="text-light">{{
							i18n.baseText('preferenceMining.history.hint')
						}}</N8nText>
						<N8nText v-if="!history.length" size="small">{{
							i18n.baseText('preferenceMining.history.empty')
						}}</N8nText>
						<div v-for="item in history" :key="item.id" :class="$style.historyRow">
							<N8nButton variant="ghost" :disabled="busy" @click="openRun(item.id)">{{
								runDate(item.createdAt)
							}}</N8nButton>
							<N8nText size="small">{{ item.approaches.map((a) => labels[a]).join(', ') }}</N8nText>
							<N8nText size="small">{{
								item.model ?? i18n.baseText('preferenceMining.history.noModel')
							}}</N8nText>
							<N8nBadge variant="subtle">{{ statuses[item.status] }}</N8nBadge>
							<N8nText size="small">{{ formatCost(item.estimatedCost) }}</N8nText>
						</div>
						<N8nButton
							v-if="history.length < historyTotal"
							variant="ghost"
							:loading="historyLoading"
							@click="loadHistory(true)"
							>{{ i18n.baseText('preferenceMining.history.more') }}</N8nButton
						>
					</div>
				</details>
			</N8nCard>
			<div :class="$style.layout">
				<N8nCard :class="$style.setup">
					<form :class="$style.stack" @submit.prevent="canRun && !busy && start()">
						<div :class="$style.sectionHeading">
							<N8nHeading tag="h2" size="medium">{{
								i18n.baseText('preferenceMining.configure')
							}}</N8nHeading>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('preferenceMining.configureHint')
							}}</N8nText>
						</div>
						<N8nRadioGroup
							v-model="comparisonMode"
							orientation="horizontal"
							:disabled="busy"
							:aria-label="i18n.baseText('preferenceMining.comparisonType')"
						>
							<N8nRadioGroupItem
								v-for="mode in comparisonModes"
								:key="mode.value"
								:value="mode.value"
								:label="mode.label"
							/>
						</N8nRadioGroup>
						<div v-if="comparisonMode === 'custom'" :class="$style.customApproaches">
							<N8nCheckbox
								v-for="approach in preferenceMiningApproaches"
								:key="approach"
								:model-value="approaches.includes(approach)"
								:disabled="busy"
								:label="labels[approach]"
								@update:model-value="toggleApproach(approach, $event)"
							/>
							<N8nText :class="$style.fullWidth" size="small" color="text-light">{{
								i18n.baseText('preferenceMining.combinedHint')
							}}</N8nText>
						</div>
						<div v-else :class="$style.methodGrid">
							<div v-for="approach in approaches" :key="approach" :class="$style.methodSummary">
								<N8nText bold>{{ labels[approach] }}</N8nText>
								<N8nText size="small" color="text-light">{{ descriptions[approach] }}</N8nText>
							</div>
						</div>
						<div :class="$style.taskGrid">
							<N8nInputLabel
								v-if="needsDiscoveryTask"
								:label="i18n.baseText('preferenceMining.discoveryTask')"
								input-name="mining-discovery-task"
							>
								<N8nInput
									id="mining-discovery-task"
									v-model="discoveryTask"
									type="textarea"
									:rows="3"
									:maxlength="4000"
									:disabled="busy"
								/>
								<N8nText size="small" color="text-light">{{
									i18n.baseText('preferenceMining.discoveryTaskHint')
								}}</N8nText>
							</N8nInputLabel>
							<div v-if="needsModel" :class="$style.modelSettings">
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
											:label="
												options.assistant.model || i18n.baseText('preferenceMining.assistantModel')
											"
										/>
										<N8nOption
											value="claude-sonnet-5"
											:label="i18n.baseText('preferenceMining.sonnetModel')"
										/>
									</N8nSelect>
								</N8nInputLabel>
								<N8nText size="small" color="text-light">{{
									i18n.baseText('preferenceMining.connectionHint')
								}}</N8nText>
								<N8nNotice
									v-if="!loading && !options.assistant.available"
									:content="i18n.baseText('preferenceMining.assistantUnavailable')"
								/>
							</div>
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
							<div v-if="advanced" id="mining-advanced" :class="$style.advancedGrid">
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
								<N8nText :class="$style.fullWidth" size="small" color="text-light">{{
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
								type="submit"
								:disabled="!canRun || busy"
								:loading="busy"
								data-test-id="preference-mining-run"
							>
								<N8nIcon icon="play" size="small" />{{ i18n.baseText('preferenceMining.run') }}
							</N8nButton>
							<N8nButton v-if="running" variant="outline" @click="cancel">{{
								i18n.baseText('preferenceMining.cancel')
							}}</N8nButton>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('preferenceMining.runCount', {
									interpolate: { count: approaches.length },
								})
							}}</N8nText>
						</div>
						<N8nText size="small" color="text-light">{{
							needsModel
								? i18n.baseText('preferenceMining.modelHint')
								: i18n.baseText('preferenceMining.scopeHint')
						}}</N8nText>
					</form>
				</N8nCard>
				<section :class="$style.workspace" :aria-label="i18n.baseText('preferenceMining.compare')">
					<template v-if="run">
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
						<N8nCard v-if="run.results.length" :class="$style.comparisonTable">
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
											<th>{{ i18n.baseText('preferenceMining.status') }}</th>
											<th>{{ i18n.baseText('preferenceMining.preferences') }}</th>
											<th>{{ i18n.baseText('preferenceMining.calls') }}</th>
											<th>{{ i18n.baseText('preferenceMining.tokens') }}</th>
											<th>{{ i18n.baseText('preferenceMining.seconds') }}</th>
											<th>{{ i18n.baseText('preferenceMining.cost') }}</th>
										</tr>
									</thead>
									<tbody>
										<tr
											v-for="result in run.results"
											:key="result.approach"
											:class="{
												[$style.selectedRow]: selectedResult?.approach === result.approach,
											}"
										>
											<td>
												<N8nButton
													variant="ghost"
													size="small"
													:aria-pressed="selectedResult?.approach === result.approach"
													@click="selectedApproach = result.approach"
													>{{ labels[result.approach] }}</N8nButton
												>
											</td>
											<td>
												<N8nBadge :variant="statusVariant(result.status)">{{
													statuses[result.status]
												}}</N8nBadge>
											</td>
											<td>{{ result.preferences.length }}</td>
											<td>{{ result.metrics.modelCalls }}</td>
											<td>
												{{ result.metrics.inputTokens.toLocaleString() }} /
												{{ result.metrics.outputTokens.toLocaleString() }}
												<N8nBadge v-if="result.metrics.usageComplete === false" variant="warning">{{
													i18n.baseText('preferenceMining.partialUsage')
												}}</N8nBadge>
											</td>
											<td>{{ (result.metrics.elapsedMs / 1000).toFixed(1) }}</td>
											<td>{{ cost(result.metrics) }}</td>
										</tr>
									</tbody>
									<tfoot v-if="run.metrics">
										<tr>
											<th colspan="3">{{ i18n.baseText('preferenceMining.totalOnce') }}</th>
											<td>{{ run.metrics.modelCalls }}</td>
											<td>
												{{ run.metrics.inputTokens.toLocaleString() }} /
												{{ run.metrics.outputTokens.toLocaleString() }}
												<N8nBadge v-if="run.metrics.usageComplete === false" variant="warning">{{
													i18n.baseText('preferenceMining.partialUsage')
												}}</N8nBadge>
											</td>
											<td>{{ (run.metrics.elapsedMs / 1000).toFixed(1) }}</td>
											<td>{{ cost(run.metrics) }}</td>
										</tr>
									</tfoot>
								</table>
							</div>
							<N8nText size="small" color="text-light">{{
								i18n.baseText('preferenceMining.compareHint')
							}}</N8nText>
						</N8nCard>
						<N8nCard v-if="selectedResult" :class="$style.resultsPanel">
							<div :class="$style.stack">
								<N8nNotice
									v-if="run.persistenceError"
									theme="danger"
									:content="run.persistenceError"
								/>
								<N8nText v-if="run.createdAt" size="small" color="text-light">{{
									runDate(run.createdAt)
								}}</N8nText>
								<N8nText v-if="run.settings?.discoveryTask" size="small">{{
									run.settings.discoveryTask
								}}</N8nText>
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
									<N8nInputLabel
										v-if="selectedResult.preferences.length"
										:label="i18n.baseText('preferenceMining.resultFolder')"
										input-name="mining-result-folder"
										:class="$style.resultFilter"
									>
										<N8nSelect
											id="mining-result-folder"
											v-model="resultFolder"
											clearable
											filterable
											:placeholder="i18n.baseText('preferenceMining.allFolders')"
										>
											<N8nOption
												v-for="folder in run.sources?.folders"
												:key="folder.id"
												:value="folder.id"
												:label="folder.name"
											/>
										</N8nSelect>
									</N8nInputLabel>
									<PreferenceList
										v-if="visiblePreferences.length"
										:preferences="visiblePreferences"
										:type-names="typeNames"
										:folders="run.sources?.folders"
									/>
									<div v-else :class="$style.emptyResult">
										<N8nEmptyState
											:heading="i18n.baseText('preferenceMining.empty')"
											:description="
												resultFolder && selectedResult.preferences.length
													? i18n.baseText('preferenceMining.noFolderFindings')
													: emptyDescription(selectedResult)
											"
										/><N8nButton
											v-if="selectedResult.notes.length"
											variant="ghost"
											@click="section = 'details'"
											>{{ i18n.baseText('preferenceMining.viewDetails') }}</N8nButton
										>
									</div>
								</template>
								<template v-else-if="section === 'observations'">
									<N8nText size="small" color="text-light">{{
										i18n.baseText('preferenceMining.observations.hint')
									}}</N8nText>
									<N8nText v-if="!selectedResult.observations?.length">{{
										i18n.baseText('preferenceMining.observations.empty')
									}}</N8nText>
									<N8nCard
										v-for="(observation, index) in selectedResult.observations"
										:key="index"
										:class="$style.stack"
									>
										<N8nText tag="p">{{ observation.content }}</N8nText>
										<N8nText size="small" color="text-light">{{
											run.sources?.folders.find((folder) => folder.id === observation.folderId)
												?.name ?? i18n.baseText('preferenceMining.projectScope')
										}}</N8nText>
										<N8nText size="small" color="text-light">{{
											observation.evidenceIds.join(', ')
										}}</N8nText>
									</N8nCard>
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
									<details v-if="selectedResult.discoveryTrace?.length" :class="$style.trace">
										<summary>{{ i18n.baseText('preferenceMining.discoveryTrace') }}</summary>
										<pre>{{ JSON.stringify(selectedResult.discoveryTrace, null, 2) }}</pre>
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
					<N8nCard :class="$style.testGuide">
						<div :class="$style.guideGrid">
							<div :class="$style.sectionHeading">
								<N8nHeading tag="h2" size="medium">{{
									i18n.baseText('preferenceMining.judgeResults')
								}}</N8nHeading>
								<ol :class="$style.notes">
									<li>{{ i18n.baseText('preferenceMining.check.folder') }}</li>
									<li>{{ i18n.baseText('preferenceMining.check.evidence') }}</li>
									<li>{{ i18n.baseText('preferenceMining.check.cost') }}</li>
								</ol>
							</div>
							<div :class="$style.chatGuide">
								<N8nHeading tag="h2" size="medium">{{
									i18n.baseText('preferenceMining.testInChat')
								}}</N8nHeading>
								<N8nText size="small" color="text-light">{{
									i18n.baseText('preferenceMining.testInChatHint')
								}}</N8nText>
								<N8nButton variant="outline" :href="assistantUrl" target="_blank"
									>{{ i18n.baseText('preferenceMining.openAssistant')
									}}<N8nIcon icon="arrow-up-right" size="small"
								/></N8nButton>
							</div>
						</div>
					</N8nCard>
				</section>
			</div>
		</div>
	</main>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/breakpoints' as breakpoints;
.historyRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
	border-bottom: var(--border);
	padding-block: var(--spacing--xs);
}

.fullWidth {
	grid-column: 1 / -1;
}
.page {
	height: 100%;
	overflow-y: auto;
	background: var(--background--subtle);
}
.container {
	max-width: calc(var(--spacing--5xl) * 5);
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
	grid-template-columns: minmax(0, 1fr);
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
.divider {
	border-top: var(--border);
	padding-top: var(--spacing--sm);
}
.runActions {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
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
.methodTitle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
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

.methodGrid,
.customApproaches,
.advancedGrid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--sm);
}
.methodSummary {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	background: var(--background--subtle);
	border-radius: var(--radius--xs);
}
.taskGrid,
.guideGrid {
	display: grid;
	grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
	gap: var(--spacing--lg);
}
.taskGrid:empty {
	display: none;
}
.taskGrid > *,
.guideGrid > * {
	min-width: 0;
}
.modelSettings,
.chatGuide {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
}
.modelSettings > :first-child {
	width: 100%;
}
.advancedGrid {
	margin-top: var(--spacing--sm);
}
.selectedRow {
	background: var(--color--primary--tint-3);
}
.resultFilter {
	max-width: calc(var(--spacing--5xl) + var(--spacing--4xl));
}
.comparisonTable,
.testGuide {
	--card--padding: var(--spacing--lg);
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
	.methodGrid,
	.taskGrid,
	.guideGrid,
	.advancedGrid,
	.customApproaches,
	.filterGrid,
	.previewGrid {
		grid-template-columns: minmax(0, 1fr);
	}
}
</style>
