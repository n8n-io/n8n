<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import { useRolesStore } from '@/stores/roles.store';
import { N8nButton, N8nCheckbox, N8nFormInput, N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useAsyncState } from '@vueuse/core';
import { useRouter } from 'vue-router';

const rolesStore = useRolesStore();
const router = useRouter();
const { showError, showMessage } = useToast();
const i18n = useI18n();

const props = defineProps<{ roleSlug?: string }>();

const defaultForm = () => ({
	displayName: '',
	description: '',
	scopes: [],
});

const { state: form } = useAsyncState(
	async () => {
		if (!props.roleSlug) {
			return defaultForm();
		}

		try {
			const role = await rolesStore.fetchRoleBySlug({ slug: props.roleSlug });
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

const project = (['read', 'update', 'delete'] as const).map(
	(action) => `project:${action}` as const,
);
const folder = (['read', 'update', 'create', 'move', 'delete'] as const).map(
	(action) => `folder:${action}` as const,
);
const workflow = (['read', 'execute', 'update', 'create', 'share', 'move', 'delete'] as const).map(
	(action) => `workflow:${action}` as const,
);
const credential = (['read', 'update', 'create', 'share', 'move', 'delete'] as const).map(
	(action) => `credential:${action}` as const,
);
const sourceControl = (['pull', 'push', 'manage'] as const).map(
	(action) => `sourceControl:${action}` as const,
);

const scopeTypes = ['project', 'folder', 'workflow', 'credential', 'sourceControl'] as const;

const scopes = {
	project,
	folder,
	workflow,
	credential,
	sourceControl,
} as const;

function toggleScope(scope: string) {
	if (scope.endsWith(':read')) {
		toggleScope(scope.replace(':read', ':list'));
	}

	const index = form.value.scopes.indexOf(scope);
	if (index !== -1) {
		form.value.scopes.splice(index, 1);
	} else {
		form.value.scopes.push(scope);
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
			<N8nButton @click="handleSubmit"> {{ roleSlug ? 'Edit' : 'Create' }}</N8nButton>
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
					<N8nCheckbox
						v-for="scope in scopes[type]"
						:key="scope"
						:data-test-id="`scope-checkbox-${scope}`"
						:model-value="form.scopes.includes(scope)"
						:label="i18n.baseText(`projectRoles.${scope}`)"
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
