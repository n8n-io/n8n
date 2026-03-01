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
	N8nInput,
	N8nLoading,
	N8nTabs,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { TabOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useAsyncState } from '@vueuse/core';
import isEqual from 'lodash/isEqual';
import sortBy from 'lodash/sortBy';
import { computed, ref, toRaw, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { SCOPE_TYPES, SCOPES } from './projectRoleScopes';

import RoleAssignmentsTab from './RoleAssignmentsTab.vue';

const rolesStore = useRolesStore();
const route = useRoute();
const router = useRouter();
const { showError, showMessage } = useToast();
const i18n = useI18n();
const message = useMessage();
const telemetry = useTelemetry();
const settingsStore = useSettingsStore();

const props = defineProps<{ roleSlug?: string }>();

const activeTab = ref<string>((route.query?.tab as string) ?? 'permissions');

watch(activeTab, (newTab) => {
	void router.replace({ query: { ...route.query, tab: newTab } });
});

const tabOptions = computed<Array<TabOptions<string>>>(() => [
	{ label: i18n.baseText('projectRoles.tab.permissions'), value: 'permissions' },
	{ label: i18n.baseText('projectRoles.tab.assignments'), value: 'assignments' },
]);

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

const defaultForm = () => ({
	displayName: '',
	description: '',
	scopes: structuredClone(
		toRaw(
			rolesStore.processedProjectRoles.find((role) => role.slug === 'project:viewer')?.scopes || [],
		),
	),
});

const initialState = ref<Role | undefined>();
const { state: form, isLoading } = useAsyncState(
	async () => {
		if (!props.roleSlug) {
			return defaultForm();
		}

		try {
			const role = await rolesStore.fetchRoleBySlug({ slug: props.roleSlug });
			initialState.value = structuredClone(role);
			return {
				displayName: role.displayName,
				description: role.description,
				scopes: role.scopes,
			};
		} catch (error) {
			showError(error, 'Error fetching role');
			return defaultForm();
		}
	},
	defaultForm(),
	{ shallow: false },
);

// Read-only if system role OR on view route (not edit route)
const isReadOnly = computed(
	() => initialState.value?.systemRole === true || route.name === VIEWS.PROJECT_ROLE_VIEW,
);

const hasUnsavedChanges = computed(() => {
	if (!initialState.value) return false;

	if (!isEqual(initialState.value.displayName, form.value.displayName)) return true;
	// We need to explicitly check for an empty string and convert it to null.
	// Using `??` wouldn't work here because `""` is a valid value and not `null` or `undefined`.
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	if (!isEqual(initialState.value.description ?? null, form.value.description || null)) return true;
	if (!isEqual(sortBy(initialState.value.scopes), sortBy(form.value.scopes))) return true;

	return false;
});

function resetForm(payload: Role | undefined) {
	form.value = payload
		? {
				displayName: payload.displayName,
				description: payload.description,
				scopes: payload.scopes,
			}
		: defaultForm();
}

const scopeTypes = computed(() => {
	if (!settingsStore.moduleSettings['external-secrets']?.forProjects) {
		return SCOPE_TYPES.filter(
			(type) => type !== 'externalSecretsProvider' && type !== 'externalSecret',
		);
	}
	return SCOPE_TYPES;
});
const scopes = SCOPES;

function toggleScope(scope: string) {
	const index = form.value.scopes.indexOf(scope);
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

	if (scope === 'workflow:update') {
		toggleScope('workflow:execute');
	}
}

async function createProjectRole() {
	try {
		const role = await rolesStore.createProjectRole({
			...form.value,
			description: form.value.description ?? undefined,
			roleType: 'project',
		});

		void rolesStore.fetchRoles();
		telemetry.track('User successfully created new role', {
			role_id: role.slug,
			role_name: role.displayName,
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
			cancelButtonText: i18n.baseText('projectRoles.action.cancel'),
		},
	);

	return confirmed === MODAL_CONFIRM;
}

async function updateProjectRole(slug: string) {
	const proceed = await confirmRoleUpdate(initialState?.value?.usedByUsers);
	if (!proceed) return;

	try {
		const role = await rolesStore.updateProjectRole(slug, {
			...form.value,
			description: form.value.description ?? undefined,
		});

		void rolesStore.fetchRoles();
		telemetry.track('User updated role', {
			role_id: role.slug,
			role_name: role.displayName,
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

	form.value.scopes = structuredClone(toRaw(preset.scopes));
}

async function deleteRole() {
	if (!initialState?.value) return;

	const deleteConfirmed = await message.confirm(
		i18n.baseText('projectRoles.action.delete.text', {
			interpolate: {
				roleName: initialState.value.displayName,
			},
		}),
		i18n.baseText('projectRoles.action.delete.title', {
			interpolate: {
				roleName: initialState.value.displayName,
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

	telemetry.track('User clicked delete role', {
		role_id: initialState.value.slug,
		role_name: initialState.value.displayName,
		permissions: initialState.value?.scopes,
	});

	try {
		await rolesStore.deleteProjectRole(initialState.value.slug);

		const index = rolesStore.roles.project.findIndex(
			(role) => role.slug === initialState.value?.slug,
		);
		if (index !== -1) {
			rolesStore.roles.project.splice(index, 1);
		}

		showMessage({ title: i18n.baseText('projectRoles.action.delete.success'), type: 'success' });
		telemetry.track('User successfully deleted role', {
			role_id: initialState.value.slug,
			role_name: initialState.value.displayName,
			permissions: initialState.value?.scopes,
		});
		router.back();
	} catch (error) {
		showError(error, i18n.baseText('projectRoles.action.delete.error'));
		return;
	}
}

const displayNameValidationRules = [
	{ name: 'REQUIRED' },
	{ name: 'MIN_LENGTH', config: { minimum: 2 } },
];
</script>

<template>
	<div class="pb-xl" :class="$style.container">
		<N8nButton
			variant="ghost"
			icon="arrow-left"
			:class="$style.backButton"
			text
			@click="onBackClick"
		>
			{{ backButtonText }}
		</N8nButton>
		<div class="mb-xl" :class="$style.headerContainer">
			<N8nHeading tag="h1" size="2xlarge">
				{{ roleSlug ? `Role "${form.displayName}"` : i18n.baseText('projectRoles.newRole') }}
			</N8nHeading>
			<div v-if="initialState && !isReadOnly && !isLoading" :class="$style.headerActions">
				<N8nButton variant="subtle" :disabled="!hasUnsavedChanges" @click="resetForm(initialState)">
					{{ i18n.baseText('projectRoles.discardChanges') }}
				</N8nButton>
				<N8nButton :disabled="!hasUnsavedChanges" @click="handleSubmit">
					{{ i18n.baseText('projectRoles.save') }}
				</N8nButton>
			</div>
			<template v-else-if="!roleSlug">
				<N8nButton @click="handleSubmit">{{ i18n.baseText('projectRoles.create') }}</N8nButton>
			</template>
		</div>

		<div class="mb-l" :class="$style.formContainer">
			<!-- Read-only: use slot to wrap input with tooltip -->
			<template v-if="isReadOnly">
				<N8nFormInput
					v-model="form.displayName"
					:label="i18n.baseText('projectRoles.roleName')"
					class="mb-s"
					show-required-asterisk
					required
				>
					<N8nTooltip
						:content="i18n.baseText('projectRoles.systemRoleNotEditable')"
						placement="top"
					>
						<N8nInput v-model="form.displayName" :maxlength="100" disabled />
					</N8nTooltip>
				</N8nFormInput>
				<N8nFormInput v-model="form.description" :label="i18n.baseText('projectRoles.description')">
					<N8nTooltip
						:content="i18n.baseText('projectRoles.systemRoleNotEditable')"
						placement="top"
					>
						<N8nInput
							v-model="form.description"
							type="textarea"
							:placeholder="i18n.baseText('projectRoles.optional')"
							:maxlength="500"
							:autosize="{ minRows: 2, maxRows: 4 }"
							disabled
						/>
					</N8nTooltip>
				</N8nFormInput>
			</template>
			<!-- Editable: standard N8nFormInput with full validation -->
			<template v-else>
				<N8nFormInput
					v-model="form.displayName"
					:label="i18n.baseText('projectRoles.roleName')"
					validate-on-blur
					:validation-rules="displayNameValidationRules"
					class="mb-s"
					show-required-asterisk
					required
					:maxlength="100"
				/>
				<N8nFormInput
					v-model="form.description"
					:label="i18n.baseText('projectRoles.description')"
					:placeholder="i18n.baseText('projectRoles.optional')"
					type="textarea"
					:maxlength="500"
					:autosize="{ minRows: 2, maxRows: 4 }"
				/>
			</template>
		</div>

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
	</div>
</template>

<style lang="css" module>
.container {
	max-width: 700px;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
}

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

.backButton {
	position: absolute;
	top: 10px;
	left: 10px;
}

.headerContainer {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: var(--spacing--sm);
}

.headerActions {
	display: flex;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.formContainer {
	max-width: 415px;
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
