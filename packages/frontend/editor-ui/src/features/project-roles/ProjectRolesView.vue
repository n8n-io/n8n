<script setup lang="ts">
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { MODAL_CONFIRM, VIEWS } from '@/constants';
import { useRolesStore } from '@/stores/roles.store';
import {
	N8nActionToggle,
	N8nButton,
	N8nDataTableServer,
	N8nHeading,
	N8nIcon,
	N8nText,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import dateformat from 'dateformat';
import { computed, ref, useCssModule } from 'vue';
import { useRouter } from 'vue-router';

const { showError, showMessage } = useToast();

const rolesStore = useRolesStore();
const router = useRouter();
const message = useMessage();
const i18n = useI18n();
const $style = useCssModule();

const headers = ref<Array<TableHeader<Role>>>([
	{
		title: i18n.baseText('projectRoles.sourceControl.table.name'),
		key: 'displayName',
		width: 400,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('projectRoles.sourceControl.table.type'),
		key: 'systemRole',
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('projectRoles.sourceControl.table.assignedTo'),
		key: 'usedByUsers',
		disableSort: true,
		align: 'end',
		value: (item: Role) => item.usedByUsers ?? 0,
		width: 75,
		resize: false,
	},
	{
		title: i18n.baseText('projectRoles.sourceControl.table.lastEdited'),
		key: 'updatedAt',
		value: (item: Role) => (item.updatedAt ? dateformat(item.updatedAt, 'd mmm, yyyy') : ''),
		disableSort: true,
		resize: false,
	},
	{
		title: '',
		key: 'actions',
		value: () => '',
		width: 50,
		minWidth: 50,
		disableSort: true,
		align: 'center',
		resize: false,
	},
]);

async function deleteRole(item: Role) {
	const deleteConfirmed = await message.confirm(
		`Are you sure that you want to delete '${item.displayName}' permanently? This action cannot be undone.`,
		`Delete "${item.displayName}"?`,
		{
			type: 'warning',
			confirmButtonText: 'Delete',
			cancelButtonText: 'Cancel',
		},
	);

	if (deleteConfirmed !== MODAL_CONFIRM) {
		return;
	}

	try {
		await rolesStore.deleteProjectRole(item.slug);

		const index = rolesStore.roles.project.findIndex((role) => role.slug === item.slug);
		if (index !== -1) {
			rolesStore.roles.project.splice(index, 1);
		}

		showMessage({ title: 'Role deleted', type: 'success' });
	} catch (error) {
		showError(error, 'Error deleting role');
		return;
	}
}

async function duplicateRole(item: Role) {
	try {
		const displayName = `Copy of ${item.displayName}`;
		const role = await rolesStore.createProjectRole({
			displayName,
			description: item.description ?? undefined,
			roleType: 'project',
			scopes: item.scopes,
		});
		rolesStore.roles.project.push(role);

		showMessage({
			type: 'success',
			message: `Role "${item.displayName}" duplicated successfully as "${displayName}"`,
		});

		return role;
	} catch (error) {
		showError(error, 'Error duplicating role');
		return;
	}
}

const actions = {
	duplicate: duplicateRole,
	delete: deleteRole,
} as const;

function rowProps(row: Role) {
	const className = [$style.tallRow];

	if (!row.systemRole) {
		className.push($style.clickableRow);
	}

	return {
		class: className,
	};
}

const rowActions = computed<Array<{ label: string; value: keyof typeof actions }>>(() => [
	{
		label: 'Duplicate',
		value: 'duplicate',
	},
	{
		label: 'Delete',
		value: 'delete',
	},
]);

function handleAction(action: string, item: Role) {
	void actions[action as keyof typeof actions](item);
}

function handleRowClick(item: Role) {
	if (item.systemRole) return;
	void router.push({ name: VIEWS.PROJECT_ROLE_SETTINGS, params: { roleSlug: item.slug } });
}
</script>

<template>
	<div>
		<div class="mb-xl" :class="$style.headerContainer">
			<N8nHeading tag="h1" size="2xlarge">{{ i18n.baseText('settings.projectRoles') }}</N8nHeading>
			<N8nButton type="secondary" @click="router.push({ name: VIEWS.PROJECT_NEW_ROLE })">
				{{ i18n.baseText('projectRoles.addRole') }}
			</N8nButton>
		</div>

		<N8nDataTableServer
			:items="rolesStore.processedProjectRoles"
			:headers="headers"
			:items-length="rolesStore.processedProjectRoles.length"
			:items-per-page="rolesStore.processedProjectRoles.length"
			:page-sizes="[rolesStore.processedProjectRoles.length]"
			:row-props="rowProps"
			@click:row="(_event, { item }) => handleRowClick(item)"
		>
			<template #[`item.displayName`]="{ item }">
				<N8nText tag="div" class="mb-4xs">{{ item.displayName }}</N8nText>
				<N8nText tag="div" size="small" color="text-light">{{ item.description }}</N8nText>
			</template>
			<template #[`item.systemRole`]="{ item }">
				<template v-if="item.systemRole"> <N8nIcon icon="lock" /> System</template>
				<template v-else>Custom</template>
			</template>
			<template #[`item.actions`]="{ item }">
				<N8nActionToggle
					v-if="!item.systemRole"
					:actions="rowActions"
					@action="($event) => handleAction($event, item)"
				/>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="css" module>
.headerContainer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.clickableRow {
	cursor: pointer;
}

.tallRow {
	height: 64px;
}
</style>
