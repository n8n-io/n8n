<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { TableHeader } from '@n8n/design-system';
import { N8nActionDropdown, N8nDataTableServer, N8nText } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';

import { useUIStore } from '@/app/stores/ui.store';
import { getAllProjectsExecutionQuota } from '@/features/collaboration/projects/projects.api';
import type {
	ProjectExecutionQuotaPeriodUnit,
	ProjectExecutionQuotaRow,
} from '@/features/collaboration/projects/projects.types';
import { EXECUTION_QUOTA_EDIT_MODAL_KEY } from './executionQuota.constants';

const emit = defineEmits<{
	edit: [row: ProjectExecutionQuotaRow];
}>();

const i18n = useI18n();
const { showError } = useToast();
const rootStore = useRootStore();
const uiStore = useUIStore();

const {
	state: rows,
	isLoading,
	execute: refetch,
} = useAsyncState(async () => {
	try {
		return await getAllProjectsExecutionQuota(rootStore.restApiContext);
	} catch (error) {
		showError(error, i18n.baseText('settings.security.executionQuota.fetchError'));
		return [];
	}
}, []);

// The edit modal registers through `modalRegistry`/`DynamicModalLoader`, so it has
// no direct parent to emit a "saved" event to. Refetch whenever it closes instead
// — covers save and cancel alike, which is fine for a dataset this size.
watch(
	() => uiStore.modalsById[EXECUTION_QUOTA_EDIT_MODAL_KEY]?.open,
	(isOpen, wasOpen) => {
		if (wasOpen && !isOpen) void refetch();
	},
);

// This endpoint returns every project in a single response — it was never
// genuinely server-paginated. `N8nDataTableServer` is still the right
// component (matching the other admin tables in this section), but the
// paging itself is done here, client-side, against the full `rows` array.
const page = ref(1);
const itemsPerPage = ref(10);

const pagedRows = computed(() => {
	const start = (page.value - 1) * itemsPerPage.value;
	return rows.value.slice(start, start + itemsPerPage.value);
});

function periodLabel(unit: ProjectExecutionQuotaPeriodUnit): string {
	return i18n.baseText(`projects.settings.executionQuota.period.${unit}`);
}

function onRowClick(_event: MouseEvent, payload: { item: ProjectExecutionQuotaRow }) {
	onEdit(payload.item);
}

function onEdit(row: ProjectExecutionQuotaRow) {
	emit('edit', row);
	uiStore.openModalWithData({
		name: EXECUTION_QUOTA_EDIT_MODAL_KEY,
		data: {
			projectId: row.projectId,
			projectName: row.projectName,
			limit: row.limit,
			periodUnit: row.periodUnit,
		},
	});
}

type ExecutionQuotaAction = 'edit';

function getRowActions(): Array<ActionDropdownItem<ExecutionQuotaAction>> {
	return [
		{
			id: 'edit',
			label: i18n.baseText('settings.security.executionQuota.actions.edit'),
			icon: 'square-pen',
			testId: 'execution-quota-edit-action',
		},
	];
}

function onAction(action: ExecutionQuotaAction, row: ProjectExecutionQuotaRow) {
	if (action === 'edit') onEdit(row);
}

// `resize: false` everywhere — fixed-shape columns, and the resizer handle
// otherwise highlights on every header hover. `disableSort: true` everywhere —
// the endpoint returns every project's quota in a single response, so there is
// nothing for the server to sort and no reason to fake client-side sort state.
const headers = computed<Array<TableHeader<ProjectExecutionQuotaRow>>>(() => [
	{
		title: i18n.baseText('settings.security.executionQuota.columns.project'),
		key: 'projectName',
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.security.executionQuota.columns.limit'),
		key: 'limit',
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.security.executionQuota.columns.period'),
		key: 'periodUnit',
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.security.executionQuota.columns.usage'),
		key: 'remaining',
		disableSort: true,
		resize: false,
		value: () => undefined,
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 80,
		disableSort: true,
		resize: false,
		value: () => undefined,
	},
]);
</script>

<template>
	<div data-test-id="execution-quota-table">
		<N8nDataTableServer
			v-model:page="page"
			v-model:items-per-page="itemsPerPage"
			:headers="headers"
			:items="pagedRows"
			:items-length="rows.length"
			:loading="isLoading"
			:row-props="{ class: $style.clickableRow }"
			@click:row="onRowClick"
		>
			<template #[`item.limit`]="{ item }">
				{{ item.limit === -1 ? '∞' : item.limit }}
			</template>
			<template #[`item.periodUnit`]="{ item }">
				{{ periodLabel(item.periodUnit) }}
			</template>
			<template #[`item.remaining`]="{ item }">
				{{ item.consumed }} / {{ item.remaining === null ? '∞' : item.remaining }}
			</template>
			<template #[`item.actions`]="{ item }">
				<div :class="$style.rowActions" @click.stop>
					<N8nActionDropdown
						:items="getRowActions()"
						placement="bottom-end"
						activator-size="small"
						activator-icon="ellipsis-vertical"
						data-test-id="execution-quota-actions-toggle"
						@select="(action) => onAction(action, item)"
					/>
				</div>
			</template>
		</N8nDataTableServer>
		<N8nText
			v-if="!isLoading && rows.length === 0"
			color="text-light"
			:class="$style.noResults"
			data-test-id="execution-quota-empty"
		>
			{{ i18n.baseText('settings.security.executionQuota.empty') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.rowActions {
	display: flex;
	justify-content: flex-end;
}

/* Rows open the edit modal on click; the cursor should say so. */
.clickableRow {
	cursor: pointer;
}

.noResults {
	display: block;
	padding: var(--spacing--lg) 0;
	text-align: center;
}
</style>
