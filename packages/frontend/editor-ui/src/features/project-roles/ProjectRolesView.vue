<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import {
	N8nActionBox,
	N8nActionToggle,
	N8nButton,
	N8nDataTableServer,
	N8nHeading,
	N8nIcon,
	N8nTag,
	N8nText,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import dateformat from 'dateformat';
import { onMounted, ref, useCssModule } from 'vue';
import { useRouter } from 'vue-router';

const { showError, showMessage } = useToast();

const rolesStore = useRolesStore();
const router = useRouter();
const message = useMessage();
const i18n = useI18n();
const $style = useCssModule();
const settingsStore = useSettingsStore();
const { goToUpgrade } = usePageRedirectionHelper();
const telemetry = useTelemetry();

onMounted(() => {
	useDocumentTitle().set(i18n.baseText('settings.projectRoles'));
});

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
		value: (item: Role) =>
			item.updatedAt && !item.systemRole ? dateformat(item.updatedAt, 'd mmm, yyyy') : '—',
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
	i18n.baseText('projectRoles.action.delete.text', {
		interpolate: {
			roleName: item.displayName,
		},
	});
	const deleteConfirmed = await message.confirm(
		i18n.baseText('projectRoles.action.delete.text', {
			interpolate: {
				roleName: item.displayName,
			},
		}),
		i18n.baseText('projectRoles.action.delete.title', {
			interpolate: {
				roleName: item.displayName,
			},
		}),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('projectRoles.action.delete'),
			cancelButtonText: i18n.baseText('projectRoles.action.cancel'),
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

		showMessage({ title: i18n.baseText('projectRoles.action.delete.success'), type: 'success' });
	} catch (error) {
		showError(error, i18n.baseText('projectRoles.action.delete.error'));
		return;
	}
}

async function duplicateRole(item: Role) {
	try {
		const displayName = i18n.baseText('projectRoles.action.duplicate.name', {
			interpolate: {
				roleName: item.displayName,
			},
		});
		const role = await rolesStore.createProjectRole({
			displayName,
			description: item.description ?? undefined,
			roleType: 'project',
			scopes: item.scopes,
		});

		// optimistic update
		rolesStore.roles.project.push(role);
		void rolesStore.fetchRoles();

		telemetry.track('User duplicated role', {
			role_id: item.slug,
			role_name: item.displayName,
			permissions: item.scopes,
		});

		showMessage({
			type: 'success',
			message: i18n.baseText('projectRoles.action.duplicate.success', {
				interpolate: {
					roleName: item.displayName,
					roleDuplicateName: displayName,
				},
			}),
		});

		return role;
	} catch (error) {
		showError(error, i18n.baseText('projectRoles.action.duplicate.error'));
		return;
	}
}

const actions = {
	duplicate: duplicateRole,
	delete: deleteRole,
} as const;

function rowProps(_row: Role) {
	return {
		class: [$style.tallRow, $style.clickableRow],
	};
}

function rowActions(
	item: Role,
): Array<{ label: string; value: keyof typeof actions; disabled?: boolean }> {
	return [
		{
			label: i18n.baseText('projectRoles.action.duplicate'),
			value: 'duplicate',
		},
		{
			label: i18n.baseText('projectRoles.action.delete'),
			value: 'delete',
			disabled: item.usedByUsers !== 0,
		},
	];
}

function handleAction(action: string, item: Role) {
	void actions[action as keyof typeof actions](item);
}

function handleRowClick(item: Role) {
	// System roles → view route, custom roles → edit route
	void router.push({
		name: item.systemRole ? VIEWS.PROJECT_ROLE_VIEW : VIEWS.PROJECT_ROLE_SETTINGS,
		params: { roleSlug: item.slug },
	});
}

function addRole() {
	telemetry.track('User clicked add role');
	void router.push({ name: VIEWS.PROJECT_NEW_ROLE });
}
</script>

<template>
	<div class="pb-xl">
		<div class="mb-xl" :class="$style.headerContainer">
			<div :class="$style.headerTitle">
				<N8nHeading tag="h1" size="2xlarge">
					{{ i18n.baseText('settings.projectRoles') }}
				</N8nHeading>
				<N8nTag :clickable="false" text="Beta" />
			</div>
			<N8nButton variant="subtle" v-if="settingsStore.isCustomRolesFeatureEnabled" @click="addRole">
				{{ i18n.baseText('projectRoles.addRole') }}
			</N8nButton>
		</div>

		<template v-if="!settingsStore.isCustomRolesFeatureEnabled">
			<N8nActionBox
				class="mt-2xl mb-l"
				:button-text="i18n.baseText('settings.externalSecrets.actionBox.buttonText')"
				description="yes"
				@click="goToUpgrade('custom-roles', 'upgrade-custom-roles')"
			>
				<template #heading>
					<span>{{ i18n.baseText('projectRoles.manageRoles.paywall.title') }}</span>
				</template>
				<template #description>
					{{ i18n.baseText('projectRoles.manageRoles.paywall.text') }}
				</template>
			</N8nActionBox>
		</template>
		<template v-else>
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
					<template v-if="item.systemRole">
						<N8nIcon icon="lock" /> {{ i18n.baseText('projectRoles.literal.system') }}</template
					>
					<template v-else>
						<N8nIcon icon="user-pen" /> {{ i18n.baseText('projectRoles.literal.custom') }}</template
					>
				</template>
				<template #[`item.actions`]="{ item }">
					<N8nActionToggle
						v-if="!item.systemRole"
						:actions="rowActions(item)"
						@action="($event) => handleAction($event, item)"
					/>
				</template>
			</N8nDataTableServer>
		</template>
	</div>
</template>

<style lang="css" module>
.headerContainer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: 8px;
}

.clickableRow {
	cursor: pointer;
}

.tallRow {
	height: 64px;
}
</style>
