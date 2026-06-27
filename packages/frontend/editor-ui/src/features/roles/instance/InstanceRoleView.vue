<script setup lang="ts">
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useRolesStore } from '@/app/stores/roles.store';
import { N8nButton, N8nHeading, N8nTabs, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, toRaw } from 'vue';
import { useRouter } from 'vue-router';

import RoleEditorLayout, { type RoleEditorLabels } from '../components/RoleEditorLayout.vue';
import { useRoleEditorForm } from '../composables/useRoleEditorForm';
import InstanceRoleAssignmentsTab from './InstanceRoleAssignmentsTab.vue';
import ScopeGroupSelector from './components/ScopeGroupSelector.vue';
import { ALL_INSTANCE_SCOPES } from './instanceRoleScopes';

const rolesStore = useRolesStore();
const router = useRouter();
const { showMessage, showError } = useToast();
const i18n = useI18n();
const message = useMessage();
const telemetry = useTelemetry();

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
	resetForm,
} = useRoleEditorForm({
	roleSlug: () => props.roleSlug,
	viewRoute: VIEWS.INSTANCE_ROLE_VIEW,
	fetchError: i18n.baseText('roles.instance.action.fetch.error'),
});

const editorLabels = computed<RoleEditorLabels>(() => ({
	newRoleTitle: i18n.baseText('roles.instance.newRole'),
	roleName: i18n.baseText('projectRoles.roleName'),
	description: i18n.baseText('projectRoles.description'),
	optional: i18n.baseText('projectRoles.optional'),
	systemRoleNotEditable: i18n.baseText('projectRoles.systemRoleNotEditable'),
	discardChanges: i18n.baseText('projectRoles.discardChanges'),
	save: i18n.baseText('projectRoles.save'),
	create: i18n.baseText('projectRoles.create'),
}));

// System roles populate the preset buttons (clicking copies their scopes).
const presetRoles = computed(() => rolesStore.processedInstanceRoles.filter((r) => r.systemRole));

function onBackClick() {
	void router.push({ name: VIEWS.ROLES_SETTINGS, query: { tab: 'instance' } });
}

function setPreset(slug: string) {
	const preset = rolesStore.processedInstanceRoles.find((role) => role.slug === slug);
	if (!preset) return;

	// Only keep scopes the editor knows about; system roles may carry internal scopes
	// (e.g. chatHub:*) that the UI doesn't expose and shouldn't be silently forwarded.
	form.value.scopes = structuredClone(toRaw(preset.scopes)).filter((s) =>
		(ALL_INSTANCE_SCOPES as readonly string[]).includes(s),
	);
}

async function createInstanceRole() {
	try {
		const role = await rolesStore.createRole({
			displayName: form.value.displayName,
			description: form.value.description ?? undefined,
			scopes: form.value.scopes,
			roleType: 'global',
		});

		void rolesStore.fetchRoles();
		telemetry.track('User successfully created new role', {
			role_id: role.slug,
			role_name: role.displayName,
			permissions: role.scopes,
		});

		void router.replace({ name: VIEWS.INSTANCE_ROLE_SETTINGS, params: { roleSlug: role.slug } });
		showMessage({
			type: 'success',
			message: i18n.baseText('roles.instance.action.create.success'),
		});

		initialState.value = structuredClone(role);
		return role;
	} catch (error) {
		showError(error, i18n.baseText('roles.instance.action.create.error'));
		return;
	}
}

async function updateInstanceRole(slug: string) {
	try {
		const role = await rolesStore.updateRole(slug, {
			displayName: form.value.displayName,
			description: form.value.description ?? undefined,
			scopes: form.value.scopes,
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
			message: i18n.baseText('roles.instance.action.update.success'),
		});
		return role;
	} catch (error) {
		showError(error, i18n.baseText('roles.instance.action.update.error'));
		return;
	}
}

async function handleSubmit() {
	if (props.roleSlug) {
		await updateInstanceRole(props.roleSlug);
	} else {
		await createInstanceRole();
	}
}

async function deleteRole() {
	if (!initialState.value) return;

	const deleteConfirmed = await message.confirm(
		i18n.baseText('roles.action.delete.text', {
			interpolate: { roleName: initialState.value.displayName },
		}),
		i18n.baseText('roles.action.delete.title', {
			interpolate: { roleName: initialState.value.displayName },
		}),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('roles.action.delete'),
			cancelButtonText: i18n.baseText('roles.action.cancel'),
		},
	);

	if (deleteConfirmed !== MODAL_CONFIRM) return;

	try {
		await rolesStore.deleteRole(initialState.value.slug);

		const index = rolesStore.roles.global.findIndex(
			(role) => role.slug === initialState.value?.slug,
		);
		if (index !== -1) {
			rolesStore.roles.global.splice(index, 1);
		}

		showMessage({ title: i18n.baseText('roles.action.delete.success'), type: 'success' });
		telemetry.track('User successfully deleted role', {
			role_id: initialState.value.slug,
			role_name: initialState.value.displayName,
			permissions: initialState.value.scopes,
		});
		void router.push({ name: VIEWS.ROLES_SETTINGS, query: { tab: 'instance' } });
	} catch (error) {
		showError(error, i18n.baseText('roles.action.delete.error'));
	}
}
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
		:back-button-text="i18n.baseText('roles.instance.backToRoles')"
		:labels="editorLabels"
		:display-name-validation-rules="displayNameValidationRules"
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
					{{ i18n.baseText('roles.instance.preset') }}
				</N8nText>

				<div class="mb-s" :class="$style.presetsContainer">
					<N8nButton
						v-for="preset in presetRoles"
						:key="preset.slug"
						variant="subtle"
						:data-test-id="`role-preset-${preset.slug}`"
						@click="setPreset(preset.slug)"
					>
						{{ preset.displayName }}
					</N8nButton>
				</div>
			</template>

			<ScopeGroupSelector v-model="form.scopes" :readonly="isReadOnly" :loading="isLoading" />

			<div v-if="roleSlug && !isReadOnly" class="mt-xl">
				<N8nHeading tag="h2" class="mb-2xs" size="large">
					{{ i18n.baseText('roles.instance.dangerZone') }}
				</N8nHeading>
				<N8nText tag="p" class="mb-s">
					{{ i18n.baseText('roles.instance.action.delete.warning') }}
				</N8nText>
				<N8nButton variant="destructive" @click="deleteRole">
					{{ i18n.baseText('roles.instance.action.delete.button') }}
				</N8nButton>
			</div>
		</div>

		<div v-if="roleSlug && activeTab === 'assignments'">
			<InstanceRoleAssignmentsTab :role-slug="roleSlug" />
		</div>
	</RoleEditorLayout>
</template>

<style lang="css" module>
.presetsContainer {
	display: flex;
	gap: 8px;
}
</style>
