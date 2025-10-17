<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import type { DataTable } from '@/features/dataTable/dataTable.types';
import { useI18n } from '@n8n/i18n';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useRouter } from 'vue-router';
import DataTableActions from '@/features/dataTable/components/DataTableActions.vue';
import { PROJECT_DATA_TABLES } from '@/features/dataTable/constants';
import { useDataTableStore } from '@/features/dataTable/dataTable.store';
import { useToast } from '@/composables/useToast';
import { telemetry } from '@/plugins/telemetry';

import { N8nBreadcrumbs, N8nInlineTextEdit } from '@n8n/design-system';
import ProjectBreadcrumb from '@/features/folders/components/ProjectBreadcrumb.vue';
const BREADCRUMBS_SEPARATOR = '/';

type Props = {
	dataTable: DataTable;
};

const props = defineProps<Props>();

const renameInput = useTemplateRef<{ forceFocus: () => void }>('renameInput');

const dataTableStore = useDataTableStore();

const i18n = useI18n();
const router = useRouter();
const toast = useToast();

const editableName = ref(props.dataTable.name);

const project = computed(() => {
	return props.dataTable.project ?? null;
});

const breadcrumbs = computed<PathItem[]>(() => {
	if (!project.value) {
		return [];
	}
	return [
		{
			id: 'datatables',
			label: i18n.baseText('dataTable.dataTables'),
			href: `/projects/${project.value.id}/datatables`,
		},
	];
});

const onItemClicked = async (item: PathItem) => {
	if (item.href) {
		await router.push(item.href);
	}
};

const onDelete = async () => {
	await router.push({
		name: PROJECT_DATA_TABLES,
		params: { projectId: props.dataTable.projectId },
	});
};

const onRename = async () => {
	// Focus rename input if the action is rename
	// We need this timeout to ensure action toggle is closed before focusing
	await nextTick();
	if (renameInput.value && typeof renameInput.value.forceFocus === 'function') {
		renameInput.value.forceFocus();
	}
};

const onNameSubmit = async (name: string) => {
	try {
		const updated = await dataTableStore.updateDataTable(
			props.dataTable.id,
			name,
			props.dataTable.projectId,
		);
		if (!updated) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		editableName.value = name;
		telemetry.track('User renamed data table', {
			data_table_id: props.dataTable.id,
			data_table_project_id: props.dataTable.projectId,
		});
	} catch (error) {
		// Revert to original name if rename fails
		editableName.value = props.dataTable.name;
		toast.showError(error, i18n.baseText('dataTable.rename.error'));
	}
};

watch(
	() => props.dataTable.name,
	(newName) => {
		editableName.value = newName;
	},
);
</script>

<template>
	<div :class="$style['data-table-breadcrumbs']" data-test-id="data-table-breadcrumbs">
		<N8nBreadcrumbs
			:items="breadcrumbs"
			:separator="BREADCRUMBS_SEPARATOR"
			:highlight-last-item="false"
			@item-selected="onItemClicked"
		>
			<template #prepend>
				<ProjectBreadcrumb v-if="project" :current-project="project" />
			</template>
			<template #append>
				<span :class="$style.separator">{{ BREADCRUMBS_SEPARATOR }}</span>
				<N8nInlineTextEdit
					ref="renameInput"
					v-model="editableName"
					data-test-id="data-table-header-name-input"
					:placeholder="i18n.baseText('dataTable.add.input.name.label')"
					:class="$style['breadcrumb-current']"
					:max-length="30"
					:read-only="false"
					:disabled="false"
					@update:model-value="onNameSubmit"
				/>
			</template>
		</N8nBreadcrumbs>
		<div :class="$style['data-table-actions']">
			<DataTableActions
				:data-table="props.dataTable"
				location="breadcrumbs"
				@rename="onRename"
				@on-deleted="onDelete"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.data-table-breadcrumbs {
	display: flex;
	align-items: center;
}

.data-table-actions {
	position: relative;
	top: var(--spacing--5xs);
}

.separator {
	font-size: var(--font-size--xl);
	color: var(--color--foreground);
	padding: var(--spacing--3xs) var(--spacing--4xs) var(--spacing--4xs);
}

.breadcrumb-current {
	color: $custom-font-dark;
	font-size: var(--font-size--sm);
	padding: var(--spacing--3xs) var(--spacing--4xs) var(--spacing--4xs);
}
</style>
