<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
} from '@n8n/design-system';
import { useUIStore } from '@/app/stores/ui.store';

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

function onDialogOpenUpdate(open: boolean) {
	if (!open) void closeDialog();
}
</script>

<template>
	<N8nDialog
		:open="modalOpen"
		size="medium"
		:header="i18n.baseText('dataTable.download.modal.title')"
		@update:open="onDialogOpenUpdate"
	>
		<N8nDialogBody>
			<div :class="$style.content">
				<N8nCheckbox
					v-model="includeSystemColumns"
					:label="i18n.baseText('dataTable.download.modal.includeSystemColumns')"
					data-test-id="download-include-system-columns"
				/>
			</div>
		</N8nDialogBody>
		<N8nDialogFooter>
			<div :class="$style.footer">
				<N8nButton
					size="large"
					variant="subtle"
					:label="i18n.baseText('dataTable.download.modal.cancel')"
					data-test-id="download-modal-cancel"
					@click="() => $emit('close')"
				/>
				<N8nButton
					size="large"
					:label="i18n.baseText('dataTable.download.modal.confirm')"
					data-test-id="download-modal-confirm"
					@click="onConfirm"
				/>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.content {
	padding: var(--spacing--xs) 0;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
