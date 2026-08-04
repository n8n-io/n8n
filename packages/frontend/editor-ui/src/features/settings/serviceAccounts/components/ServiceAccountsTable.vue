<script lang="ts" setup>
import type { ServiceAccountsList } from '@n8n/api-types';
import { N8nAvatar, N8nBadge, N8nDataTableServer, N8nText } from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import type { UserAction } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { VIEWS } from '@/app/constants';
import { hasPermission } from '@/app/utils/rbac/permissions';
import SettingsUsersActionsCell from '@/features/settings/users/components/SettingsUsersActionsCell.vue';
import SettingsUsersRoleCell from '@/features/settings/users/components/SettingsUsersRoleCell.vue';

import { getServiceAccountDisplayName } from '../serviceAccounts.utils';

type Item = ServiceAccountsList['items'][number];

const i18n = useI18n();

const props = defineProps<{
	data: ServiceAccountsList;
	actions: Array<UserAction<Item>>;
	loading?: boolean;
	updatingRoleId?: string | null;
}>();

const emit = defineEmits<{
	'update:options': [payload: TableOptions];
	'update:role': [payload: { role: string; userId: string }];
	action: [value: { action: string; userId: string }];
}>();

const tableOptions = defineModel<TableOptions>('tableOptions', {
	default: () => ({}),
});

const rows = computed(() => props.data.items);

// Three columns only. The Users table's `lastActiveAt`, `mfaEnabled` and
// `projects` columns are meaningless or actively misleading for a service
// account — a permanent "Disabled" under 2FA reads as a security warning.
const headers = ref<Array<TableHeader<Item>>>([
	{
		title: i18n.baseText('settings.serviceAccounts.table.header.name'),
		key: 'name',
		width: 340,
		value: (row) => getServiceAccountDisplayName(row),
	},
	{
		title: i18n.baseText('settings.serviceAccounts.table.header.role'),
		key: 'role',
		width: 220,
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 46,
		disableSort: true,
		value() {
			return;
		},
	},
]);

const canUpdateRole = computed(() =>
	hasPermission(['rbac'], { rbac: { scope: 'serviceAccount:update' } }),
);

const onRoleChange = ({ role, userId }: { role: string; userId: string }) => {
	emit('update:role', { role, userId });
};

/**
 * Same guard pattern as the Users table: let each action veto its own row.
 *
 * `guard` is dropped from the result once evaluated. It is the only
 * row-type-dependent member of `UserAction`, so removing it makes the array
 * assignable to the reused actions cell's `UserAction<IUser>` without a cast.
 */
const filterActions = (serviceAccount: Item) =>
	props.actions
		.filter((action) => action.guard?.(serviceAccount) ?? true)
		.map(({ guard: _guard, ...action }) => action);
</script>

<template>
	<N8nDataTableServer
		v-model:sort-by="tableOptions.sortBy"
		v-model:page="tableOptions.page"
		v-model:items-per-page="tableOptions.itemsPerPage"
		:headers="headers"
		:items="rows"
		:items-length="data.count"
		:loading="props.loading"
		:page-sizes="[10, 25, 50]"
		data-test-id="service-accounts-table"
		@update:options="emit('update:options', $event)"
	>
		<template #[`item.name`]="{ item }">
			<div :class="$style.nameCell">
				<N8nAvatar :first-name="item.name ?? ''" size="small" />
				<div :class="$style.nameText">
					<N8nText color="text-dark" bold :class="$style.truncate">
						{{ getServiceAccountDisplayName(item) }}
					</N8nText>
					<N8nText size="small" color="text-light" :class="$style.truncate">
						{{ item.email }}
					</N8nText>
				</div>
				<N8nBadge v-if="item.disabled" theme="danger">
					{{ i18n.baseText('settings.serviceAccounts.table.row.disabled') }}
				</N8nBadge>
			</div>
		</template>
		<template #[`item.role`]="{ item }">
			<SettingsUsersRoleCell
				:data="item"
				:loading="props.updatingRoleId === item.id"
				change-role-scope="serviceAccount:update"
				:from-view="VIEWS.SERVICE_ACCOUNTS_SETTINGS"
				:editable="canUpdateRole"
				@update:role="onRoleChange"
			/>
		</template>
		<template #[`item.actions`]="{ item }">
			<SettingsUsersActionsCell
				:data="item"
				:actions="filterActions(item)"
				@action="emit('action', $event)"
			/>
		</template>
	</N8nDataTableServer>
</template>

<style lang="scss" module>
.nameCell {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding-block: var(--spacing--2xs);
	min-width: 0;
}

.nameText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.truncate {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
