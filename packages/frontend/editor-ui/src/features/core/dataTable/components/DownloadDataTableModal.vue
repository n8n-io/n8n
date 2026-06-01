<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';
import { N8nCheckbox, N8nButton } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';

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

const includeSystemColumns = ref(false);

const onConfirm = () => {
	emit('confirm', includeSystemColumns.value);
};
</script>

<template>
	<Modal
		:name="props.modalName"
		:title="i18n.baseText('dataTable.download.modal.title')"
		:center="true"
		width="460px"
		:event-bus="undefined"
		@enter="onConfirm"
	>
		<template #content>
			<div :class="$style.content">
				<N8nCheckbox
					v-model="includeSystemColumns"
					:label="i18n.baseText('dataTable.download.modal.includeSystemColumns')"
					data-test-id="download-include-system-columns"
				/>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					type="secondary"
					size="large"
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
		</template>
	</Modal>
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
