<template>
	<div v-if="dialogVisible">
		<el-dialog
			:model-value="dialogVisible"
			append-to-body
			width="80%"
			:title="`${$locale.baseText('textEdit.edit')} ${$locale
				.nodeText()
				.inputLabelDisplayName(parameter, path)}`"
			:before-close="closeDialog"
		>
			<div class="ignore-key-press">
				<n8n-input-label :label="$locale.nodeText().inputLabelDisplayName(parameter, path)">
					<div @keydown.stop @keydown.esc="onKeyDownEsc">
						<n8n-input
							ref="inputField"
							v-model="tempValue"
							type="textarea"
							:placeholder="$locale.nodeText().placeholder(parameter, path)"
							:read-only="isReadOnly"
							:rows="15"
							@update:model-value="valueChanged"
						/>
					</div>
				</n8n-input-label>
			</div>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';
import type { INodeProperties } from 'n8n-workflow';

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
