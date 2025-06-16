<script lang="ts" setup>
import { computed, ref } from 'vue';
import { type Role, ROLE, type UsersList } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import N8nDataTableServer, {
	type TableHeader,
} from '@n8n/design-system/components/N8nDataTableServer/N8nDataTableServer.vue';
import {
	N8nActionDropdown,
	N8nUserInfo,
	N8nIcon,
	type ActionDropdownItem,
} from '@n8n/design-system';
import { DateTime } from 'luxon';

type Item = UsersList['data'][number];

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
}>();

const rows = computed(() => props.data.data);
const roles = computed(() => ({
	[ROLE.Owner]: i18n.baseText('auth.roles.owner'),
	[ROLE.Admin]: i18n.baseText('auth.roles.admin'),
	[ROLE.Member]: i18n.baseText('auth.roles.member'),
	[ROLE.Default]: i18n.baseText('auth.roles.default'),
}));
const headers = ref<Array<TableHeader<Item>>>([
	{
		title: i18n.baseText('settings.users.table.header.user'),
		key: 'name',
		width: 400,
		value(row) {
			return row;
		},
	},
	{
		title: i18n.baseText('settings.users.table.header.accountType'),
		key: 'role',
		value(row): {
			userId: string;
			roleId: Role;
			label: string;
			isEditable: boolean;
			dropdownItems: ActionDropdownItem[];
		} {
			return {
				userId: row.id,
				roleId: row.role,
				label: roles.value[row.role] ?? i18n.baseText('auth.roles.default'),
				isEditable: row.role !== ROLE.Owner,
				dropdownItems: [
					{
						id: ROLE.Member,
						label: i18n.baseText('auth.roles.member'),
					},
					{
						id: ROLE.Admin,
						label: i18n.baseText('auth.roles.admin'),
					},
				],
			};
		},
	},
	{
		title: i18n.baseText('settings.users.table.header.lastActive'),
		key: 'lastActive',
		value(row) {
			return DateTime.now().diff(DateTime.fromISO(row.lastActive), ['days']).toHuman();
		},
	},
	{
		title: i18n.baseText('projects.menu.title'),
		key: 'projects',
		disableSort: true,
		value(row) {
			return row.projects ?? [i18n.baseText('settings.users.table.row.allProjects')];
		},
	},
]);
</script>

<template>
	<div>
		<N8nDataTableServer
			:headers="headers"
			:items="rows"
			:items-length="data.count"
			@update:options="emit('update:options', $event)"
		>
			<template #[`item.name`]="{ value }">
				<div class="pt-s pb-s">
					<N8nUserInfo v-bind="value" />
				</div>
			</template>
			<template #[`item.role`]="{ value }">
				<N8nActionDropdown
					v-if="value.isEditable"
					placement="bottom-start"
					:items="value.dropdownItems"
				>
					<template #activator>
						<span>
							{{ value.label }}
							<N8nIcon icon="chevron-down" size="small" />
						</span>
					</template>
					<template #menuItem="item">
						<span>{{ item.label }}</span>
					</template>
				</N8nActionDropdown>
				<span v-else>{{ value.label }}</span>
			</template>
			<template #[`item.projects`]="{ value }">
				<span>{{ value.join(', ') }}</span>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module></style>
