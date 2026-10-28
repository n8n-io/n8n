<script lang="ts" setup>
import { computed, useCssModule } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nActionToggle, N8nDataTableServer, N8nText, N8nUserInfo } from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system';

import { useUsersStore } from '@n8n/stores/users.store';

import TimeAgo from '@/app/components/TimeAgo.vue';

import PreferenceContentCell from './PreferenceContentCell.vue';
import PreferenceScopeBadge from './PreferenceScopeBadge.vue';
import { PREFERENCES_PAGE_SIZES } from '../context.constants';
import type { Preference } from '../context.types';
import { preferenceScope, toPreferencePermissions } from '../context.utils';

type PreferenceAction = 'edit' | 'delete';

/** The fields of the action toggle item that this menu uses. */
type PreferenceActionItem = {
	value: PreferenceAction;
	label: string;
	disabled?: boolean;
	tooltip?: string;
	destructive?: boolean;
};

const props = defineProps<{
	preferences: Preference[];
	itemsLength: number;
	loading?: boolean;
	/** The table renders its cover row whenever the slot exists, so the slot is withheld. */
	showEmpty?: boolean;
}>();

const emit = defineEmits<{
	edit: [preference: Preference];
	delete: [preference: Preference];
	'update:options': [payload: TableOptions];
}>();

const tableOptions = defineModel<TableOptions>('tableOptions', { default: () => ({}) });
const selection = defineModel<string[]>('selection', { default: () => [] });

const i18n = useI18n();
const usersStore = useUsersStore();
const $style = useCssModule();

function permissions(preference: Preference) {
	return toPreferencePermissions(preference);
}

/** Rows the viewer cannot delete stay unselectable, so bulk delete never offers a no-op. */
function isSelectable(preference: Preference) {
	return permissions(preference).delete;
}

const readOnlyHint = computed(() => i18n.baseText('settings.context.preferences.readOnly.tooltip'));

function actionsFor(preference: Preference): PreferenceActionItem[] {
	const { update, delete: canDelete } = permissions(preference);
	return [
		{
			value: 'edit',
			label: i18n.baseText('settings.context.preferences.actions.edit'),
			disabled: !update,
			tooltip: update ? undefined : readOnlyHint.value,
		},
		{
			value: 'delete',
			label: i18n.baseText('settings.context.preferences.actions.delete'),
			disabled: !canDelete,
			tooltip: canDelete ? undefined : readOnlyHint.value,
			destructive: true,
		},
	];
}

function onAction(preference: Preference, action: PreferenceAction) {
	if (action === 'edit') emit('edit', preference);
	else emit('delete', preference);
}

/** The selection checkbox lives in the first cell, so a click there selects and does not open. */
function isSelectCellClick(event: MouseEvent) {
	return event.target instanceof Element && event.target.closest('td')?.cellIndex === 0;
}

// The modal has no read-only mode, so only a row the viewer may change opens it.
function onRowClick(event: MouseEvent, payload: { item: Preference }) {
	if (isSelectCellClick(event) || !permissions(payload.item).update) return;
	emit('edit', payload.item);
}

function rowProps(preference: Preference) {
	return { class: { [$style.row]: permissions(preference).update } };
}

// The widths are pixel sizes that sum to the table's minimum width, so a new column takes its
// room from the others, not from the page.
const headers = computed<Array<TableHeader<Preference>>>(() => [
	{
		title: i18n.baseText('settings.context.preferences.columns.preference'),
		key: 'content',
		width: 510,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.preferences.columns.scope'),
		// Not a column on the row: derived from the userId/projectId tri-state.
		key: 'scope',
		value: (row) => preferenceScope(row),
		width: 220,
		disableSort: true,
		resize: false,
	},
	{
		// Names the surface that wrote the row, so a person can recognise what a connected AI
		// tool saved on their behalf and take it back.
		title: i18n.baseText('settings.context.preferences.columns.createdBy'),
		key: 'createdBy',
		width: 220,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.preferences.columns.updatedAt'),
		key: 'updatedAt',
		width: 130,
		resize: false,
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 64,
		disableSort: true,
		resize: false,
		value: () => undefined,
	},
]);
</script>

<template>
	<div data-test-id="preferences-table">
		<N8nDataTableServer
			v-model:page="tableOptions.page"
			v-model:items-per-page="tableOptions.itemsPerPage"
			:sort-by="tableOptions.sortBy"
			v-model:selection="selection"
			:headers="headers"
			:items="props.preferences"
			:items-length="props.itemsLength"
			:loading="props.loading"
			:page-sizes="PREFERENCES_PAGE_SIZES"
			:row-props="rowProps"
			show-select
			:item-selectable="isSelectable"
			@update:options="emit('update:options', $event)"
			@click:row="onRowClick"
		>
			<template v-if="props.showEmpty" #cover>
				<slot name="empty" />
			</template>

			<template #[`item.content`]="{ item }">
				<PreferenceContentCell :content="item.content" />
			</template>

			<template #[`item.scope`]="{ item }">
				<PreferenceScopeBadge :preference="item" />
			</template>

			<template #[`item.createdBy`]="{ item }">
				<div :class="$style.creator" data-test-id="preference-created-by">
					<N8nUserInfo
						v-if="item.createdBy"
						:first-name="item.createdBy.firstName"
						:last-name="item.createdBy.lastName"
						:email="item.createdBy.email"
						:is-current-user="item.createdBy.id === usersStore.currentUserId"
					/>
					<N8nText
						v-if="!item.createdBy || item.source !== 'ui'"
						size="small"
						color="text-light"
						data-test-id="preference-source"
					>
						{{ i18n.baseText(`settings.context.preferences.source.${item.source}`) }}
					</N8nText>
				</div>
			</template>

			<template #[`item.updatedAt`]="{ item }">
				<N8nText size="small" color="text-base" data-test-id="preference-updated-at">
					<TimeAgo :date="item.updatedAt" />
				</N8nText>
			</template>

			<template #[`item.actions`]="{ item }">
				<div :class="$style.actions" @click.stop>
					<N8nActionToggle
						:actions="actionsFor(item)"
						data-test-id="preference-actions"
						@action="(action: PreferenceAction) => onAction(item, action)"
					/>
				</div>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.creator {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding-block: var(--spacing--2xs);
	min-width: 0;
}

.actions {
	display: flex;
	justify-content: flex-end;
}

.row {
	cursor: pointer;
}
</style>
