<script setup lang="ts">
import { N8nBadge, N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useToast } from '@/app/composables/useToast';

import type { CompareVersion } from '../../composables/useCompareData';
import { useEvalCollectionsStore } from '../../evalCollections.store';
import { countCompletedRuns, deriveRunsStatus } from '../../evaluation.utils';
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

// Live "N/M versions complete" progress while runs are in flight. Reads from
// `versions` (refreshed by the store's detail poll), so the count advances on
// its own and the indicator disappears once the set settles.
const completedCount = computed(() => countCompletedRuns(props.versions));

// Re-run is offered once the current attempt has settled (done or failed) and
// hidden while runs are still in flight, so a user can't schedule a second
// wave on top of an unfinished one (the backend rejects that anyway).
const canRerun = computed(() => !isRunning.value);

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

// Done/Failed badge only; the running state renders a distinct RunningIndicator
// instead so it can't be mistaken for a settled result.
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
			<span
				v-for="version in legend"
				:key="version.testRunId"
				:class="$style.chip"
				data-test-id="compare-header-version"
			>
				<VersionAvatar :index="version.index" variant="square" size="small" />
				<N8nText size="xsmall" color="text-base">{{ version.label }}</N8nText>
				<N8nText v-if="version.scorePercent !== null" size="xsmall" bold>
					{{ version.scorePercent }}%
				</N8nText>
				<N8nText v-if="version.isBest" size="xsmall" bold color="success">
					{{ i18n.baseText('evaluation.compare.versionsLegend.best') }}
				</N8nText>
			</span>
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

.chip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
}
</style>
