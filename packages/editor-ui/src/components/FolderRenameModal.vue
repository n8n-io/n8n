<template>
	<Modal
		:name="FOLDER_RENAME_MODAL_KEY"
		:eventBus="modalBus"
		width="50%"
		:center="true"
		:loading="loading"
		maxWidth="460px"
		minHeight="250px"
	>
		<template #header>
			<h2 :class="$style.title">
				{{ $locale.baseText('folderRenameModal.renameFolder') }}
			</h2>
		</template>
		<template #content>
			<div>
				<div :class="$style.subtitle">
					{{ $locale.baseText('folderRenameModal.enterFolderName') }}
				</div>
				<n8n-input
					:name="name"
					:type="type"
					:placeholder="placeholder"
					:modelValue="name"
					:maxlength="maxlength"
					:autocomplete="autocomplete"
					:disabled="disabled"
					@update:modelValue="onUpdateTextInput"
					@blur="onBlur"
					@focus="onFocus"
					ref="inputRef"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<n8n-button
					:label="$locale.baseText('folderRenameModal.save')"
					float="right"
					size="large"
					:disabled="!name"
					@click="renameFolder"
					data-test-id="new-credential-type-button"
				/>
			</div>
		</template>
	</Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Modal from './Modal.vue';
import { FOLDER_RENAME_MODAL_KEY } from '../constants';
import { externalHooks } from '@/mixins/externalHooks';
import { mapStores } from 'pinia';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useFoldersStore } from '@/stores/folders.store';
import { createEventBus } from 'n8n-design-system/utils';

export default defineComponent({
	name: FOLDER_RENAME_MODAL_KEY,
	mixins: [externalHooks],
	components: {
		Modal,
	},
	props: {
		data: {
			type: Object,
			default: () => ({
				id: '',
				name: '',
			}),
		},
	},
	async mounted() {
		this.loading = false;
		setTimeout(() => {
			const elementRef = this.$refs.select as HTMLSelectElement | undefined;
			if (elementRef) {
				elementRef.focus();
			}
		}, 0);
	},
	data() {
		return {
			modalBus: createEventBus(),
			name: this.data.name,
			selected: '',
			loading: true,
			FOLDER_RENAME_MODAL_KEY,
		};
	},
	computed: {
		...mapStores(useUIStore, useWorkflowsStore, useFoldersStore),
	},
	methods: {
		onUpdateTextInput(value: string) {
			this.name = value;
		},
		async renameFolder() {
			await this.foldersStore.rename({ id: this.id, name: this.name });
			this.modalBus.emit('close');
		},
	},
});
</script>

<style module lang="scss">
.title {
	font-size: var(--font-size-xl);
	line-height: var(--font-line-height-regular);
}

.subtitle {
	margin-bottom: var(--spacing-s);
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-xloose);
}
</style>
