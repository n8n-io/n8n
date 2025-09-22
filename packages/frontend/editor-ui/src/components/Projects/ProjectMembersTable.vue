<script lang="ts" setup>
import ProjectMembersRoleCell from '@/components/Projects/ProjectMembersRoleCell.vue';
import type { ProjectMemberData } from '@/types/projects.types';
import {
	N8nDataTableServer,
	N8nText,
	N8nUserInfo,
	type ActionDropdownItem,
	type UserAction,
} from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import type { UsersInfoProps } from '@n8n/design-system/components/N8nUserInfo/UserInfo.vue';
import { useI18n } from '@n8n/i18n';
import type { ProjectRole } from '@n8n/permissions';
import { computed, ref } from 'vue';

const i18n = useI18n();

const props = defineProps<{
	data: { items: ProjectMemberData[]; count: number };
	loading?: boolean;
	currentUserId?: string;
	projectRoles: Array<{ slug: string; displayName: string; licensed: boolean }>;
	actions?: Array<UserAction<ProjectMemberData>>;
}>();

const emit = defineEmits<{
	'update:options': [payload: TableOptions];
	'update:role': [payload: { role: ProjectRole; userId: string }];
	action: [value: { action: string; userId: string }];
}>();

const tableOptions = defineModel<TableOptions>('tableOptions', {
	default: () => ({
		page: 0,
		itemsPerPage: 10,
		sortBy: [],
	}),
});

const rows = computed(() => props.data.items);
const headers = ref<Array<TableHeader<ProjectMemberData>>>([
	{
		title: i18n.baseText('projects.settings.table.header.user'),
		key: 'name',
		width: 400,
		disableSort: true,
		value: (row: ProjectMemberData) => row,
	},
	{
		title: i18n.baseText('projects.settings.table.header.role'),
		key: 'role',
		disableSort: true,
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

const roles = computed<Record<ProjectRole, { label: string; desc: string }>>(() =>
	props.projectRoles.reduce(
		(acc, role) => {
			acc[role.slug as ProjectRole] = {
				label: role.displayName,
				// @ts-ignore - backend type is incorrect
				desc: 'description' in role ? role.description : '',
			};
			console.log(acc);
			return acc;
		},
		{} as Record<ProjectRole, { label: string; desc: string }>,
	),
);

const roleActions = computed<Array<ActionDropdownItem<ProjectRole>>>(() =>
	props.projectRoles.map((role) => ({
		id: role.slug as ProjectRole,
		label: role.displayName,
		disabled: !role.licensed,
	})),
);

const canUpdateRole = (member: ProjectMemberData): boolean => member.id !== props.currentUserId;

const onRoleChange = ({ role, userId }: { role: ProjectRole; userId: string }) => {
	emit('update:role', { role, userId });
};

const filterActions = (member: ProjectMemberData) => {
	if (member.id === props.currentUserId || member.role === 'project:personalOwner') return [];
	return (props.actions ?? []).filter((action) => action.guard?.(member) ?? true);
};
</script>

<template>
	<div>
		<N8nDataTableServer
			v-model:sort-by="tableOptions.sortBy"
			v-model:page="tableOptions.page"
			:items-per-page="data.count"
			:headers="headers"
			:items="rows"
			:items-length="data.count"
			:loading="loading"
			:page-sizes="[data.count + 1]"
			@update:options="emit('update:options', $event)"
		>
			<template #[`item.name`]="{ value }">
				<div class="pt-xs pb-xs">
					<N8nUserInfo v-bind="value as UsersInfoProps" />
				</div>
			</template>
			<template #[`item.role`]="{ item }">
				<ProjectMembersRoleCell
					v-if="canUpdateRole(item)"
					:data="item"
					:roles="roles"
					:actions="roleActions"
					@update:role="onRoleChange"
				/>
				<N8nText v-else color="text-dark">{{ roles[item.role]?.label ?? item.role }}</N8nText>
			</template>
			<template #[`item.actions`]="{ item }">
				<ProjectMembersActionsCell
					:data="item"
					:actions="filterActions(item)"
					@action="$emit('action', $event)"
				/>
			</template>
		</N8nDataTableServer>
	</div>
</template>
