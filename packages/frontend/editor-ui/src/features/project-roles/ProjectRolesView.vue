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
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import type { Role } from '@n8n/permissions';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const { showError, showMessage } = useToast();

const rolesStore = useRolesStore();
const router = useRouter();
const message = useMessage();

const headers = ref<Array<TableHeader<Role>>>([
	{
		title: 'Name',
		key: 'displayName',
		width: 400,
		disableSort: true,
	},
	{
		title: 'Type',
		key: 'systemRole',
		disableSort: true,
	},
	{
		title: 'Assigned to',
		key: 'test',
		disableSort: true,
		value: () => '-',
		align: 'end',
		width: 75,
	},
	{
		title: 'Last edited',
		key: 'test2',
		disableSort: true,
		value: () => '-',
	},
	{
		title: '',
		key: 'actions',
		value: () => '',
		width: 50,
		minWidth: 50,
		disableSort: true,
		align: 'center',
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
	// TODO: implement in P1
	// set_default: (_item: Role) => {
	// },
	duplicate: duplicateRole,
	delete: deleteRole,
} as const;

const rowActions = computed<Array<{ label: string; value: keyof typeof actions }>>(() => [
	// TODO: implement in P1
	// {
	// 	label: 'Set as default',
	// 	value: 'set_default',
	// },
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
</script>

<template>
	<div>
		<div class="mb-xl" style="display: flex; justify-content: space-between; align-items: center">
			<N8nHeading tag="h1" size="2xlarge">Project Roles</N8nHeading>
			<N8nButton type="secondary" @click="router.push({ name: VIEWS.PROJECT_NEW_ROLE })">
				Add Role
			</N8nButton>
		</div>

		<N8nDataTableServer
			:items="rolesStore.processedProjectRoles"
			:headers="headers"
			:items-length="rolesStore.processedProjectRoles.length"
			:items-per-page="rolesStore.processedProjectRoles.length"
			:page-sizes="[rolesStore.processedProjectRoles.length]"
		>
			<template #[`item.displayName`]="{ item }">
				<template v-if="item.systemRole">
					<div>{{ item.displayName }}</div>
					<div>{{ item.description }}</div>
				</template>
				<RouterLink
					v-else
					:to="{ name: VIEWS.PROJECT_ROLE_SETTINGS, params: { roleSlug: item.slug } }"
				>
					<div>{{ item.displayName }}</div>
					<div>{{ item.description }}</div>
				</RouterLink>
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
