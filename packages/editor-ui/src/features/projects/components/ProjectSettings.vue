<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useUsersStore } from '@/stores/users.store';
import type { IUser } from '@/Interface';
import { useI18n } from '@/composables/useI18n';
import { useProjectsStore } from '@/features/projects/projects.store';

const usersStore = useUsersStore();
const locale = useI18n();
const projectsStore = useProjectsStore();

const sharedWith = ref<Array<Partial<IUser>>>([]);
const projectName = ref(projectsStore.currentProject?.name);

const usersList = computed(() => usersStore.allUsers);
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
</script>

<template>
	<div :class="$style.projectSettings">
		<form>
			<fieldset>
				<label for="projectName">{{ locale.baseText('projects.settings.projectName') }}</label>
				<n8n-input id="projectName" type="text" name="projectName" :value="projectName" />
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

	form {
		width: 100%;
		max-width: 800px;
		padding: 0 var(--spacing-2xl);

		fieldset {
			margin-top: var(--spacing-2xl);

			label {
				display: block;
				margin-bottom: var(--spacing-xs);
				font-size: var(--font-size-xl);
			}
		}
	}
}

.buttons {
	display: flex;
	justify-content: flex-end;
	align-items: center;
}
</style>
