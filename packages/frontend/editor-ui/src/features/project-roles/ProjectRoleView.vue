<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import { useRolesStore } from '@/stores/roles.store';
import { N8nButton, N8nFormInput, N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { Role } from '@n8n/permissions';
import { useAsyncState } from '@vueuse/core';
import isEqual from 'lodash/isEqual';
import sortBy from 'lodash/sortBy';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const rolesStore = useRolesStore();
const router = useRouter();
const { showError, showMessage } = useToast();
const i18n = useI18n();

const props = defineProps<{ roleSlug?: string }>();

const defaultForm = () => ({
	displayName: '',
	description: '',
	scopes: [
		'project:read',
		'project:list',
		'folder:read',
		'folder:list',
		'workflow:read',
		'workflow:list',
		'credential:read',
		'credential:list',
	],
});

const initialState = ref<Role | undefined>();
const { state: form } = useAsyncState(
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

const project = (['read', 'update', 'delete'] as const).map(
	(action) => `project:${action}` as const,
);
const folder = (['read', 'update', 'create', 'move', 'delete'] as const).map(
	(action) => `folder:${action}` as const,
);
const workflow = (['read', 'update', 'create', 'share', 'move', 'delete'] as const).map(
	(action) => `workflow:${action}` as const,
);
const credential = (['read', 'update', 'create', 'share', 'move', 'delete'] as const).map(
	(action) => `credential:${action}` as const,
);
const sourceControl = (['push'] as const).map((action) => `sourceControl:${action}` as const);

const scopeTypes = ['project', 'folder', 'workflow', 'credential', 'sourceControl'] as const;

const scopes = {
	project,
	folder,
	workflow,
	credential,
	sourceControl,
} as const;

function toggleScope(scope: string) {
	const index = form.value.scopes.indexOf(scope);
	if (index !== -1) {
		form.value.scopes.splice(index, 1);
	} else {
		form.value.scopes.push(scope);
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

		rolesStore.roles.project.push(role);

		void router.replace({ name: VIEWS.PROJECT_ROLE_SETTINGS, params: { roleSlug: role.slug } });
		showMessage({
			type: 'success',
			message: 'Role created successfully',
		});

		initialState.value = structuredClone(role);

		return role;
	} catch (error) {
		showError(error, 'Error creating role');
		return;
	}
}

async function updateProjectRole(slug: string) {
	try {
		const role = await rolesStore.updateProjectRole(slug, {
			...form.value,
			description: form.value.description ?? undefined,
		});

		const index = rolesStore.roles.project.findIndex((r) => r.slug === slug);
		if (index !== -1) {
			rolesStore.roles.project.splice(index, 1, role);
		}

		initialState.value = structuredClone(role);

		showMessage({
			type: 'success',
			message: 'Role updated successfully',
		});

		return role;
	} catch (error) {
		showError(error, 'Error updating role');
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

	form.value.scopes = preset.scopes;
}

const displayNameValidationRules = [
	{ name: 'REQUIRED' },
	{ name: 'MIN_LENGTH', config: { minimum: 2 } },
];
</script>

<template>
	<div class="pb-xl" :class="$style.container">
		<N8nButton
			icon="arrow-left"
			type="secondary"
			style="position: absolute; top: 10px; left: 10px"
			text
			@click="() => router.back()"
			>Back to role list</N8nButton
		>
		<div class="mb-xl" style="display: flex; justify-content: space-between; align-items: center">
			<N8nHeading tag="h1" size="2xlarge">
				{{ roleSlug ? `Role "${form.displayName}"` : 'New Role' }}
			</N8nHeading>
			<div v-if="initialState">
				<N8nButton
					type="secondary"
					:disabled="!hasUnsavedChanges"
					class="mr-xs"
					@click="resetForm(initialState)"
				>
					Discard changes
				</N8nButton>
				<N8nButton :disabled="!hasUnsavedChanges" @click="handleSubmit">Save</N8nButton>
			</div>
			<template v-else>
				<N8nButton @click="handleSubmit">Create</N8nButton>
			</template>
		</div>

		<div style="width: 415px" class="mb-l">
			<N8nFormInput
				v-model="form.displayName"
				label="Role name"
				validate-on-blur
				:validation-rules="displayNameValidationRules"
				class="mb-s"
				show-required-asterisk
				required
				:maxlength="100"
			></N8nFormInput>
			<N8nFormInput
				v-model="form.description"
				label="Description"
				:placeholder="'Optional'"
				type="textarea"
				:maxlength="500"
				:autosize="{ minRows: 2, maxRows: 4 }"
			></N8nFormInput>
		</div>

		<N8nHeading tag="h2" size="xlarge" class="mb-s">Permissions</N8nHeading>
		<N8nText color="text-light" class="mb-2xs" tag="p">Preset</N8nText>

		<div style="display: flex; gap: 8px" class="mb-s">
			<N8nButton type="secondary" @click="setPreset('project:admin')"> Admin </N8nButton>
			<N8nButton type="secondary" @click="setPreset('project:editor')"> Editor </N8nButton>
			<N8nButton type="secondary" @click="setPreset('project:viewer')"> Viewer </N8nButton>
		</div>

		<div :class="$style.cardContainer">
			<div
				v-for="type in scopeTypes"
				:key="type"
				class="mb-s mt-s"
				style="display: flex"
				:class="$style.card"
			>
				<div style="width: 133px">{{ type }}</div>
				<div>
					<N8nFormInput
						v-for="scope in scopes[type]"
						:key="scope"
						:data-test-id="`scope-checkbox-${scope}`"
						:model-value="form.scopes.includes(scope)"
						:label="i18n.baseText(`projectRoles.${scope}`)"
						validate-on-blur
						type="checkbox"
						@update:model-value="() => toggleScope(scope)"
					/>
				</div>
			</div>
		</div>
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
	border: 1px solid var(--color-foreground-base);
	background: var(--color-foreground-xlight);
}

.card:not(:last-child) {
	border-bottom: 1px solid var(--color-foreground-base);
}
</style>
