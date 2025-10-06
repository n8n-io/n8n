<script setup lang="ts">
import type { DataStoreResource } from '@/features/dataStore/types';
import { DATA_STORE_DETAILS } from '@/features/dataStore/constants';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import DataStoreActions from '@/features/dataStore/components/DataStoreActions.vue';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import TimeAgo from '@/components/TimeAgo.vue';

import { N8nBadge, N8nCard, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
type Props = {
	dataStore: DataStoreResource;
	readOnly?: boolean;
	showOwnershipBadge?: boolean;
};

const i18n = useI18n();
const dataStoreStore = useDataStoreStore();

const props = withDefaults(defineProps<Props>(), {
	actions: () => [],
	readOnly: false,
	showOwnershipBadge: false,
});

const dataStoreRoute = computed(() => {
	return {
		name: DATA_STORE_DETAILS,
		params: {
			projectId: props.dataStore.projectId,
			id: props.dataStore.id,
		},
	};
});

const getDataStoreSize = computed(() => {
	const size = dataStoreStore.dataStoreSizes[props.dataStore.id] ?? 0;
	return size;
});
</script>
<template>
	<div data-test-id="data-store-card">
		<N8nLink :to="dataStoreRoute" class="data-store-card" data-test-id="data-store-card-link">
			<N8nCard :class="$style.card">
				<template #prepend>
					<N8nIcon
						data-test-id="data-store-card-icon"
						:class="$style['card-icon']"
						icon="database"
						size="xlarge"
						:stroke-width="1"
					/>
				</template>
				<template #header>
					<div :class="$style['card-header']">
						<N8nText tag="h2" bold data-test-id="data-store-card-name">
							{{ props.dataStore.name }}
						</N8nText>
						<N8nBadge v-if="props.readOnly" class="ml-3xs" theme="tertiary" bold>
							{{ i18n.baseText('workflows.item.readonly') }}
						</N8nBadge>
					</div>
				</template>
				<template #footer>
					<div :class="$style['card-footer']">
						<N8nText
							size="small"
							color="text-light"
							:class="[$style['info-cell'], $style['info-cell--size']]"
							data-test-id="data-store-card-size"
						>
							{{
								i18n.baseText('dataStore.card.size', {
									interpolate: { size: getDataStoreSize },
								})
							}}
						</N8nText>
						<N8nText
							size="small"
							color="text-light"
							:class="[$style['info-cell'], $style['info-cell--column-count']]"
							data-test-id="data-store-card-column-count"
						>
							{{
								i18n.baseText('dataStore.card.column.count', {
									interpolate: { count: props.dataStore.columns.length + 1 },
								})
							}}
						</N8nText>
						<N8nText
							size="small"
							color="text-light"
							:class="[$style['info-cell'], $style['info-cell--updated']]"
							data-test-id="data-store-card-last-updated"
						>
							{{ i18n.baseText('workerList.item.lastUpdated') }}
							<TimeAgo :date="String(props.dataStore.updatedAt)" />
						</N8nText>
						<N8nText
							size="small"
							color="text-light"
							:class="[$style['info-cell'], $style['info-cell--created']]"
							data-test-id="data-store-card-created"
						>
							{{ i18n.baseText('workflows.item.created') }}
							<TimeAgo :date="String(props.dataStore.createdAt)" />
						</N8nText>
					</div>
				</template>
				<template #append>
					<div :class="$style['card-actions']" @click.prevent>
						<DataStoreActions
							:data-store="props.dataStore"
							:is-read-only="props.readOnly"
							location="card"
						/>
					</div>
				</template>
			</N8nCard>
		</N8nLink>
	</div>
</template>

<style lang="scss" module>
.card {
	transition: box-shadow 0.3s ease;
	cursor: pointer;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.card-icon {
	flex-shrink: 0;
	color: var(--color-text-base);
	align-content: center;
	text-align: center;
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-right: var(--spacing-xs);
	margin-bottom: var(--spacing-5xs);
}

.card-footer {
	display: flex;
}

.info-cell {
	& + & {
		&::before {
			content: '|';
			margin: 0 var(--spacing-4xs);
		}
	}
}

@include mixins.breakpoint('sm-and-down') {
	.card {
		flex-wrap: wrap;
	}
	.info-cell--created,
	.info-cell--column-count,
	.info-cell--size {
		display: none;
	}
}
</style>
