<script setup lang="ts">
import { DATA_TABLE_DETAILS } from '@/features/core/dataTable/constants';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import DataTableActions from '@/features/core/dataTable/components/DataTableActions.vue';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import TimeAgo from '@/app/components/TimeAgo.vue';
import ProjectCardBadge from '@/features/collaboration/projects/components/ProjectCardBadge.vue';
import DependencyPill from '@/app/components/DependencyPill.vue';
import ResourceListRow from '@/app/components/layouts/ResourceListRow.vue';
import { formatResourceListDate } from '@/app/components/layouts/resourceListColumns';

import { N8nCard, N8nIcon, N8nLink, N8nText } from '@n8n/design-system';
import type { DataTableResource } from '../types';
import { ResourceType } from '@/features/collaboration/projects/projects.utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useDependencies } from '@/app/composables/useDependencies';

type Props = {
	dataTable: DataTableResource;
	/** Locks rename and delete, for example on a protected instance. */
	schemaReadOnly?: boolean;
	showOwnershipBadge?: boolean;
};

const i18n = useI18n();
const dataTableStore = useDataTableStore();
const projectsStore = useProjectsStore();
const { hasDependencies } = useDependencies();

const props = withDefaults(defineProps<Props>(), {
	actions: () => [],
	schemaReadOnly: false,
	showOwnershipBadge: false,
});

const dataTableRoute = computed(() => {
	return {
		name: DATA_TABLE_DETAILS,
		params: {
			projectId: props.dataTable.projectId,
			id: props.dataTable.id,
		},
	};
});

const getDataTableSize = computed(() => {
	const size = dataTableStore.dataTableSizes[props.dataTable.id] ?? 0;
	return size;
});

const dataTableHasDependents = computed(() => hasDependencies(props.dataTable.id, 'dataTable'));
</script>
<template>
	<div data-test-id="data-table-card">
		<N8nLink
			:to="dataTableRoute"
			:underline="false"
			class="data-table-card"
			data-test-id="data-table-card-link"
		>
			<N8nCard :class="$style.card">
				<ResourceListRow>
					<template #name>
						<N8nIcon
							data-test-id="data-table-card-icon"
							:class="$style['card-icon']"
							icon="table"
							size="large"
							:stroke-width="1.5"
						/>
						<N8nText tag="h2" bold :class="$style.name" data-test-id="data-table-card-name">
							{{ props.dataTable.name }}
						</N8nText>
					</template>
					<template #size>
						<N8nText
							size="small"
							color="text-light"
							:class="$style.meta"
							data-test-id="data-table-card-size"
						>
							{{
								i18n.baseText('dataTable.card.size', {
									interpolate: { size: getDataTableSize },
								})
							}}
						</N8nText>
					</template>
					<template #columns>
						<N8nText
							size="small"
							color="text-light"
							:class="$style.meta"
							data-test-id="data-table-card-column-count"
						>
							{{ props.dataTable.columns.length + 1 }}
						</N8nText>
					</template>
					<template #location>
						<span :class="$style.cellContent" @click.stop>
							<ProjectCardBadge
								v-if="props.showOwnershipBadge"
								:class="$style['card-badge']"
								:resource="dataTable"
								:resource-type="ResourceType.DataTable"
								:resource-type-label="'Data Table'"
								:personal-project="projectsStore.personalProject"
								:show-badge-border="false"
							/>
						</span>
					</template>
					<template #updated>
						<N8nText
							size="small"
							color="text-light"
							:class="$style.meta"
							data-test-id="data-table-card-last-updated"
						>
							<TimeAgo :date="String(props.dataTable.updatedAt)" />
						</N8nText>
					</template>
					<template #created>
						<N8nText
							size="small"
							color="text-light"
							:class="$style.meta"
							data-test-id="data-table-card-created"
						>
							{{ formatResourceListDate(props.dataTable.createdAt) }}
						</N8nText>
					</template>
					<template #dependencies>
						<span :class="$style.cellContent" @click.stop>
							<DependencyPill
								v-if="dataTableHasDependents"
								resource-type="dataTable"
								:resource-id="props.dataTable.id"
								source="data_table_card"
								data-test-id="data-table-card-dependents"
							/>
						</span>
					</template>
					<template #actions>
						<span :class="$style.cellContent" @click.stop>
							<span data-row-menu>
								<DataTableActions
									:data-table="props.dataTable"
									:schema-read-only="props.schemaReadOnly"
									location="card"
								/>
							</span>
						</span>
					</template>
				</ResourceListRow>
			</N8nCard>
		</N8nLink>
	</div>
</template>

<style lang="scss" module>
.card {
	cursor: pointer;
}

.card-icon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.name {
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.meta {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.card-badge {
	min-width: 0;
	max-width: 100%;
}

// Controls in a cell must not open the data table.
.cellContent {
	display: contents;
}
</style>
