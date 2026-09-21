<script lang="ts" setup>
import {
	N8nDataTableServer,
	N8nText,
	N8nTooltip,
	N8nUserInfo,
	type UserAction,
} from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system';
import type { UsersInfoProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AllRolesMap, Role } from '@n8n/permissions';
import { computed, ref, useCssModule } from 'vue';
import type { ProjectMemberData } from '../projects.types';
import ProjectMembersActionsCell from './ProjectMembersActionsCell.vue';
import ProjectMembersRoleCell from './ProjectMembersRoleCell.vue';
const i18n = useI18n();
const $style = useCssModule();

const props = defineProps<{
	data: { items: ProjectMemberData[]; count: number };
	loading?: boolean;
	currentUserId?: string;
	projectRoles: AllRolesMap['project'];
	actions?: Array<UserAction<ProjectMemberData>>;
	canEditRole: boolean;
}>();

const emit = defineEmits<{
	'update:options': [payload: TableOptions];
	'update:role': [payload: { role: Role['slug']; userId: string }];
	'show-role-upgrade-dialog': [];
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
		width: 200,
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

// Access that comes from a global role is not editable here, so the row shows
// plain text instead of the role dropdown.
const canUpdateRole = (member: ProjectMemberData): boolean =>
	!member.alwaysHasAccess && member.id !== props.currentUserId && props.canEditRole;

const onRoleChange = ({ role, userId }: { role: Role['slug']; userId: string }) => {
	emit('update:role', { role, userId });
};

const filterActions = (member: ProjectMemberData) => {
	if (
		member.alwaysHasAccess ||
		member.id === props.currentUserId ||
		member.role === 'project:personalOwner'
	) {
		return [];
	}
	return (props.actions ?? []).filter((action) => action.guard?.(member) ?? true);
};

const rowProps = (member: ProjectMemberData) =>
	member.alwaysHasAccess ? { class: $style.alwaysHasAccessRow } : {};
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
			:row-props="rowProps"
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
					:roles="props.projectRoles"
					@update:role="onRoleChange"
					@show-role-upgrade-dialog="emit('show-role-upgrade-dialog')"
				/>
				<N8nTooltip
					v-else-if="item.alwaysHasAccess"
					:content="i18n.baseText('projects.settings.table.row.alwaysHasAccess.tooltip')"
					placement="top"
				>
					<N8nText color="text-dark" data-test-id="project-member-always-has-access">
						{{ item.globalRoleDisplayName ?? item.role }}
					</N8nText>
				</N8nTooltip>
				<N8nText v-else color="text-dark">
					{{ props.projectRoles.find((role) => role.slug === item.role)?.displayName ?? item.role }}
				</N8nText>
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

<style lang="scss" module>
.alwaysHasAccessRow {
	opacity: 0.6;
}
</style>
