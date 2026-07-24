<script setup lang="ts">
import { N8nBadge, N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { VIEWS } from '@/app/constants';
import { useToast } from '@/app/composables/useToast';

import type { CompareVersion } from '../../composables/useCompareData';
import { useEvalCollectionsStore } from '../../evalCollections.store';
import { countSettledRuns, deriveRunsStatus } from '../../evaluation.utils';
import RunningIndicator from '../shared/RunningIndicator.vue';
import VersionAvatar from '../shared/VersionAvatar.vue';

const props = defineProps<{
	collectionName: string;
	versions: CompareVersion[];
	bestVersionIndex: number | null;
	workflowId: string;
	collectionId: string;
}>();

const i18n = useI18n();
const toast = useToast();
const store = useEvalCollectionsStore();

const status = computed(() => deriveRunsStatus(props.versions));
const isRunning = computed(() => status.value === 'running');

const completedCount = computed(() => countSettledRuns(props.versions));

// Hidden while running (no stacking a second wave) and when there are no
// versions to re-run — an empty collection would just 400 on the rerun endpoint.
const canRerun = computed(() => !isRunning.value && props.versions.length > 0);

const rerunning = ref(false);

async function onRerun() {
	if (rerunning.value || !canRerun.value) return;
	rerunning.value = true;
	try {
		await store.rerunCollection(props.workflowId, props.collectionId);
	} catch (error) {
		toast.showError(error, i18n.baseText('evaluation.compare.errors.rerunFailed'));
	} finally {
		rerunning.value = false;
	}
}

// Settled result only; the running state renders a distinct RunningIndicator.
const statusBadge = computed(() =>
	status.value === 'error'
		? {
				theme: 'warning' as const,
				label: i18n.baseText('evaluation.collections.card.failed'),
			}
		: {
				theme: 'success' as const,
				label: i18n.baseText('evaluation.collections.card.done'),
			},
);

const legend = computed(() =>
	props.versions.map((version) => ({
		...version,
		scorePercent: version.avgScore !== null ? Math.round(version.avgScore * 100) : null,
		isBest: version.index === props.bestVersionIndex,
		// Per-version flag so the chip can spin; the collection count can't say which.
		isRunning: version.status === 'new' || version.status === 'running',
	})),
);
</script>

<template>
	<header :class="$style.header" data-test-id="compare-header">
		<div :class="$style.titleRow">
			<div :class="$style.titleGroup">
				<N8nText tag="h2" size="xlarge" bold>{{ collectionName }}</N8nText>
				<RunningIndicator v-if="isRunning" :completed="completedCount" :total="versions.length" />
				<N8nBadge v-else :theme="statusBadge.theme" size="small">{{ statusBadge.label }}</N8nBadge>
			</div>
			<N8nButton
				v-if="canRerun"
				variant="outline"
				size="small"
				icon="refresh-cw"
				:label="i18n.baseText('evaluation.compare.rerun')"
				:loading="rerunning"
				:disabled="rerunning"
				data-test-id="compare-rerun"
				@click="onRerun"
			/>
		</div>
		<N8nText size="small" color="text-light">
			{{
				i18n.baseText('evaluation.collections.card.meta.versions', {
					adjustToNumber: versions.length,
				})
			}}
		</N8nText>

		<div :class="$style.legend">
			<RouterLink
				v-for="version in legend"
				:key="version.testRunId"
				:to="{
					name: VIEWS.EVALUATION_RUNS_DETAIL,
					params: { workflowId, runId: version.testRunId },
				}"
				:class="$style.chip"
				:title="i18n.baseText('evaluation.compare.versionsLegend.inspectRun')"
				data-test-id="compare-header-version"
			>
				<VersionAvatar :index="version.index" variant="square" size="small" />
				<N8nText size="xsmall" color="text-base">{{ version.label }}</N8nText>
				<N8nIcon
					v-if="version.isRunning"
					icon="spinner"
					size="xsmall"
					spin
					:title="i18n.baseText('evaluation.compare.versionsLegend.running')"
				/>
				<N8nText v-else-if="version.scorePercent !== null" size="xsmall" bold>
					{{ version.scorePercent }}%
				</N8nText>
				<N8nText v-if="version.isBest" size="xsmall" bold color="success">
					{{ i18n.baseText('evaluation.compare.versionsLegend.best') }}
				</N8nText>
			</RouterLink>
		</div>
	</header>
</template>

<style module lang="scss">
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.titleRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.titleGroup {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.legend {
	display: inline-flex;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--3xs);
}

// Transparent resting border keeps size stable; it colors on hover to signal the link.
.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	border: 1px solid transparent;
	text-decoration: none;
	color: inherit;
	cursor: pointer;
	transition: border-color var(--animation--duration--snappy) var(--animation--easing);

	&:hover {
		border-color: var(--border-color--strong);
	}
}
</style>
