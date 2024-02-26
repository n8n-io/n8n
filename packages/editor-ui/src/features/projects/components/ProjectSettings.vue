<script lang="ts" setup>
import { computed, ref, watch, onBeforeMount } from 'vue';
import { useUsersStore } from '@/stores/users.store';
import type { IUser } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { useProjectsStore } from '@/features/projects/projects.store';
import ProjectTabs from '@/features/projects/components/ProjectTabs.vue';

const usersStore = useUsersStore();
const locale = useI18n();
const projectsStore = useProjectsStore();

const sharedWith = ref<Array<Partial<IUser>>>([]);
const projectNameEdited = ref('');
const projectName = computed({
	get: () => (projectNameEdited.value || projectsStore.currentProject?.name) ?? '',
	set: (value: string) => {
		projectNameEdited.value = value;
	},
});

const usersList = computed(() =>
	usersStore.allUsers.filter((user: IUser) => {
		// TODO: Get project share data
		const projectData = {
			sharedWith: [],
			ownedBy: { id: '' },
		};
		const isAlreadySharedWithUser = (projectData.sharedWith || []).find(
			(sharee: IUser) => sharee.id === user.id,
		);

		// TODO: Check if user is owner of the project
		const isOwner = projectData.ownedBy?.id === user.id;

		return !isAlreadySharedWithUser && !isOwner;
	}),
);
const currentUser = computed(() => usersStore.currentUser);
const sharedWithList = computed(() => sharedWith.value);

const onAddSharee = (userId: string) => {
	const { id, firstName, lastName, email } = usersStore.getUserById(userId)!;
	const sharee = { id, firstName, lastName, email };

	sharedWith.value.push(sharee);
};

const onRoleAction = (user: Partial<IUser>, role: string) => {
	if (role === 'remove') {
		const index = sharedWith.value.findIndex((u) => u.id === user.id);
		sharedWith.value.splice(index, 1);
	}
};

watch(
	() => projectsStore.currentProject,
	() => {
		sharedWith.value = projectsStore.currentProject?.sharedWith ?? [];
		projectName.value = projectsStore.currentProject?.name ?? '';
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
		<form>
			<fieldset>
				<label for="projectName">{{ locale.baseText('projects.settings.projectName') }}</label>
				<n8n-input id="projectName" v-model="projectName" type="text" name="projectName" />
			</fieldset>
			<fieldset>
				<label for="projectMembers">{{
					locale.baseText('projects.settings.projectMembers')
				}}</label>
				<n8n-user-select
					id="projectMembers"
					class="mb-s"
					size="large"
					:users="usersList"
					:current-user-id="currentUser?.id"
					:placeholder="$locale.baseText('workflows.shareModal.select.placeholder')"
					data-test-id="workflow-sharing-modal-users-select"
					@update:modelValue="onAddSharee"
				>
					<template #prefix>
						<n8n-icon icon="search" />
					</template>
				</n8n-user-select>
				<n8n-users-list
					:actions="[]"
					:users="sharedWithList"
					:current-user-id="currentUser?.id"
					:delete-label="$locale.baseText('workflows.shareModal.list.delete')"
				>
					<template #actions="{ user }">
						<n8n-select
							:class="$style.roleSelect"
							model-value="editor"
							size="small"
							@update:modelValue="onRoleAction(user, $event)"
						>
							<n8n-option :label="$locale.baseText('workflows.roles.editor')" value="editor" />
							<n8n-option :class="$style.roleSelectRemoveOption" value="remove">
								<n8n-text color="danger">{{
									$locale.baseText('workflows.shareModal.list.delete')
								}}</n8n-text>
							</n8n-option>
						</n8n-select>
					</template>
				</n8n-users-list>
			</fieldset>
			<fieldset>
				<div :class="$style.buttons">
					<small class="mr-2xs">{{
						locale.baseText('projects.settings.message.unsavedChanges')
					}}</small>
					<n8n-button type="secondary" class="mr-2xs">{{
						locale.baseText('projects.settings.button.cancel')
					}}</n8n-button>
					<n8n-button type="primary">{{
						locale.baseText('projects.settings.button.save')
					}}</n8n-button>
				</div>
			</fieldset>
			<fieldset>
				<hr class="mb-2xl" />
				<h3 class="mb-xs">{{ locale.baseText('projects.settings.title.deleteProject') }}</h3>
				<n8n-button type="danger" class="mb-xs">{{
					locale.baseText('projects.settings.title.deleteProject')
				}}</n8n-button>
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
	justify-content: flex-end;
	align-items: center;
}
</style>
