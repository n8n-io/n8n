<template>
	<n8n-card :class="$style.cardLink" @click="onClick">
		<template #prepend>
			<n8n-node-icon
				size="xs"
				type="icon"
				name="folder-open"
				color="grey"
				:class="$style.icon"
				@click="onClick"
			></n8n-node-icon>
		</template>
		<template #header>
			<n8n-heading tag="h2" bold :class="$style.cardHeading" data-test-id="folder-card-name">
				{{ data.name }}
			</n8n-heading>
		</template>
		<div :class="$style.cardDescription">
			<n8n-text color="text-light" size="small">
				<span v-show="data" class="mr-2xs"
					>{{ data.usageCount ? data.usageCount : 0 }}
					{{ $locale.baseText('folder.item.usageCount') }}
				</span>
			</n8n-text>
		</div>
		<template #append>
			<div :class="$style.cardActions" ref="cardActions">
				<n8n-action-toggle
					:actions="actions"
					theme="dark"
					@action="onAction"
					@click.stop
					data-test-id="folder-card-actions"
				/>
			</div>
		</template>
	</n8n-card>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { IWorkflowDb, IUser } from '@/Interface';
import { FOLDER_RENAME_MODAL_KEY, MODAL_CONFIRM, WORKFLOW_SHARE_MODAL_KEY } from '@/constants';
import { useToast, useMessage } from '@/composables';
import type { IPermissions } from '@/permissions';
import { getWorkflowPermissions } from '@/permissions';
import dateformat from 'dateformat';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useFoldersStore } from '@/stores/folders.store';
import TimeAgo from '@/components/TimeAgo.vue';

export const FOLDER_LIST_ITEM_ACTIONS = {
	RENAME: 'rename',
	DELETE: 'delete',
};

export default defineComponent({
	data() {},
	setup() {
		return {
			...useToast(),
			...useMessage(),
		};
	},
	components: {
		TimeAgo,
	},
	props: {
		data: {
			type: Object,
			required: true,
			default: (): IWorkflowDb => ({
				id: '',
				createdAt: '',
				updatedAt: '',
				active: false,
				connections: {},
				nodes: [],
				name: '',
				sharedWith: [],
				ownedBy: {} as IUser,
				versionId: '',
			}),
		},
		readOnly: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		...mapStores(useSettingsStore, useUIStore, useUsersStore, useWorkflowsStore, useFoldersStore),
		currentUser(): IUser {
			return this.usersStore.currentUser || ({} as IUser);
		},
		workflowPermissions(): IPermissions {
			return getWorkflowPermissions(this.currentUser, this.data);
		},
		actions(): Array<{ label: string; value: string }> {
			const actions = [
				{
					label: this.$locale.baseText('folder.item.rename'),
					value: FOLDER_LIST_ITEM_ACTIONS.RENAME,
				},
				{
					label: this.$locale.baseText('folder.item.delete'),
					value: FOLDER_LIST_ITEM_ACTIONS.DELETE,
				},
			];

			return actions;
		},
		formattedCreatedAtDate(): string {
			const currentYear = new Date().getFullYear();

			return dateformat(
				this.data.createdAt,
				`d mmmm${this.data.createdAt.startsWith(currentYear) ? '' : ', yyyy'}`,
			);
		},
	},
	methods: {
		async onClick(event: Event) {
			this.$emit('click:folder', this.data);
		},
		async onAction(action: string) {
			if (action === FOLDER_LIST_ITEM_ACTIONS.OPEN) {
				await this.onClick();
			} else if (action === FOLDER_LIST_ITEM_ACTIONS.SHARE) {
				this.uiStore.openModalWithData({
					name: WORKFLOW_SHARE_MODAL_KEY,
					data: { id: this.data.id },
				});
			} else if (action === FOLDER_LIST_ITEM_ACTIONS.DELETE) {
				const deleteConfirmed = await this.confirm(
					this.$locale.baseText('mainSidebar.confirmMessage.folderDelete.message', {
						interpolate: { folderName: this.data.name },
					}),
					this.$locale.baseText('mainSidebar.confirmMessage.folderDelete.headline'),
					{
						type: 'warning',
						confirmButtonText: this.$locale.baseText(
							'mainSidebar.confirmMessage.folderDelete.confirmButtonText',
						),
						cancelButtonText: this.$locale.baseText(
							'mainSidebar.confirmMessage.folderDelete.cancelButtonText',
						),
					},
				);

				if (deleteConfirmed !== MODAL_CONFIRM) {
					return;
				}

				try {
					await this.foldersStore.delete(this.data.id);
				} catch (error) {
					this.showError(error, this.$locale.baseText('generic.deleteWorkflowError'));
					return;
				}

				// Reset tab title since folder is deleted.
				this.showMessage({
					title: this.$locale.baseText('mainSidebar.showMessage.handleFolderDelete.title'),
					type: 'success',
				});
			}
		},
	},
});
</script>

<style lang="scss" module>
.cardLink {
	transition: box-shadow 0.3s ease;
	cursor: pointer;
	padding: 0 0 0 var(--spacing-s);
	align-items: stretch;

	&:hover {
		box-shadow: 0 2px 8px rgba(#441c17, 0.1);
	}
}

.cardHeading {
	font-size: var(--font-size-s);
	word-break: break-word;
	padding: var(--spacing-s) 0 0 var(--spacing-s);
}

.cardDescription {
	min-height: 19px;
	display: flex;
	align-items: center;
	padding: 0 0 var(--spacing-s) var(--spacing-s);
}

.cardActions {
	display: flex;
	flex-direction: row;
	justify-content: center;
	align-items: center;
	align-self: stretch;
	padding: 0 var(--spacing-s) 0 0;
	cursor: default;
}

.icon {
	height: 26px;
	// padding-left: 14px;
}
</style>
