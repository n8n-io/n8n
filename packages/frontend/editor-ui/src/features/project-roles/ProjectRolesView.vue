<script setup lang="ts">
import { VIEWS } from '@/constants';
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

const rolesStore = useRolesStore();
const router = useRouter();

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

const actions = {
	set_default: (item: Role) => {
		// Handle set as default action
		console.log('Set as default:', item);
	},
	duplicate: (item: Role) => {
		// Handle duplicate action
		console.log('Duplicate:', item);
	},
	delete: (item: Role) => {
		// Handle delete action
		console.log('Delete:', item);
	},
} as const;

const rowActions = computed<Array<{ label: string; value: keyof typeof actions }>>(() => [
	{
		label: 'Set as default',
		value: 'set_default',
	},
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
	actions[action as keyof typeof actions](item);
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
