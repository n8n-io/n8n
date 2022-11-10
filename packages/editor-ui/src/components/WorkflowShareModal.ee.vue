<template>
	<Modal
		width="460px"
		:title="$locale.baseText(fakeDoor.actionBoxTitle, { interpolate: { name: workflow.name } })"
		:eventBus="modalBus"
		:name="WORKFLOW_SHARE_MODAL_KEY"
		:center="true"
	>
		<template slot="content">
			<div :class="$style.container">
				<enterprise-edition :features="[EnterpriseEditionFeature.WorkflowSharing]">
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
						:actions="[]"
						:users="sharedWithList"
						:currentUserId="currentUser.id"
						:delete-label="$locale.baseText('workflows.shareModal.list.delete')"
						:readonly="!workflowPermissions.updateSharing"
						@delete="onRemoveSharee"
					>
						<template v-slot:actions="{ user }">
							<n8n-select
								:class="$style.roleSelect"
								value="editor"
								size="small"
								@change="onRoleAction(user, $event)"
							>
								<n8n-option
									:label="$locale.baseText('workflows.roles.editor')"
									value="editor" />
								<n8n-option
									:class="$style.roleSelectRemoveOption"
									value="remove"
								>
									<n8n-text color="danger">{{ $locale.baseText('workflows.shareModal.list.delete') }}</n8n-text>
								</n8n-option>
							</n8n-select>
						</template>
					</n8n-users-list>
					<template #fallback>
						<n8n-text>
							{{ $locale.baseText(fakeDoor.actionBoxDescription) }}
						</n8n-text>
					</template>
				</enterprise-edition>
			</div>
		</template>

		<template slot="footer">
			<enterprise-edition :features="[EnterpriseEditionFeature.WorkflowSharing]" :class="$style.actionButtons">
				<n8n-text
					v-show="isDirty"
					color="text-light"
					size="small"
					class="mr-xs"
				>
					{{ $locale.baseText('workflows.shareModal.changesHint') }}
				</n8n-text>
				<n8n-button
					v-show="workflowPermissions.updateSharing"
					@click="onSave"
					:loading="loading"
					:disabled="!isDirty"
					size="medium"
				>
					{{ $locale.baseText('workflows.shareModal.save') }}
				</n8n-button>

				<template #fallback>
					<n8n-link :to="fakeDoor.linkURL">
						<n8n-button
							:loading="loading"
							size="medium"
						>
							{{ $locale.baseText(fakeDoor.actionBoxButtonLabel) }}
						</n8n-button>
					</n8n-link>
				</template>
			</enterprise-edition>
		</template>
	</Modal>
</template>

<script lang="ts">
import Vue from 'vue';
import Modal from './Modal.vue';
import {
	EnterpriseEditionFeature,
	FAKE_DOOR_FEATURES,
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	WORKFLOW_SHARE_MODAL_KEY
} from '../constants';
import {IFakeDoor, IUser, IWorkflowDb} from "@/Interface";
import { getWorkflowPermissions, IPermissions } from "@/permissions";
import mixins from "vue-typed-mixins";
import {showMessage} from "@/components/mixins/showMessage";
import {nodeViewEventBus} from "@/event-bus/node-view-event-bus";
import {mapStores} from "pinia";
import {useSettingsStore} from "@/stores/settings";
import {useUIStore} from "@/stores/ui";
import {useUsersStore} from "@/stores/users";
import {useWorkflowsStore} from "@/stores/workflows";
import useWorkflowsEEStore from "@/stores/workflows.ee";

export default mixins(
	showMessage,
).extend({
	name: 'workflow-share-modal',
	components: {
		Modal,
	},
	data() {
		const workflowsStore = useWorkflowsStore();

		return {
			WORKFLOW_SHARE_MODAL_KEY,
			loading: false,
			modalBus: new Vue(),
			sharedWith: [...(workflowsStore.workflow.sharedWith || [])] as Array<Partial<IUser>>,
			EnterpriseEditionFeature,
		};
	},
	computed: {
		...mapStores(useSettingsStore, useUIStore, useUsersStore, useWorkflowsStore, useWorkflowsEEStore),
		usersList(): IUser[] {
			return this.usersStore.allUsers.filter((user: IUser) => {
				const isCurrentUser = user.id === this.usersStore.currentUser?.id;
				const isAlreadySharedWithUser = (this.sharedWith || []).find((sharee) => sharee.id === user.id);

				return !isCurrentUser && !isAlreadySharedWithUser;
			});
		},
		sharedWithList(): Array<Partial<IUser>> {
			return ([
				{
					...(this.workflow && this.workflow.ownedBy ? this.workflow.ownedBy : this.usersStore.currentUser),
					isOwner: true,
				},
			] as Array<Partial<IUser>>).concat(this.sharedWith || []);
		},
		workflow(): IWorkflowDb {
			return this.workflowsStore.workflow;
		},
		currentUser(): IUser | null {
			return this.usersStore.currentUser;
		},
		workflowPermissions(): IPermissions {
			return getWorkflowPermissions(this.usersStore.currentUser, this.workflow);
		},
		isSharingAvailable(): boolean {
			return this.settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.WorkflowSharing) === true;
		},
		fakeDoor(): IFakeDoor | undefined {
			return this.uiStore.getFakeDoorById(FAKE_DOOR_FEATURES.WORKFLOWS_SHARING);
		},
		isDirty(): boolean {
			const previousSharedWith = this.workflow.sharedWith || [];

			return this.sharedWith.length !== previousSharedWith.length ||
				this.sharedWith.some(
					(sharee) => !previousSharedWith.find((previousSharee) => sharee.id === previousSharee.id),
				);
		},
	},
	methods: {
		async onSave() {
			if (this.loading) {
				return;
			}

			this.loading = true;

			const saveWorkflowPromise = () => {
				return new Promise<string>((resolve) => {
					if (this.workflow.id === PLACEHOLDER_EMPTY_WORKFLOW_ID) {
						nodeViewEventBus.$emit('saveWorkflow', () => {
							resolve(this.workflowsStore.workflowId);
						});
					} else {
						resolve(this.workflowsStore.workflowId);
					}
				});
			};

			const workflowId = await saveWorkflowPromise();
			await this.workflowsEEStore.saveWorkflowSharedWith({ workflowId, sharedWith: this.sharedWith });
			this.loading = false;
		},
		async onAddSharee(userId: string) {
			const { id, firstName, lastName, email } = this.usersStore.getUserById(userId)!;
			const sharee = { id, firstName, lastName, email };

			this.sharedWith = this.sharedWith.concat(sharee);
		},
		async onRemoveSharee(userId: string) {
			const user = this.usersStore.getUserById(userId)!;
			const isNewSharee = !(this.workflow.sharedWith || []).find((sharee) => sharee.id === userId);

			let confirm = true;
			if (!isNewSharee) {
				confirm = await this.confirmMessage(
					this.$locale.baseText('workflows.shareModal.list.delete.confirm.message', {
						interpolate: { name: user.fullName as string, workflow: this.workflow.name },
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
			}
		},
		onRoleAction(user: IUser, action: string) {
			if (action === 'remove') {
				this.onRemoveSharee(user.id);
			}
		},
		async loadUsers() {
			await this.usersStore.fetchUsers();
		},
	},
	mounted() {
		if (this.isSharingAvailable) {
			this.loadUsers();
		}
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

.roleSelect {
	max-width: 100px;
}

.roleSelectRemoveOption {
	border-top: 1px solid var(--color-foreground-base);
}
</style>
