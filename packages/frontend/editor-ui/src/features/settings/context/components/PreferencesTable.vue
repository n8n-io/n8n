<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nDataTableServer, N8nText, N8nTooltip } from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system';

import PreferenceScopeBadge from './PreferenceScopeBadge.vue';
import { PREFERENCES_PAGE_SIZES } from '../context.constants';
import type { Preference } from '../context.types';
import { preferenceScope, toPreferencePermissions } from '../context.utils';

const props = defineProps<{
	preferences: Preference[];
	itemsLength: number;
	loading?: boolean;
}>();

const emit = defineEmits<{
	edit: [preference: Preference];
	delete: [preference: Preference];
	'update:options': [payload: TableOptions];
}>();

const tableOptions = defineModel<TableOptions>('tableOptions', { default: () => ({}) });
const selection = defineModel<string[]>('selection', { default: () => [] });

const i18n = useI18n();

function permissions(preference: Preference) {
	return toPreferencePermissions(preference);
}

/** Rows the viewer cannot delete stay unselectable, so bulk delete never offers a no-op. */
function isSelectable(preference: Preference) {
	return permissions(preference).delete;
}

const readOnlyHint = computed(() => i18n.baseText('settings.context.preferences.readOnly.tooltip'));

// Sorting is off until the endpoints support an ORDER BY.
const headers = computed<Array<TableHeader<Preference>>>(() => [
	{
		title: i18n.baseText('settings.context.preferences.columns.preference'),
		key: 'content',
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
		title: '',
		key: 'actions',
		align: 'end',
		width: 160,
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
			v-model:selection="selection"
			:headers="headers"
			:items="props.preferences"
			:items-length="props.itemsLength"
			:loading="props.loading"
			:page-sizes="PREFERENCES_PAGE_SIZES"
			:row-props="{ class: $style.row }"
			show-select
			:item-selectable="isSelectable"
			@update:options="emit('update:options', $event)"
		>
			<template #cover>
				<slot name="empty" />
			</template>

			<template #[`item.content`]="{ item }">
				<N8nText :class="$style.text">{{ item.content }}</N8nText>
			</template>

			<template #[`item.scope`]="{ item }">
				<PreferenceScopeBadge :scope-type="preferenceScope(item)" :project="item.project" />
			</template>

			<template #[`item.actions`]="{ item }">
				<div :class="$style.actions" @click.stop>
					<N8nTooltip :disabled="permissions(item).update" :content="readOnlyHint">
						<span>
							<N8nButton
								variant="outline"
								size="small"
								:disabled="!permissions(item).update"
								:label="i18n.baseText('settings.context.preferences.actions.edit')"
								data-test-id="preference-edit-button"
								@click="emit('edit', item)"
							/>
						</span>
					</N8nTooltip>
					<N8nTooltip :disabled="permissions(item).delete" :content="readOnlyHint">
						<span>
							<N8nButton
								variant="outline"
								size="small"
								:disabled="!permissions(item).delete"
								:label="i18n.baseText('settings.context.preferences.actions.delete')"
								data-test-id="preference-delete-button"
								@click="emit('delete', item)"
							/>
						</span>
					</N8nTooltip>
				</div>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.text {
	display: block;
	white-space: normal;
	overflow-wrap: anywhere;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	/* Revealed on hover, per the row-action pattern; focus keeps it reachable by keyboard. */
	opacity: 0;
	transition: opacity 0.1s ease-in;
}

.row {
	&:hover .actions,
	&:focus-within .actions {
		opacity: 1;
	}
}
</style>
