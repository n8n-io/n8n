<script lang="ts" setup>
import { computed, ref } from 'vue';
import { type Role, ROLE, type UsersList } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { type TableHeader } from '@n8n/design-system/components/N8nDataTableServer/N8nDataTableServer.vue';
import {
	N8nActionDropdown,
	N8nUserInfo,
	N8nIcon,
	N8nDataTableServer,
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

const rows = computed(() => props.data.items);
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
			return {
				...row,
				isPendingUser: row.isPending,
			};
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
				radioValue: row.role,
				dropdownItems: [
					{
						id: ROLE.Member,
						label: i18n.baseText('auth.roles.member'),
					},
					{
						id: ROLE.Admin,
						label: i18n.baseText('auth.roles.admin'),
					},
					{
						id: 'remove-user',
						label: i18n.baseText('settings.users.table.row.removeUser'),
						divided: true,
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

const onFilterChange = ($event: {
	page: number;
	itemsPerPage: number;
	sortBy: Array<{ id: string; desc: boolean }>;
}) => {
	emit('update:options', $event);
};

const onActionSelect = (value) => {
	console.log('value', value);
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
					<N8nUserInfo v-bind="value" />
				</div>
			</template>
			<template #[`item.role`]="{ value }">
				<N8nActionDropdown
					v-if="value.isEditable"
					placement="bottom-start"
					:items="value.dropdownItems"
					@select="() => onActionSelect(value)"
				>
					<template #activator>
						<span>
							<N8nText color="text-dark" size="large">{{ value.label }}</N8nText>
							<N8nIcon icon="chevron-down" size="small" />
						</span>
					</template>
					<template #menuItem="item">
						<N8nText v-if="item.id === 'remove-user'" color="text-dark" size="large">{{
							item.label
						}}</N8nText>
						<ElRadio
							v-else
							:model-value="value.radioValue"
							:label="item.id"
							@update:model-value="value.radioValue = item.id"
						>
							<N8nText color="text-dark" size="large">{{ item.label }}</N8nText>
						</ElRadio>
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
