<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { ProjectRole } from '@n8n/permissions';
import { useI18n } from '@n8n/i18n';
import type { TableHeader, TableOptions } from '@n8n/design-system/components/N8nDataTableServer';
import ProjectMembersRoleCell from './ProjectMembersRoleCell.vue';
import ProjectMembersActionsCell from './ProjectMembersActionsCell.vue';
import type { UsersInfoProps } from '@n8n/design-system/components/N8nUserInfo/UserInfo.vue';
import type { ProjectMemberData } from '../projects.types';
import {
	N8nDataTableServer,
	N8nText,
	N8nUserInfo,
	type ActionDropdownItem,
	type UserAction,
} from '@n8n/design-system';
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
	'show-upgrade-dialog': [];
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

const roleActions = computed<Array<ActionDropdownItem<ProjectRole>>>(() => [
	...props.projectRoles.map((role) => ({
		id: role.slug as ProjectRole,
		label: role.displayName,
		disabled: !role.licensed,
		badge: !role.licensed ? i18n.baseText('generic.upgrade') : undefined,
		badgeProps: !role.licensed ? { theme: 'warning', bold: true } : undefined,
	})),
]);

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
					@badge-click="emit('show-upgrade-dialog')"
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
