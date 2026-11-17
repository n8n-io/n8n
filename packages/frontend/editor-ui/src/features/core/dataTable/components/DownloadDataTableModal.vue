<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { N8nAlertDialog, N8nCheckbox } from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';

defineOptions({ inheritAttrs: false });

type Props = {
	modalName: string;
	dataTableName: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	confirm: [includeSystemColumns: boolean];
	close: [];
}>();

const i18n = useI18n();
const uiStore = useUIStore();
const modalOpen = computed(() => uiStore.modalsById[props.modalName]?.open === true);

const includeSystemColumns = ref(false);

const onConfirm = () => {
	emit('confirm', includeSystemColumns.value);
};

function closeDialog() {
	uiStore.closeModal(props.modalName);
}

function onCancel() {
	emit('close');
}

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}
</script>

<template>
	<N8nAlertDialog
		:open="modalOpen"
		size="medium"
		:title="i18n.baseText('dataTable.download.modal.title')"
		:action-label="i18n.baseText('dataTable.download.modal.confirm')"
		:cancel-label="i18n.baseText('dataTable.download.modal.cancel')"
		@action="onConfirm"
		@cancel="onCancel"
		@update:open="onDialogOpenUpdate"
	>
		<N8nCheckbox
			v-model="includeSystemColumns"
			:label="i18n.baseText('dataTable.download.modal.includeSystemColumns')"
			data-test-id="download-include-system-columns"
		/>
	</N8nAlertDialog>
</template>
