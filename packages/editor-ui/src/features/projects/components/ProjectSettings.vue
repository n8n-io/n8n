<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useUsersStore } from '@/stores/users.store';
import type { IUser } from '@/Interface';

const usersStore = useUsersStore();

const sharedWith = ref<Array<Partial<IUser>>>([]);

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
				<label for="projectName">Project Name</label>
				<input id="projectName" type="text" name="projectName" />
			</fieldset>
			<fieldset>
				<label for="projectName">Project Members</label>
				<n8n-user-select
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
					<span>You have unsaved changes</span>
					<n8n-button type="secondary">Cancel</n8n-button>
					<n8n-button type="primary">Save</n8n-button>
				</div>
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
		display: grid;
		align-content: start;
		width: 100%;
		max-width: 800px;
		padding: 0 var(--spacing-2xl);

		fieldset {
			display: grid;
			margin-top: var(--spacing-2xl);
		}
	}
}

.buttons {
	display: flex;
	justify-content: flex-end;
	align-items: center;
}
</style>
