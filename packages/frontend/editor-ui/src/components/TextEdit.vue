<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import type { INodeProperties } from 'n8n-workflow';
import { APP_MODALS_ELEMENT_ID } from '@/constants';
import { useI18n } from '@n8n/i18n';
import { useNDVStore } from '@/stores/ndv.store';
import { storeToRefs } from 'pinia';

import { ElDialog } from 'element-plus';
import { N8nInput, N8nInputLabel } from '@n8n/design-system';
const props = defineProps<{
	dialogVisible: boolean;
	parameter: INodeProperties;
	path: string;
	modelValue: string;
	isReadOnly: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
	closeDialog: [];
}>();

const inputField = ref<HTMLInputElement | null>(null);
const tempValue = ref('');

const ndvStore = useNDVStore();
const i18n = useI18n();

const { activeNode } = storeToRefs(ndvStore);

watch(
	() => props.dialogVisible,
	async (newValue) => {
		if (newValue) {
			await nextTick();
			inputField.value?.focus();
		}
	},
);

watch(
	() => props.modelValue,
	(value: string) => {
		tempValue.value = value;
	},
);

onMounted(() => {
	tempValue.value = props.modelValue;
});

const valueChanged = (value: string) => {
	emit('update:modelValue', value);
};

const onKeyDownEsc = () => {
	// Resetting input value when closing the dialog, required when closing it using the `Esc` key
	tempValue.value = props.modelValue;
	closeDialog();
};

const closeDialog = () => {
	// Handle the close externally as the visible parameter is an external prop
	// and is so not allowed to be changed here.
	emit('closeDialog');
};
</script>

<template>
	<div v-if="dialogVisible">
		<ElDialog
			:model-value="dialogVisible"
			:append-to="`#${APP_MODALS_ELEMENT_ID}`"
			width="80%"
			:title="`${i18n.baseText('textEdit.edit')} ${i18n
				.nodeText(activeNode?.type)
				.inputLabelDisplayName(parameter, path)}`"
			:before-close="closeDialog"
		>
			<div class="ignore-key-press-canvas">
				<N8nInputLabel
					:label="i18n.nodeText(activeNode?.type).inputLabelDisplayName(parameter, path)"
				>
					<div @keydown.stop @keydown.esc="onKeyDownEsc">
						<N8nInput
							ref="inputField"
							v-model="tempValue"
							type="textarea"
							:placeholder="i18n.nodeText(activeNode?.type).placeholder(parameter, path)"
							:read-only="isReadOnly"
							:rows="15"
							@update:model-value="valueChanged"
						/>
					</div>
				</N8nInputLabel>
			</div>
		</ElDialog>
	</div>
</template>
