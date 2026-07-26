<script setup lang="ts">
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import {
	N8nButton,
	N8nFormInput,
	N8nHeading,
	N8nLoading,
	N8nTabs,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@/app/stores/settings.store';
import { computed, toRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { SCOPE_TYPES, SCOPES, normalizeCoupledScopes } from './projectRoleScopes';

import RoleEditorLayout, { type RoleEditorLabels } from '../components/RoleEditorLayout.vue';
import RoleAssignmentsTab from './RoleAssignmentsTab.vue';
import { useRoleEditorForm } from '../composables/useRoleEditorForm';
import { PROJECT_CUSTOM_ROLE_SCOPES } from '@n8n/permissions';

const rolesStore = useRolesStore();
const route = useRoute();
const router = useRouter();
const { showError, showMessage } = useToast();
const i18n = useI18n();
const message = useMessage();
const telemetry = useTelemetry();
const settingsStore = useSettingsStore();

const props = defineProps<{ roleSlug?: string }>();

const {
	activeTab,
	tabOptions,
	form,
	isLoading,
	initialState,
	isReadOnly,
	isNew,
	showEditButtons,
	showCreateButton,
	hasUnsavedChanges,
	displayNameValidationRules,
	submitted,
	validateOnSubmit,
	resetForm,
} = useRoleEditorForm({
	roleSlug: () => props.roleSlug,
	viewRoute: VIEWS.PROJECT_ROLE_VIEW,
	defaultScopes: () =>
		structuredClone(
			toRaw(
				rolesStore.processedProjectRoles.find((role) => role.slug === 'project:viewer')?.scopes ??
					[],
			),
		),
	filterScopes: (scopes) => scopes.filter((s) => PROJECT_CUSTOM_ROLE_SCOPES.has(s)),
	fetchError: 'Error fetching role',
});

// Dynamic back button text and navigation based on where the user navigated from
const cameFromProjectSettings = computed(() => route.query.from === VIEWS.PROJECT_SETTINGS);

const backButtonText = computed(() =>
	cameFromProjectSettings.value
		? i18n.baseText('projectRoles.backToProjectSettings')
		: i18n.baseText('projectRoles.backToProjectRoles'),
);

const onBackClick = () => {
	if (cameFromProjectSettings.value) {
		router.back();
	} else {
		void router.push({ name: VIEWS.PROJECT_ROLES_SETTINGS });
	}
};

const scopeTypes = computed(() => {
	if (!settingsStore.moduleSettings['external-secrets']?.roleBasedAccess) {
		return SCOPE_TYPES.filter(
			(type) => type !== 'externalSecretsProvider' && type !== 'externalSecret',
		);
	}
	return SCOPE_TYPES;
});
const scopes = SCOPES;

function toggleScope(scope: string) {
	const index = form.value.scopes.indexOf(scope);
	const isBeingAdded = index === -1;

	if (index !== -1) {
		form.value.scopes.splice(index, 1);
	} else {
		form.value.scopes.push(scope);
	}

	if (scope.startsWith('dataTable:') && scope.endsWith(':read')) {
		toggleScope(scope.replace(':read', ':listProject'));
		return;
	}

	if (scope.endsWith(':read')) {
		toggleScope(scope.replace(':read', ':list'));
	}

	// Dependency: workflow:execute requires workflow:read
	if (scope === 'workflow:execute' && isBeingAdded) {
		if (!form.value.scopes.includes('workflow:read')) {
			toggleScope('workflow:read');
		}
	}

	if (scope === 'workflow:read' && !isBeingAdded) {
		if (form.value.scopes.includes('workflow:execute')) {
			toggleScope('workflow:execute');
		}
	}

	// Dependency: workflow:publish and workflow:unpublish are coupled
	if (scope === 'workflow:publish') {
		if (isBeingAdded && !form.value.scopes.includes('workflow:unpublish')) {
			form.value.scopes.push('workflow:unpublish');
		} else if (!isBeingAdded) {
			const idx = form.value.scopes.indexOf('workflow:unpublish');
			if (idx !== -1) form.value.scopes.splice(idx, 1);
		}
	}
}

async function createProjectRole() {
	if (!validateOnSubmit('projectRoles.action.create.error')) {
		return;
	}

	try {
		const role = await rolesStore.createRole({
			...form.value,
			scopes: normalizeCoupledScopes(form.value.scopes),
			description: form.value.description ?? undefined,
			roleType: 'project',
		});

		void rolesStore.fetchRoles();
		telemetry.track('User successfully created new role', {
			role_id: role.slug,
			role_name: role.displayName,
			role_type: 'project',
			permissions: role.scopes,
		});

		void router.replace({ name: VIEWS.PROJECT_ROLE_SETTINGS, params: { roleSlug: role.slug } });
		showMessage({
			type: 'success',
			message: i18n.baseText('projectRoles.action.create.success'),
		});

		initialState.value = structuredClone(role);

		return role;
	} catch (error) {
		showError(error, i18n.baseText('projectRoles.action.create.error'));
		return;
	}
}

async function confirmRoleUpdate(usedByUsers?: number) {
	if (!usedByUsers) return true;

	const confirmed = await message.confirm(
		i18n.baseText('projectRoles.action.update.text', {
			interpolate: {
				count: usedByUsers,
			},
		}),
		i18n.baseText('projectRoles.action.update.title', {
			interpolate: {
				count: usedByUsers,
			},
		}),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('projectRoles.action.update'),
			cancelButtonText: i18n.baseText('roles.action.cancel'),
		},
	);

	return confirmed === MODAL_CONFIRM;
}

async function updateProjectRole(slug: string) {
	const proceed = await confirmRoleUpdate(initialState?.value?.usedByUsers);
	if (!proceed) return;

	try {
		const role = await rolesStore.updateRole(slug, {
			...form.value,
			scopes: normalizeCoupledScopes(form.value.scopes),
			description: form.value.description ?? undefined,
		});

		void rolesStore.fetchRoles();
		telemetry.track('User updated role', {
			role_id: role.slug,
			role_name: role.displayName,
			role_type: 'project',
			permissions_from: initialState.value?.scopes,
			permissions_to: role.scopes,
		});

		initialState.value = structuredClone(role);

		showMessage({
			type: 'success',
			message: i18n.baseText('projectRoles.action.update.success'),
		});

		return role;
	} catch (error) {
		showError(error, i18n.baseText('projectRoles.action.update.error'));
		return;
	}
}

async function handleSubmit() {
	if (props.roleSlug) {
		await updateProjectRole(props.roleSlug);
	} else {
		await createProjectRole();
	}
}

function setPreset(slug: string) {
	const preset = rolesStore.processedProjectRoles.find((role) => role.slug === slug);
	if (!preset) {
		return;
	}

	form.value.scopes = structuredClone(toRaw(preset.scopes)).filter((s) =>
		PROJECT_CUSTOM_ROLE_SCOPES.has(s),
	);
}

async function deleteRole() {
	if (!initialState?.value) return;

	const deleteConfirmed = await message.confirm(
		i18n.baseText('roles.action.delete.text', {
			interpolate: {
				roleName: initialState.value.displayName,
			},
		}),
		i18n.baseText('roles.action.delete.title', {
			interpolate: {
				roleName: initialState.value.displayName,
			},
		}),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('roles.action.delete'),
			cancelButtonText: i18n.baseText('roles.action.cancel'),
		},
	);

	if (deleteConfirmed !== MODAL_CONFIRM) {
		return;
	}

	telemetry.track('User clicked delete role', {
		role_id: initialState.value.slug,
		role_name: initialState.value.displayName,
		permissions: initialState.value?.scopes,
	});

	try {
		await rolesStore.deleteRole(initialState.value.slug);

		const index = rolesStore.roles.project.findIndex(
			(role) => role.slug === initialState.value?.slug,
		);
		if (index !== -1) {
			rolesStore.roles.project.splice(index, 1);
		}

		showMessage({ title: i18n.baseText('roles.action.delete.success'), type: 'success' });
		telemetry.track('User successfully deleted role', {
			role_id: initialState.value.slug,
			role_name: initialState.value.displayName,
			permissions: initialState.value?.scopes,
		});
		router.back();
	} catch (error) {
		showError(error, i18n.baseText('roles.action.delete.error'));
		return;
	}
}

const editorLabels = computed<RoleEditorLabels>(() => ({
	newRoleTitle: i18n.baseText('projectRoles.newRole'),
	roleName: i18n.baseText('projectRoles.roleName'),
	description: i18n.baseText('projectRoles.description'),
	optional: i18n.baseText('projectRoles.optional'),
	systemRoleNotEditable: i18n.baseText('projectRoles.systemRoleNotEditable'),
	discardChanges: i18n.baseText('projectRoles.discardChanges'),
	save: i18n.baseText('projectRoles.save'),
	create: i18n.baseText('projectRoles.create'),
}));
</script>

<template>
	<RoleEditorLayout
		v-model:display-name="form.displayName"
		v-model:description="form.description"
		:is-new="isNew"
		:is-read-only="isReadOnly"
		:show-edit-buttons="showEditButtons"
		:show-create-button="showCreateButton"
		:has-unsaved-changes="hasUnsavedChanges"
		:back-button-text="backButtonText"
		:labels="editorLabels"
		:display-name-validation-rules="displayNameValidationRules"
		:show-display-name-error="submitted"
		@back="onBackClick"
		@save="handleSubmit"
		@discard="resetForm(initialState)"
		@create="handleSubmit"
	>
		<div v-if="roleSlug" class="mb-l">
			<N8nTabs v-model="activeTab" :options="tabOptions" />
		</div>

		<div v-show="!roleSlug || activeTab === 'permissions'">
			<template v-if="!isReadOnly">
				<N8nText color="text-light" class="mb-2xs" tag="p">
					{{ i18n.baseText('projectRoles.preset') }}
				</N8nText>

				<div class="mb-s" :class="$style.presetsContainer">
					<N8nButton variant="subtle" @click="setPreset('project:admin')">
						{{ i18n.baseText('projectRoles.admin') }}
					</N8nButton>
					<N8nButton variant="subtle" @click="setPreset('project:editor')">
						{{ i18n.baseText('projectRoles.editor') }}
					</N8nButton>
					<N8nButton variant="subtle" @click="setPreset('project:viewer')">
						{{ i18n.baseText('projectRoles.viewer') }}
					</N8nButton>
				</div>
			</template>

			<div :class="$style.cardContainer">
				<div v-for="type in scopeTypes" :key="type" class="mb-s mt-s" :class="$style.card">
					<div :class="$style.cardTitle">
						{{ i18n.baseText(`projectRoles.type.${type}`) }}
					</div>
					<div style="flex: 1">
						<N8nLoading v-if="isLoading" :rows="scopes[type].length" :shrink-last="false" />
						<template v-else>
							<div v-for="scope in scopes[type]" :key="scope" class="mb-2xs">
								<N8nTooltip
									:content="i18n.baseText(`projectRoles.${scope}.tooltip`)"
									placement="right"
									:enterable="false"
									:show-after="250"
								>
									<N8nFormInput
										:data-test-id="`scope-checkbox-${scope}`"
										:model-value="form.scopes.includes(scope)"
										:label="i18n.baseText(`projectRoles.${scope}`)"
										validate-on-blur
										type="checkbox"
										:class="$style.checkbox"
										:disabled="isReadOnly"
										@update:model-value="() => toggleScope(scope)"
									/>
								</N8nTooltip>
							</div>
						</template>
					</div>
				</div>
			</div>

			<div v-if="roleSlug && !isReadOnly" class="mt-xl">
				<N8nHeading tag="h2" class="mb-2xs" size="large">
					{{ i18n.baseText('projectRoles.dangerZone') }}
				</N8nHeading>
				<N8nText tag="p" class="mb-s">
					<template v-if="initialState?.usedByProjects">
						{{ i18n.baseText('projectRoles.action.delete.useWarning.before') }}
						<a :class="$style.assignmentsLink" @click="activeTab = 'assignments'">
							{{
								i18n.baseText('projectRoles.action.delete.useWarning.linkText', {
									adjustToNumber: initialState.usedByProjects,
									interpolate: { count: initialState.usedByProjects },
								})
							}} </a
						>.
						{{ i18n.baseText('projectRoles.action.delete.useWarning.after') }}
					</template>
					<template v-else>
						{{ i18n.baseText('projectRoles.action.delete.warning') }}
					</template>
				</N8nText>
				<N8nButton
					variant="destructive"
					:disabled="Boolean(initialState?.usedByProjects)"
					@click="deleteRole"
				>
					{{ i18n.baseText('projectRoles.action.delete.button') }}
				</N8nButton>
			</div>
		</div>

		<RoleAssignmentsTab v-if="roleSlug && activeTab === 'assignments'" :role-slug="roleSlug" />
	</RoleEditorLayout>
</template>

<style lang="css" module>
.cardContainer {
	padding: 8px 16px;
	border-radius: 4px;
	border: var(--border);
	background-color: var(--color--background--light-3);
	:global(.el-skeleton__p) {
		margin-bottom: 8px;
		margin-top: 0;
	}
}

.card {
	display: flex;
}

.card:not(:last-child) {
	border-bottom: var(--border);
}

.cardTitle {
	width: 133px;
}

.presetsContainer {
	display: flex;
	gap: 8px;
}

.checkbox {
	display: inline-flex !important;
	margin-bottom: 0 !important;
	:global(label) {
		padding-bottom: 0 !important;
	}
}

.assignmentsLink {
	color: var(--color--text);
	cursor: pointer;
	text-decoration: underline;
}

.assignmentsLink:hover {
	color: var(--color--primary);
}
</style>
