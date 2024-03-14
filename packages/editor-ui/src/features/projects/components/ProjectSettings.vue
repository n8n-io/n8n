<script lang="ts" setup>
import { computed, ref, watch, onBeforeMount } from 'vue';
import { useUsersStore } from '@/stores/users.store';
import type { IUser } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { useProjectsStore } from '@/features/projects/projects.store';
import ProjectTabs from '@/features/projects/components/ProjectTabs.vue';
import type { Project, ProjectRole, ProjectRelation } from '@/features/projects/projects.types';

const usersStore = useUsersStore();
const locale = useI18n();
const projectsStore = useProjectsStore();

const isDirty = ref(false);
const formData = ref<Pick<Project, 'name' | 'relations'>>({
	name: '',
	relations: [],
});
const projectRoles = ref<Array<{ label: string; value: ProjectRole }>>([
	{ value: 'project:admin', label: locale.baseText('projects.settings.role.admin') },
	{ value: 'project:editor', label: locale.baseText('projects.settings.role.editor') },
	{ value: 'project:viewer', label: locale.baseText('projects.settings.role.viewer') },
]);

const usersList = computed(() =>
	usersStore.allUsers.filter((user: IUser) => {
		const isAlreadySharedWithUser = (formData.value.relations || []).find(
			(r: ProjectRelation) => r.id === user.id,
		);

		return !isAlreadySharedWithUser;
	}),
);

const onAddMember = (userId: string) => {
	isDirty.value = true;
	const user = usersStore.getUserById(userId);
	if (!user) return;

	const { id, firstName, lastName, email } = user;
	const relation = { id, firstName, lastName, email } as ProjectRelation;

	relation.role = 'project:admin';

	formData.value.relations.push(relation);
};

const onRoleAction = (user: Partial<IUser>, role: string) => {
	isDirty.value = true;
	const index = formData.value.relations.findIndex((r: ProjectRelation) => r.id === user.id);
	if (role === 'remove') {
		formData.value.relations.splice(index, 1);
	} else {
		formData.value.relations[index].role = role as ProjectRole;
	}
};

const onNameInput = () => {
	isDirty.value = true;
};

const onCancel = () => {
	formData.value.relations = projectsStore.currentProject?.relations?.slice() ?? [];
	formData.value.name = projectsStore.currentProject?.name ?? '';
	isDirty.value = false;
};

const onSubmit = async () => {
	if (isDirty.value) {
		await projectsStore.updateProject({
			id: projectsStore.currentProject.id,
			name: formData.value.name,
			relations: formData.value.relations.map((r: ProjectRelation) => ({
				userId: r.id,
				role: r.role,
			})),
		});
		isDirty.value = false;
	}
};

const onDelete = () => {
	alert('Not yet implemented');
};

watch(
	() => projectsStore.currentProject,
	() => {
		formData.value.name = projectsStore.currentProject?.name ?? '';
		formData.value.relations = projectsStore.currentProject?.relations?.slice() ?? [];
	},
	{ immediate: true },
);

onBeforeMount(async () => {
	await usersStore.fetchUsers();
});
</script>

<template>
	<div :class="$style.projectSettings">
		<div :class="$style.header">
			<ProjectTabs />
		</div>
		<form @submit.prevent="onSubmit">
			<fieldset>
				<label for="name">{{ locale.baseText('projects.settings.name') }}</label>
				<N8nInput id="name" v-model="formData.name" type="text" name="name" @input="onNameInput" />
			</fieldset>
			<fieldset>
				<label for="projectMembers">{{
					locale.baseText('projects.settings.projectMembers')
				}}</label>
				<N8nUserSelect
					id="projectMembers"
					class="mb-s"
					size="large"
					:users="usersList"
					:current-user-id="usersStore.currentUser?.id"
					:placeholder="$locale.baseText('workflows.shareModal.select.placeholder')"
					data-test-id="project-members-select"
					@update:model-value="onAddMember"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nUserSelect>
				<N8nUsersList
					:actions="[]"
					:users="formData.relations"
					:current-user-id="usersStore.currentUser?.id"
					:delete-label="$locale.baseText('workflows.shareModal.list.delete')"
				>
					<template #actions="{ user }">
						<N8nSelect
							:model-value="user?.role || 'project:admin'"
							size="small"
							@update:model-value="onRoleAction(user, $event)"
						>
							<N8nOption
								v-for="role in projectRoles"
								:key="role.value"
								:value="role.value"
								:label="role.label"
							/>
							<N8nOption value="remove">
								<N8nText color="danger">{{
									$locale.baseText('projects.settings.removeAccess')
								}}</N8nText>
							</N8nOption>
						</N8nSelect>
					</template>
				</N8nUsersList>
			</fieldset>
			<fieldset>
				<div :class="$style.buttons">
					<N8nButton
						:disabled="!isDirty"
						type="primary"
						data-test-id="project-settings-save-button"
						>{{ locale.baseText('projects.settings.button.save') }}</N8nButton
					>
					<div>
						<small v-if="isDirty" class="mr-2xs">{{
							locale.baseText('projects.settings.message.unsavedChanges')
						}}</small>
						<N8nButton
							:disabled="!isDirty"
							type="secondary"
							class="mr-2xs"
							data-test-id="project-settings-cancel-button"
							@click.stop.prevent="onCancel"
							>{{ locale.baseText('projects.settings.button.cancel') }}</N8nButton
						>
					</div>
				</div>
			</fieldset>
			<fieldset>
				<hr class="mb-2xl" />
				<h3 class="mb-xs">{{ locale.baseText('projects.settings.title.deleteProject') }}</h3>
				<N8nButton
					type="danger"
					class="mb-xs"
					data-test-id="project-settings-delete-button"
					@click.stop.prevent="onDelete"
					>{{ locale.baseText('projects.settings.title.deleteProject') }}</N8nButton
				>
				<br />
				<small>{{ locale.baseText('projects.settings.message.cannotBeUndone') }}</small>
			</fieldset>
		</form>
	</div>
</template>

<style lang="scss" module>
.projectSettings {
	display: grid;
	width: 100%;
	justify-items: center;
	grid-auto-rows: max-content;

	form {
		width: 100%;
		max-width: 1280px;
		padding: 0 var(--spacing-2xl);

		fieldset {
			padding-bottom: var(--spacing-2xl);

			label {
				display: block;
				margin-bottom: var(--spacing-xs);
				font-size: var(--font-size-xl);
			}
		}
	}
}

.header {
	width: 100%;
	max-width: 1280px;
	padding: var(--spacing-2xl) var(--spacing-2xl) 0;
}

.buttons {
	display: flex;
	// TODO: Remove this once the button component does not use 'type' prop
	// Button component should use 'variant' instead of 'type'
	// so we can use 'type' for defining the button type so the form element does not mix them up
	flex-direction: row-reverse;
	justify-content: flex-start;
	align-items: center;
}
</style>
