<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { ProjectRole } from '@n8n/permissions';
import { useI18n } from '@n8n/i18n';
import {
	N8nUserInfo,
	N8nDataTableServer,
	N8nText,
	type ActionDropdownItem,
} from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import ProjectMembersRoleCell from '@/components/Projects/ProjectMembersRoleCell.vue';
import type { UsersInfoProps } from '@n8n/design-system/components/N8nUserInfo/UserInfo.vue';
import { isProjectRole } from '@/utils/typeGuards';
import type { ProjectMemberData } from '@/types/projects.types';

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

const roles = computed<Record<ProjectRole, { label: string; desc: string }>>(() => ({
	'project:admin': {
		label: i18n.baseText('projects.settings.role.admin'),
		desc: i18n.baseText('projects.settings.role.admin.description'),
	},
	'project:editor': {
		label: i18n.baseText('projects.settings.role.editor'),
		desc: i18n.baseText('projects.settings.role.editor.description'),
	},
	'project:viewer': {
		label: i18n.baseText('projects.settings.role.viewer'),
		desc: i18n.baseText('projects.settings.role.viewer.description'),
	},
	'project:personalOwner': {
		label: i18n.baseText('projects.settings.role.personalOwner'),
		desc: '',
	},
}));

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
