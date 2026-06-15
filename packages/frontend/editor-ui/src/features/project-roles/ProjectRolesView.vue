<script setup lang="ts">
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { CUSTOM_ROLES_DOCS_URL, MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import {
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
import { RouterLink, useRouter } from 'vue-router';

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
		title: i18n.baseText('projectRoles.sourceControl.table.projectsAssigned'),
		key: 'usedByProjects',
		disableSort: true,
		align: 'end',
		value: (item: Role) => item.usedByProjects ?? 0,
		width: 120,
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
	// When role is in use, show "Go to assignments" dialog instead of delete confirmation
	if (item.usedByProjects && item.usedByProjects > 0) {
		const inUseText =
			[
				i18n.baseText('projectRoles.action.delete.useWarning.before'),
				i18n.baseText('projectRoles.action.delete.useWarning.linkText', {
					adjustToNumber: item.usedByProjects,
					interpolate: { count: item.usedByProjects },
				}),
			].join(' ') +
			'. ' +
			i18n.baseText('projectRoles.action.delete.useWarning.after');

		const goToAssignments = await message.confirm(
			inUseText,
			i18n.baseText('projectRoles.action.delete.inUse.title', {
				interpolate: {
					roleName: item.displayName,
				},
			}),
			{
				type: 'warning',
				confirmButtonText: i18n.baseText('projectRoles.action.delete.inUse.goToAssignments'),
				cancelButtonText: i18n.baseText('projectRoles.action.cancel'),
			},
		);

		if (goToAssignments === MODAL_CONFIRM) {
			void router.push({
				name: item.systemRole ? VIEWS.PROJECT_ROLE_VIEW : VIEWS.PROJECT_ROLE_SETTINGS,
				params: { roleSlug: item.slug },
				query: { tab: 'assignments' },
			});
		}
		return;
	}

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
	_item: Role,
): Array<{ label: string; value: keyof typeof actions; disabled?: boolean }> {
	return [
		{
			label: i18n.baseText('projectRoles.action.duplicate'),
			value: 'duplicate',
		},
		{
			label: i18n.baseText('projectRoles.action.delete'),
			value: 'delete',
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
				<N8nTag :clickable="false" text="New" :class="$style.newTag" />
			</div>
			<N8nButton variant="subtle" v-if="settingsStore.isCustomRolesFeatureEnabled" @click="addRole">
				{{ i18n.baseText('projectRoles.addRole') }}
			</N8nButton>
		</div>

		<template v-if="!settingsStore.isCustomRolesFeatureEnabled">
			<div :class="$style.paywallContainer">
				<div :class="$style.paywallIcons">
					<div :class="[$style.iconBox, $style.iconBoxLeft]">
						<N8nIcon icon="eye-off" :size="20" color="foreground-xdark" />
					</div>
					<div :class="[$style.iconBox, $style.iconBoxCenter]">
						<N8nIcon icon="shield-user" :size="20" color="foreground-xdark" />
					</div>
					<div :class="[$style.iconBox, $style.iconBoxRight]">
						<N8nIcon icon="pencil-off" :size="20" color="foreground-xdark" />
					</div>
				</div>
				<div :class="$style.paywallText">
					<N8nText tag="p" size="medium" :bold="true" align="center">
						{{ i18n.baseText('projectRoles.paywall.title') }}
					</N8nText>
					<N8nText tag="p" color="text-light" align="center">
						{{ i18n.baseText('projectRoles.paywall.description') }}
					</N8nText>
				</div>
				<div :class="$style.paywallActions">
					<N8nButton variant="outline" size="medium" :href="CUSTOM_ROLES_DOCS_URL" target="_blank">
						{{ i18n.baseText('generic.learnMore') }}
						<N8nIcon icon="external-link" size="small" />
					</N8nButton>
					<N8nButton
						variant="solid"
						size="medium"
						@click="goToUpgrade('custom-roles-list', 'upgrade-custom-roles')"
					>
						{{
							settingsStore.isCloudDeployment
								? i18n.baseText('projectRoles.paywall.viewPlans')
								: i18n.baseText('generic.upgrade')
						}}
					</N8nButton>
				</div>
			</div>
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
				<template #[`item.usedByProjects`]="{ item }">
					<RouterLink
						v-if="(item.usedByProjects ?? 0) > 0"
						:to="{
							name: item.systemRole ? VIEWS.PROJECT_ROLE_VIEW : VIEWS.PROJECT_ROLE_SETTINGS,
							params: { roleSlug: item.slug },
							query: { tab: 'assignments' },
						}"
						:class="$style.projectCountLink"
						@click.stop
					>
						{{ item.usedByProjects }}
					</RouterLink>
					<template v-else>0</template>
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
	gap: var(--spacing--2xs);
}

.newTag {
	background-color: var(--color--foreground--shade-2);
	color: var(--color--background);
	border-color: var(--color--foreground--shade-2);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	border-radius: var(--spacing--sm);
	min-height: auto;
	height: auto;
	line-height: 1;
}

.paywallContainer {
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--spacing--3xl);
	gap: var(--spacing--lg);
}

.paywallIcons {
	display: flex;
	align-items: center;
	justify-content: center;
}

.iconBox {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	background: var(--color--foreground--tint-2);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	box-shadow:
		0 0 0.5px 0 light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100)),
		0 3px 8px 0 light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100)),
		0 1px 3px 0 light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
}

.iconBoxLeft {
	transform: rotate(-8deg);
	margin: var(--spacing--2xs) var(--spacing--5xs) 0 0;
}

.iconBoxCenter {
	z-index: 1;
	box-shadow:
		0 0 0.5px 0 light-dark(var(--color--black-alpha-200), var(--color--white-alpha-200)),
		0 5px 12px 0 light-dark(var(--color--black-alpha-300), var(--color--white-alpha-200)),
		0 1px 3px 0 light-dark(var(--color--black-alpha-200), var(--color--white-alpha-100));
	margin: 0 -3px;
}

.iconBoxRight {
	transform: rotate(8deg);
	margin: var(--spacing--2xs) 0 0 var(--spacing--5xs);
}

.paywallText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	text-align: center;
}

.paywallActions {
	display: flex;
	gap: var(--spacing--xs);
	align-items: center;
}

.clickableRow {
	cursor: pointer;
}

.tallRow {
	height: var(--spacing--3xl);
}

.projectCountLink {
	color: var(--color--text);
	text-decoration: underline;
	font-weight: var(--font-weight--bold);
}

.projectCountLink:hover {
	color: var(--color--primary);
}
</style>
