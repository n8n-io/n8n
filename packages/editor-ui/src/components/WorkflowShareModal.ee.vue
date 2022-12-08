<template>
	<Modal
		width="460px"
		:title="$locale.baseText(dynamicTranslations.workflows.shareModal.title, { interpolate: { name: workflow.name } })"
		:eventBus="modalBus"
		:name="WORKFLOW_SHARE_MODAL_KEY"
		:center="true"
		:beforeClose="onCloseModal"
	>
		<template #content>
			<div :class="$style.container">
				<enterprise-edition :features="[EnterpriseEditionFeature.WorkflowSharing]">
					<n8n-user-select
						v-if="workflowPermissions.updateSharing"
						class="mb-s"
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
						<template #actions="{ user }">
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
							<i18n :path="dynamicTranslations.workflows.sharing.unavailable.description" tag="span">
								<template #action />
							</i18n>
						</n8n-text>
					</template>
				</enterprise-edition>
			</div>
		</template>

		<template #footer>
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
					<n8n-link :to="dynamicTranslations.workflows.sharing.unavailable.linkURL">
						<n8n-button
							:loading="loading"
							size="medium"
						>
							{{ $locale.baseText(dynamicTranslations.workflows.sharing.unavailable.button) }}
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
	PLACEHOLDER_EMPTY_WORKFLOW_ID,
	WORKFLOW_SHARE_MODAL_KEY,
} from '../constants';
import {IUser, IWorkflowDb, NestedRecord} from "@/Interface";
import { getWorkflowPermissions, IPermissions } from "@/permissions";
import mixins from "vue-typed-mixins";
import {showMessage} from "@/mixins/showMessage";
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
	props: {
		data: {
			type: Object,
			default: () => ({}),
		},
	},
	data() {
		const workflowsStore = useWorkflowsStore();
		const workflow = this.data.id === PLACEHOLDER_EMPTY_WORKFLOW_ID
			? workflowsStore.workflow
			: workflowsStore.workflowsById[this.data.id];

		return {
			WORKFLOW_SHARE_MODAL_KEY,
			loading: false,
			modalBus: new Vue(),
			sharedWith: [...(workflow.sharedWith || [])] as Array<Partial<IUser>>,
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
			return this.data.id === PLACEHOLDER_EMPTY_WORKFLOW_ID
				? this.workflowsStore.workflow
				: this.workflowsStore.workflowsById[this.data.id];
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
		dynamicTranslations(): NestedRecord<string> {
			return this.uiStore.dynamicTranslations;
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

			try {
				const workflowId = await saveWorkflowPromise();
				await this.workflowsEEStore.saveWorkflowSharedWith({ workflowId, sharedWith: this.sharedWith });

				this.$showMessage({
					title: this.$locale.baseText('workflows.shareModal.onSave.success.title'),
					type: 'success',
				});
			} catch (error) {
				this.$showError(error, this.$locale.baseText('workflows.shareModal.onSave.error.title'));
			} finally {
				this.modalBus.$emit('close');
				this.loading = false;
			}
		},
		async onAddSharee(userId: string) {
			const { id, firstName, lastName, email } = this.usersStore.getUserById(userId)!;
			const sharee = { id, firstName, lastName, email };

			this.sharedWith = this.sharedWith.concat(sharee);
		},
		async onRemoveSharee(userId: string) {
			const user = this.usersStore.getUserById(userId)!;
			const isNewSharee = !(this.workflow.sharedWith || []).find((sharee) => sharee.id === userId);

			const isLastUserWithAccessToCredentialsById = (this.workflow.usedCredentials || [])
				.reduce<Record<string, boolean>>((acc, credential) => {
					if (!credential.id || !credential.ownedBy || !credential.sharedWith || !this.workflow.sharedWith) {
						return acc;
					}

					// if is credential owner, and no credential sharees have access to workflow  => NOT OK
					// if is credential owner, and credential sharees have access to workflow => OK

					// if is credential sharee, and no credential sharees have access to workflow or owner does not have access to workflow => NOT OK
					// if is credential sharee, and credential owner has access to workflow => OK
					// if is credential sharee, and other credential sharees have access to workflow => OK

					let isLastUserWithAccess = false;

					const isCredentialOwner = credential.ownedBy.id === user.id;
					const isCredentialSharee = !!credential.sharedWith.find((sharee) => sharee.id === user.id);

					if (isCredentialOwner) {
						isLastUserWithAccess = !credential.sharedWith.some((sharee) => {
							return this.workflow.sharedWith!.find((workflowSharee) => workflowSharee.id === sharee.id);
						});
					} else if (isCredentialSharee) {
						isLastUserWithAccess = !credential.sharedWith.some((sharee) => {
							return this.workflow.sharedWith!.find((workflowSharee) => workflowSharee.id === sharee.id);
						}) && !this.workflow.sharedWith!.find((workflowSharee) => workflowSharee.id === credential.ownedBy!.id);
					}

					acc[credential.id] = isLastUserWithAccess;

					return acc;
				}, {});

			const isLastUserWithAccessToCredentials = Object.values(isLastUserWithAccessToCredentialsById).some((value) => value);

			let confirm = true;
			if (!isNewSharee) {
				confirm = await this.confirmMessage(
					this.$locale.baseText(`workflows.shareModal.list.delete.confirm.${isLastUserWithAccessToCredentials ? 'lastUserWithAccessToCredentials.' : ''}message`, {
						interpolate: { name: user.fullName as string, workflow: this.workflow.name },
					}),
					this.$locale.baseText('workflows.shareModal.list.delete.confirm.title', { interpolate: { name: user.fullName } }),
					null,
					this.$locale.baseText('workflows.shareModal.list.delete.confirm.confirmButtonText'),
					this.$locale.baseText('workflows.shareModal.list.delete.confirm.cancelButtonText'),
				);
			}

			if (confirm) {
				this.sharedWith = this.sharedWith.filter((sharee: Partial<IUser>) => {
					return sharee.id !== user.id;
				});
			}
		},
		onRoleAction(user: IUser, action: string) {
			if (action === 'remove') {
				this.onRemoveSharee(user.id);
			}
		},
		async onCloseModal() {
			if (this.isDirty) {
				const shouldSave = await this.confirmMessage(
					this.$locale.baseText(
						'workflows.shareModal.saveBeforeClose.message',
					),
					this.$locale.baseText('workflows.shareModal.saveBeforeClose.title'),
					'warning',
					this.$locale.baseText('workflows.shareModal.saveBeforeClose.confirmButtonText'),
					this.$locale.baseText('workflows.shareModal.saveBeforeClose.cancelButtonText'),
				);

				if (shouldSave) {
					return await this.onSave();
				}
			}

			return true;
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
