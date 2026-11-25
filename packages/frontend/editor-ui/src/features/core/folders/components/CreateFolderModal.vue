<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nFormInput,
} from '@n8n/design-system';
import type { IValidator } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';
import { useFolders } from '../composables/useFolders';

defineOptions({ inheritAttrs: false });

const FORM_ID = 'create-folder-form';

const props = defineProps<{
	modalName: string;
	data: {
		parentName?: string;
		onConfirm?: (name: string) => Promise<void> | void;
	};
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const { validateFolderName } = useFolders();

const folderName = ref('');
const isNameValid = ref(false);
const isSubmitting = ref(false);
const showNameError = ref(false);
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const title = computed(() =>
	i18n.baseText('folders.add.to.parent.message', {
		interpolate: { parent: props.data.parentName ?? '' },
	}),
);

const folderNameValidator: IValidator = {
	validate: (value) => {
		if (typeof value !== 'string') return false;
		const result = validateFolderName(value);
		return result === true ? false : { message: result };
	},
};

function onNameBlur() {
	if (folderName.value) showNameError.value = true;
}

async function onCreate() {
	showNameError.value = true;
	if (!isNameValid.value || isSubmitting.value) return;

	isSubmitting.value = true;
	try {
		await props.data.onConfirm?.(folderName.value);
		uiStore.closeModal(props.modalName);
	} finally {
		isSubmitting.value = false;
	}
}

function onCancel() {
	// The create request cannot be cancelled. A close while it runs would
	// later close a create-folder dialog the user opens next.
	if (isSubmitting.value) return;
	uiStore.closeModal(props.modalName);
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) onCancel();
}
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:header="title"
		:close-on-escape="!isSubmitting"
		:close-on-overlay-click="!isSubmitting"
		:show-close-button="!isSubmitting"
		data-test-id="create-folder-modal"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<form :id="FORM_ID" @submit.prevent="onCreate">
				<N8nFormInput
					v-model="folderName"
					name="folderName"
					:label="i18n.baseText('generic.name')"
					required
					:validate-on-blur="false"
					:show-validation-warnings="showNameError"
					:validators="{ VALID_FOLDER_NAME: folderNameValidator }"
					:validation-rules="[{ name: 'VALID_FOLDER_NAME' }]"
					data-test-id="create-folder-name-input"
					@blur="onNameBlur"
					@enter="onCreate"
					@validate="isNameValid = $event"
				/>
			</form>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				type="button"
				variant="outline"
				:label="i18n.baseText('generic.cancel')"
				:disabled="isSubmitting"
				data-test-id="create-folder-cancel"
				@click="onCancel"
			/>
			<N8nButton
				type="submit"
				:form="FORM_ID"
				:label="i18n.baseText('generic.create')"
				:disabled="!isNameValid"
				:loading="isSubmitting"
				data-test-id="create-folder-confirm"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>
