<script lang="ts" setup>
import ProjectMembersRoleCell from '@/components/Projects/ProjectMembersRoleCell.vue';
import type { ProjectMemberData } from '@/types/projects.types';
import { isProjectRole } from '@/utils/typeGuards';
import {
	N8nDataTableServer,
	N8nText,
	N8nUserInfo,
	type ActionDropdownItem,
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
}>();

const emit = defineEmits<{
	'update:options': [payload: TableOptions];
	'update:role': [payload: { role: ProjectRole | 'remove'; userId: string }];
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

const roleActions = computed<Array<ActionDropdownItem<ProjectRole | 'remove'>>>(() => [
	...props.projectRoles.map((role) => ({
		id: role.slug as ProjectRole,
		label: role.displayName,
		disabled: !role.licensed,
	})),
	{
		id: 'remove',
		label: i18n.baseText('projects.settings.table.row.removeUser'),
		divided: true,
	},
]);

const canUpdateRole = (member: ProjectMemberData): boolean => {
	// User cannot change their own role or remove themselves
	return member.id !== props.currentUserId;
};

const onRoleChange = ({ role, userId }: { role: ProjectRole | 'remove'; userId: string }) => {
	emit('update:role', { role, userId });
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
				<N8nText v-else color="text-dark">{{
					isProjectRole(item.role) ? roles[item.role]?.label || item.role : item.role
				}}</N8nText>
			</template>
		</N8nDataTableServer>
	</div>
</template>
