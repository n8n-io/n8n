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
}>();

const rows = computed(() => props.data.items);
const roles = computed(() => ({
	[ROLE.Owner]: { label: i18n.baseText('auth.roles.owner'), desc: '' },
	[ROLE.Admin]: {
		label: i18n.baseText('auth.roles.admin'),
		desc: i18n.baseText('settings.users.table.row.role.description.admin'),
	},
	[ROLE.Member]: {
		label: i18n.baseText('auth.roles.member'),
		desc: i18n.baseText('settings.users.table.row.role.description.member'),
	},
	[ROLE.Default]: { label: i18n.baseText('auth.roles.default'), desc: '' },
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
			radioValue: Role;
			dropdownItems: ActionDropdownItem[];
		} {
			return {
				userId: row.id,
				roleId: row.role,
				label: roles.value[row.role].label ?? i18n.baseText('auth.roles.default'),
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
							<N8nText color="text-dark">{{ value.label }}</N8nText>
							<N8nIcon class="ml-2xs" icon="chevron-down" size="small" />
						</span>
					</template>
					<template #menuItem="item">
						<N8nText
							v-if="item.id === 'remove-user'"
							color="text-dark"
							:class="$style.removeUser"
							>{{ item.label }}</N8nText
						>
						<ElRadio
							v-else
							:model-value="value.radioValue"
							:label="item.id"
							@update:model-value="value.radioValue = item.id"
						>
							<span :class="$style.radioLabel">
								<N8nText color="text-dark" class="pb-3xs">{{ item.label }}</N8nText>
								<N8nText color="text-dark" size="small">{{ roles[item.id].desc }}</N8nText>
							</span>
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

<style lang="scss" module>
.radioLabel {
	max-width: 268px;
	display: inline-flex;
	flex-direction: column;
	padding: var(--spacing-2xs) 0;

	span {
		white-space: normal;
	}
}

.removeUser {
	display: block;
	padding: var(--spacing-2xs) var(--spacing-l);
}
</style>
