<script lang="ts" setup>
import { computed, ref } from 'vue';
import { type UsersList } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { type TableHeader } from '@n8n/design-system/components/N8nDataTableServer/N8nDataTableServer.vue';
import { N8nUserInfo, N8nDataTableServer } from '@n8n/design-system';
import SettingsUsersRoleCell from '@/components/SettingsUsers/SettingsUsersRoleCell.vue';
import SettingsUsersProjectsCell from '@/components/SettingsUsers/SettingsUsersProjectsCell.vue';
import type { UsersInfoProps } from '@n8n/design-system/components/N8nUserInfo/UserInfo.vue';

type Item = UsersList['items'][number];

const i18n = useI18n();

const props = defineProps<{
	data: UsersList;
	loading?: boolean;
}>();

const emit = defineEmits<{
	'update:options': [
		payload: {
			page: number;
			itemsPerPage: number;
			sortBy: Array<{ id: string; desc: boolean }>;
		},
	];
	'update:role': [payload: { role: string; userId: string }];
}>();

const rows = computed(() => props.data.items);
const headers = ref<Array<TableHeader<Item>>>([
	{
		title: i18n.baseText('settings.users.table.header.user'),
		key: 'name',
		width: 400,
		value(row) {
			return {
				...row,
				// TODO: Fix UsersInfoProps type, it should be aligned with the API response and implement 'isPending' instead of `isPendingUser`
				isPendingUser: row.isPending,
			};
		},
	},
	{
		title: i18n.baseText('settings.users.table.header.accountType'),
		key: 'role',
	},
	{
		title: i18n.baseText('settings.users.table.header.2fa'),
		key: 'mfaEnabled',
		value(row) {
			return row.mfaEnabled
				? i18n.baseText('settings.users.table.row.2fa.enabled')
				: i18n.baseText('settings.users.table.row.2fa.disabled');
		},
	},
	{
		title: i18n.baseText('projects.menu.title'),
		key: 'projects',
		disableSort: true,
		// TODO: Fix TableHeader type so it allows `disableSort` without `value` (which is not used here)
		value() {
			return;
		},
	},
]);

const onFilterChange = ($event: {
	page: number;
	itemsPerPage: number;
	sortBy: Array<{ id: string; desc: boolean }>;
}) => {
	emit('update:options', $event);
};
</script>

<template>
	<div>
		<N8nDataTableServer
			:headers="headers"
			:items="rows"
			:items-length="data.count"
			@update:options="onFilterChange"
		>
			<template #[`item.name`]="{ value }">
				<div class="pt-s pb-s">
					<N8nUserInfo v-bind="value as UsersInfoProps" />
				</div>
			</template>
			<template #[`item.role`]="{ item }">
				<SettingsUsersRoleCell :data="item" @update:role="$emit('update:role', $event)" />
			</template>
			<template #[`item.projects`]="{ item }">
				<SettingsUsersProjectsCell :data="item" />
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module></style>
