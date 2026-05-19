<script setup lang="ts">
import type { AgentEvaluationDatasetResponse, AgentEvaluationSuiteDraft } from '@n8n/api-types';
import { AGENT_EVALUATION_MIN_REVIEWED_CASES } from '@n8n/api-types';
import { N8nBadge, N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { useToast } from '@/app/composables/useToast';

import {
	getAgentEvaluationDataset,
	setupAgentEvaluationSuite,
} from '../composables/useAgentEvaluationsApi';
import type { AgentSchema } from '../types';

const props = withDefaults(
	defineProps<{
		projectId: string;
		agentId: string;
		schema?: AgentSchema | null;
	}>(),
	{
		schema: null,
	},
);

const emit = defineEmits<{
	'open-review': [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();

const dataset = ref<AgentEvaluationDatasetResponse | null>(null);
const suite = ref<AgentEvaluationSuiteDraft | null>(null);
const loading = ref(false);
const settingUpSuite = ref(false);

const evals = computed(() => props.schema?.evaluations ?? []);
const readiness = computed(() => dataset.value?.readiness ?? null);
const isReady = computed(() => readiness.value?.isReady === true);
const reviewedCases = computed(() => readiness.value?.reviewedCases ?? 0);
const minimumReviewedCases = computed(
	() => readiness.value?.minimumReviewedCases ?? AGENT_EVALUATION_MIN_REVIEWED_CASES,
);
const remainingCases = computed(
	() => readiness.value?.remainingCases ?? minimumReviewedCases.value,
);

const readinessTitle = computed(() => {
	if (loading.value && !dataset.value) {
		return i18n.baseText('agents.builder.evaluations.readiness.loading');
	}

	return isReady.value
		? i18n.baseText('agents.builder.evaluations.readiness.ready.title')
		: i18n.baseText('agents.builder.evaluations.readiness.reviewFirst.title');
});

const readinessDescription = computed(() => {
	if (loading.value && !dataset.value) {
		return i18n.baseText('agents.builder.evaluations.readiness.loadingDescription');
	}

	if (isReady.value) {
		return i18n.baseText('agents.builder.evaluations.readiness.ready.description', {
			interpolate: { count: String(reviewedCases.value) },
		});
	}

	return i18n.baseText('agents.builder.evaluations.readiness.reviewFirst.description', {
		interpolate: {
			minimum: String(minimumReviewedCases.value),
			count: String(reviewedCases.value),
			remaining: String(remainingCases.value),
		},
	});
});

async function loadDataset() {
	if (!props.projectId || !props.agentId) return;

	suite.value = null;
	loading.value = true;
	try {
		dataset.value = await getAgentEvaluationDataset(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.evaluations.dataset.loadError'));
	} finally {
		loading.value = false;
	}
}

async function setupSuite() {
	if (!props.projectId || !props.agentId) return;

	settingUpSuite.value = true;
	try {
		const response = await setupAgentEvaluationSuite(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		if (dataset.value) {
			dataset.value = { ...dataset.value, readiness: response.readiness };
		}
		suite.value = response.suite;
		if (!response.suite) {
			toast.showMessage({
				title: i18n.baseText('agents.builder.evaluations.setup.notReady'),
				type: 'warning',
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('agents.builder.evaluations.setup.loadError'));
	} finally {
		settingUpSuite.value = false;
	}
}

watch(
	() => [props.projectId, props.agentId],
	() => void loadDataset(),
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.panel" data-testid="agent-evals-panel">
		<N8nCard :class="$style.readinessCard" data-testid="agent-evaluations-readiness">
			<div :class="$style.readinessHeader">
				<N8nIcon
					:icon="isReady ? 'circle-check' : 'list-checks'"
					:size="18"
					:class="[$style.readinessIcon, isReady && $style.readyIcon]"
				/>
				<div :class="$style.readinessCopy">
					<N8nText :bold="true">{{ readinessTitle }}</N8nText>
					<N8nText size="small" color="text-light">{{ readinessDescription }}</N8nText>
				</div>
			</div>

			<div :class="$style.datasetStats">
				<div :class="$style.datasetStat">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.builder.evaluations.dataset.reviewed') }}
					</N8nText>
					<N8nText :bold="true">{{ reviewedCases }} / {{ minimumReviewedCases }}</N8nText>
				</div>
				<div :class="$style.datasetStat">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.builder.evaluations.dataset.approved') }}
					</N8nText>
					<N8nText :bold="true">{{ dataset?.summary.approved ?? 0 }}</N8nText>
				</div>
				<div :class="$style.datasetStat">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('agents.builder.evaluations.dataset.rejected') }}
					</N8nText>
					<N8nText :bold="true">{{ dataset?.summary.rejected ?? 0 }}</N8nText>
				</div>
			</div>

			<div v-if="!isReady" :class="$style.readinessActions">
				<N8nButton
					icon="clipboard-check"
					:label="i18n.baseText('agents.builder.evaluations.readiness.reviewFirst.button')"
					data-testid="agent-evaluations-open-review"
					@click="emit('open-review')"
				/>
			</div>
		</N8nCard>

		<template v-if="isReady">
			<template v-if="evals.length > 0">
				<N8nCard v-for="evalItem in evals" :key="evalItem.name" :class="$style.evalCard">
					<div :class="$style.evalHeader">
						<N8nText :bold="true" size="small">{{ evalItem.name }}</N8nText>
						<span
							:class="[
								$style.typeBadge,
								evalItem.type === 'check' ? $style.badgeCheck : $style.badgeJudge,
							]"
						>
							<N8nText size="xsmall" :bold="true">{{
								evalItem.type === 'check'
									? i18n.baseText('agents.builder.evaluations.type.check')
									: i18n.baseText('agents.builder.evaluations.type.judge')
							}}</N8nText>
						</span>
					</div>

					<div v-if="evalItem.hasCredential" :class="$style.credentialRow">
						<N8nIcon icon="lock" size="xsmall" :class="$style.keyIcon" />
						<N8nText size="xsmall" color="text-light">
							{{
								evalItem.credentialName ??
								i18n.baseText('agents.builder.evaluations.credentialConfigured')
							}}
						</N8nText>
					</div>

					<N8nText v-if="evalItem.description" size="small" color="text-light">
						{{ evalItem.description }}
					</N8nText>
				</N8nCard>
			</template>

			<N8nCard v-if="suite" :class="$style.suiteCard" data-testid="agent-evaluations-suite">
				<div :class="$style.suiteHeader">
					<div :class="$style.readinessCopy">
						<div :class="$style.suiteTitleRow">
							<N8nText :bold="true">{{ suite.name }}</N8nText>
							<N8nBadge theme="secondary" size="small">
								{{ i18n.baseText('agents.builder.evaluations.suite.status.draft') }}
							</N8nBadge>
						</div>
						<N8nText size="small" color="text-light">{{ suite.description }}</N8nText>
					</div>
					<N8nText size="small" color="text-light">
						{{
							i18n.baseText('agents.builder.evaluations.suite.caseCount', {
								interpolate: { count: String(suite.caseCount) },
							})
						}}
					</N8nText>
				</div>

				<div :class="$style.runSetup">
					<div>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.suite.toolMocking') }}
						</N8nText>
						<N8nText size="small">{{ suite.toolMocking }}</N8nText>
					</div>
					<div>
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('agents.builder.evaluations.suite.memoryMocking') }}
						</N8nText>
						<N8nText size="small">{{ suite.memoryMocking }}</N8nText>
					</div>
				</div>

				<div :class="$style.metricsList">
					<N8nText :bold="true" size="small">
						{{ i18n.baseText('agents.builder.evaluations.suite.metrics') }}
					</N8nText>
					<div
						v-for="metric in suite.metrics"
						:key="metric.id"
						:class="$style.metricRow"
						data-testid="agent-evaluations-suite-metric"
					>
						<div :class="$style.metricCopy">
							<N8nText :bold="true" size="small">{{ metric.name }}</N8nText>
							<N8nText size="small" color="text-light">{{ metric.description }}</N8nText>
						</div>
						<div :class="$style.metricBadges">
							<N8nBadge theme="secondary" size="small">
								{{
									metric.type === 'check'
										? i18n.baseText('agents.builder.evaluations.type.check')
										: i18n.baseText('agents.builder.evaluations.type.judge')
								}}
							</N8nBadge>
							<N8nBadge :theme="metric.enabled ? 'success' : 'secondary'" size="small">
								{{
									metric.enabled
										? i18n.baseText('agents.builder.evaluations.suite.metric.enabled')
										: i18n.baseText('agents.builder.evaluations.suite.metric.disabled')
								}}
							</N8nBadge>
						</div>
					</div>
				</div>
			</N8nCard>

			<div v-else :class="$style.dashedCard">
				<N8nText :bold="true">
					{{ i18n.baseText('agents.builder.evaluations.setup.title') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.evaluations.setup.description') }}
				</N8nText>
				<div :class="$style.readinessActions">
					<N8nButton
						icon="wand-sparkles"
						:label="i18n.baseText('agents.builder.evaluations.setup.button')"
						:loading="settingUpSuite"
						data-testid="agent-evaluations-setup-suite"
						@click="setupSuite"
					/>
				</div>
			</div>
		</template>
	</div>
</template>

<style module>
.panel {
	padding: var(--spacing--lg);
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	min-height: 0;
}

.readinessCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.suiteCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.readinessHeader {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.readinessIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
	margin-top: var(--spacing--5xs);
}

.readyIcon {
	color: var(--color--success);
}

.readinessCopy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.datasetStats {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: var(--spacing--sm);
}

.datasetStat {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--border-radius-base);
}

.readinessActions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
}

.suiteHeader {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.suiteTitleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex-wrap: wrap;
}

.runSetup {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--sm);

	> div {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--4xs);
		padding: var(--spacing--xs);
		border: var(--border);
		border-radius: var(--border-radius-base);
	}
}

.metricsList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.metricRow {
	display: flex;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--border-radius-base);
}

.metricCopy {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.metricBadges {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	flex-wrap: wrap;
	justify-content: flex-end;
}

.evalCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.evalHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.typeBadge {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
}

.badgeCheck {
	background-color: var(--color--orange-100);
	color: var(--background--brand--active);
}

.badgeJudge {
	background-color: var(--color--purple-100);
	color: var(--color--purple-700);
}

.credentialRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--text-color--subtler);
}

.keyIcon {
	flex-shrink: 0;
}

.dashedCard {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border: var(--border-width) dashed var(--border-color);
	border-radius: var(--radius);
}

@media (max-width: 900px) {
	.datasetStats,
	.runSetup {
		grid-template-columns: 1fr;
	}

	.suiteHeader,
	.metricRow {
		flex-direction: column;
	}

	.metricBadges {
		justify-content: flex-start;
	}
}
</style>
