<template>
	<Modal
		width="460px"
		title="moveToFolder"
		:eventBus="modalBus"
		:name="MOVE_TO_FOLDER_MODAL_KEY"
		:center="true"
		:beforeClose="onCloseModal"
	>
		<template #header>
			<h2 :class="$style.title">
				{{ $locale.baseText('moveToFolderModal.title') }}
			</h2>
		</template>
		<template #content>
			<div :class="$style.container">
				<n8n-select
					:modelValue="selected"
					:disabled="loading"
					@update:modelValue="onSelectionChange"
				>
					<n8n-option
						v-for="folder in availableFolders"
						:key="folder.id"
						:label="folder.name"
						:value="folder.id"
						:data-test-id="`matching-column-option-${folder.id}`"
					>
						{{ folder.name }}
					</n8n-option>
				</n8n-select>
			</div>
		</template>

		<template #footer>
			<div :class="$style.actionButtons">
				<n8n-button
					:loading="loading"
					data-test-id="workflow-sharing-modal-save-button"
					@click="onMoveToFolder"
				>
					{{ $locale.baseText('workflows.shareModal.save') }}
				</n8n-button>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { createEventBus } from 'n8n-design-system/utils';

import Modal from './Modal.vue';
import { MODAL_CONFIRM, MOVE_TO_FOLDER_MODAL_KEY } from '@/constants';
import type { IFolder } from '@/Interface';
import { useToast, useMessage } from '@/composables';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import { useFoldersStore } from '@/stores/folders.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowsEEStore } from '@/stores/workflows.ee.store';
import { useUsageStore } from '@/stores/usage.store';

export default defineComponent({
	name: MOVE_TO_FOLDER_MODAL_KEY,
	components: {
		Modal,
	},
	props: {
		data: {
			type: Object,
			default: () => ({}),
		},
	},
	setup() {
		return {
			...useToast(),
			...useMessage(),
		};
	},
	data() {
		const foldersStore = useFoldersStore();

		return {
			MOVE_TO_FOLDER_MODAL_KEY,
			loading: true,
			modalBus: createEventBus(),
			folders: foldersStore.allFolders,
			selected: '',
			workflowId: this.data.id,
			currentFolderId: this.data.currentFolderId,
		};
	},
	computed: {
		...mapStores(
			useSettingsStore,
			useUIStore,
			useUsersStore,
			useUsageStore,
			useWorkflowsStore,
			useWorkflowsEEStore,
			useFoldersStore,
		),
		availableFolders(): IFolder[] {
			if (!this.currentFolderId) return this.folders;
			return this.folders.filter((folder) => folder.id !== this.currentFolderId);
		},
	},
	methods: {
		async onMoveToFolder() {
			await this.workflowsStore.updateWorkflow(this.workflowId, { folder: this.selected });
			await this.workflowsStore.fetchAllWorkflows();
			await this.foldersStore.fetchAll({ force: true });
			this.modalBus.emit('close');
		},
		onSelectionChange(value) {
			this.selected = value;
		},
		async onCloseModal() {
			if (this.isDirty) {
				const shouldSave = await this.confirm(
					this.$locale.baseText('workflows.shareModal.saveBeforeClose.message'),
					this.$locale.baseText('workflows.shareModal.saveBeforeClose.title'),
					{
						type: 'warning',
						confirmButtonText: this.$locale.baseText(
							'workflows.shareModal.saveBeforeClose.confirmButtonText',
						),
						cancelButtonText: this.$locale.baseText(
							'workflows.shareModal.saveBeforeClose.cancelButtonText',
						),
					},
				);

				if (shouldSave === MODAL_CONFIRM) {
					return this.onSave();
				}
			}

			return true;
		},
		async initialize() {
			this.loading = false;
		},
	},
	mounted() {
		void this.initialize();
	},
	watch: {},
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
