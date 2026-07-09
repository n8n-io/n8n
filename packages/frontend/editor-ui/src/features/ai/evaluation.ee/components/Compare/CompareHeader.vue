<script setup lang="ts">
import { N8nBadge, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { CompareVersion } from '../../composables/useCompareData';
import { deriveRunsStatus } from '../../evaluation.utils';
import VersionAvatar from '../shared/VersionAvatar.vue';

const props = defineProps<{
	collectionName: string;
	versions: CompareVersion[];
	bestVersionIndex: number | null;
}>();

const i18n = useI18n();

const status = computed(() => deriveRunsStatus(props.versions));

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
			<N8nText tag="h2" size="xlarge" bold>{{ collectionName }}</N8nText>
			<N8nBadge :theme="status === 'done' ? 'success' : 'tertiary'" size="small">
				{{
					i18n.baseText(
						status === 'done'
							? 'evaluation.collections.card.done'
							: 'evaluation.collections.card.running',
					)
				}}
			</N8nBadge>
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
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
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
