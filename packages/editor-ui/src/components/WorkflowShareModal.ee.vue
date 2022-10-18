<template>
	<Modal
		width="540px"
		:title="$locale.baseText('workflows.shareModal.title', { interpolate: { name: workflow.name } })"
		:eventBus="modalBus"
		:name="WORKFLOW_SHARE_MODAL_KEY"
		:center="true"
	>
		<template slot="content">
			<div :class="$style.container">
				<n8n-user-select
					v-if="workflowPermissions.updateSharing"
					size="large"
					:users="usersList"
					:currentUserId="currentUser.id"
					:placeholder="$locale.baseText('workflows.shareModal.select.placeholder')"
					@input="onAddSharee"
				>
					<template #prefix>
						<n8n-icon icon="search" />
					</template>
				</n8n-user-select>
				<n8n-users-list
					:users="sharedWithList"
					:currentUserId="currentUser.id"
					:delete-label="$locale.baseText('workflows.shareModal.list.delete')"
					:readonly="!workflowPermissions.updateSharing"
					@delete="onRemoveSharee"
				>
					<template v-slot:actions="{ user }">
						<n8n-select v-model="selectedOption" :placeholder="getPlaceholderText" size="small"  @change="optionSelected" filterable>
							<n8n-option
								v-for="item in parameterOptions"
								:key="item.name"
								:label="$locale.nodeText().collectionOptionDisplayName(parameter, item, path)"
								:value="item.name">
							</n8n-option>
						</n8n-select>
					</template>
				</n8n-users-list>
			</div>
		</template>

		<template slot="footer" v-if="dirty">
			<div :class="$style.actionButtons">
				<n8n-text color="text-light" size="small" class="mr-xs">
					{{ $locale.baseText('workflows.shareModal.changesHint') }}
				</n8n-text>
				<n8n-button
					@click="onSave"
					:loading="loading"
					size="medium"
				>
					{{ $locale.baseText('workflows.shareModal.save') }}
				</n8n-button>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import Modal from './Modal.vue';
import { WORKFLOW_SHARE_MODAL_KEY } from '../constants';
import {IUser, IWorkflowDb} from "@/Interface";
import { getWorkflowPermissions, IPermissions } from "@/permissions";
import mixins from "vue-typed-mixins";
import {showMessage} from "@/components/mixins/showMessage";

export default mixins(
	showMessage,
).extend({
	name: 'workflow-share-modal',
	components: {
		Modal,
	},
	data() {
		return {
			WORKFLOW_SHARE_MODAL_KEY,
			dirty: false,
			loading: false,
			modalBus: new Vue(),
			sharedWith: [...(this.$store.getters.workflow.sharedWith || [])],
		};
	},
	computed: {
		allUsers(): IUser[] {
			return this.$store.getters['users/allUsers'];
		},
		currentUser(): IUser {
			return this.$store.getters['users/currentUser'];
		},
		usersList(): IUser[] {
			return this.allUsers.filter((user: IUser) => {
				const isCurrentUser = user.id === this.currentUser.id;
				const isAlreadySharedWithUser = (this.sharedWith || []).find((sharee) => sharee.id === user.id);

				return !isCurrentUser && !isAlreadySharedWithUser;
			});
		},
		sharedWithList(): Array<Partial<IUser>> {
			return ([
				{
					...(this.workflow && this.workflow.ownedBy ? this.workflow.ownedBy : this.currentUser),
					isOwner: true,
				},
			] as Array<Partial<IUser>>).concat(this.sharedWith || []);
		},
		workflow(): IWorkflowDb {
			return this.$store.getters.workflow;
		},
		workflowPermissions(): IPermissions {
			return getWorkflowPermissions(this.currentUser, this.workflow, this.$store);
		},
	},
	methods: {
		async onSave() {
			this.loading = true;
			await this.$store.dispatch('setWorkflowSharedWith', {});
			this.loading = false;

			this.modalBus.$emit('close');
		},
		async onAddSharee(userId: string) {
			const { id, firstName, lastName, email } = this.$store.getters['users/getUserById'](userId);
			const sharee = { id, firstName, lastName, email };

			this.sharedWith = this.sharedWith.concat(sharee);
			this.dirty = true;
		},
		async onRemoveSharee(userId: string) {
			const user = this.$store.getters['users/getUserById'](userId);
			const isNewSharee = !(this.workflow.sharedWith || []).find((sharee) => sharee.id === userId);

			let confirm = true;
			if (!isNewSharee) {
				confirm = await this.confirmMessage(
					this.$locale.baseText('workflows.shareModal.list.delete.confirm.message', {
						interpolate: { name: user.fullName, workflow: this.workflow.name },
					}),
					this.$locale.baseText('workflows.shareModal.list.delete.confirm.title', { interpolate: { name: user.fullName } }),
					null,
					this.$locale.baseText('workflows.shareModal.list.delete.confirm.confirmButtonText'),
					this.$locale.baseText('workflows.shareModal.list.delete.confirm.cancelButtonText'),
				);
			}

			if (confirm) {
				this.sharedWith = this.sharedWith.filter((sharee: IUser) => {
					return sharee.id !== user.id;
				});
				this.dirty = true;
			}
		},
		async loadUsers() {
			await this.$store.dispatch('users/fetchUsers');
		},
	},
	mounted() {
		this.loadUsers();
	},
});
</script>

<style module lang="scss">
.container > * {
	margin-bottom: var(--spacing-s);
	overflow-wrap: break-word;
}

.actionButtons {
	display: flex;
	justify-content: flex-end;
	align-items: center;
}
</style>
