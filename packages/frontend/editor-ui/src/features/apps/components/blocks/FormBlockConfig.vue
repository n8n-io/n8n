<script setup lang="ts">
import { N8nInput, N8nInputLabel, N8nOption, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { FormBlock } from '@n8n/api-types';
import { onMounted, reactive, ref, watch } from 'vue';

import { FORM_TRIGGER_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

type FormBlockData = FormBlock['data'];

const props = defineProps<{
	modelValue: Partial<FormBlockData>;
	projectId: string;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: FormBlockData];
}>();

const i18n = useI18n();
const workflowsListStore = useWorkflowsListStore();

const workflowOptions = ref<Array<{ id: string; name: string }>>([]);

onMounted(async () => {
	const workflows = await workflowsListStore.fetchWorkflowsPage(
		props.projectId,
		1,
		100,
		undefined,
		{
			triggerNodeTypes: [FORM_TRIGGER_NODE_TYPE],
			active: true,
			isArchived: false,
		},
	);
	workflowOptions.value = workflows.map((workflow) => ({ id: workflow.id, name: workflow.name }));
});

const form = reactive({
	workflowId: props.modelValue.workflowId ?? '',
	submitLabel: props.modelValue.submitLabel ?? '',
	successMessage: props.modelValue.successMessage ?? '',
});

watch(
	form,
	() =>
		emit('update:modelValue', {
			workflowId: form.workflowId,
			...(form.submitLabel ? { submitLabel: form.submitLabel } : {}),
			...(form.successMessage ? { successMessage: form.successMessage } : {}),
		}),
	{ deep: true },
);
</script>

<template>
	<div :class="$style.container" data-test-id="form-block-config">
		<N8nInputLabel
			:label="i18n.baseText('apps.block.form.workflow.label')"
			input-name="form-workflow"
		>
			<N8nSelect
				v-model="form.workflowId"
				size="medium"
				filterable
				data-test-id="form-block-workflow-select"
			>
				<N8nOption
					v-for="option in workflowOptions"
					:key="option.id"
					:value="option.id"
					:label="option.name"
				/>
			</N8nSelect>
		</N8nInputLabel>
		<N8nInput
			v-model="form.submitLabel"
			size="medium"
			:placeholder="i18n.baseText('apps.block.form.submitLabel.placeholder')"
			data-test-id="form-block-submit-label"
		/>
		<N8nInput
			v-model="form.successMessage"
			size="medium"
			type="textarea"
			:rows="2"
			:placeholder="i18n.baseText('apps.block.form.successMessage.placeholder')"
			data-test-id="form-block-success-message"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
}
</style>
