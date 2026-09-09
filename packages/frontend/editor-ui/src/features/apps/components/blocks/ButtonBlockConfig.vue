<script setup lang="ts">
import {
	N8nButton,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ButtonBlock } from '@n8n/api-types';
import { onMounted, reactive, ref, watch } from 'vue';

import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

type ButtonBlockData = ButtonBlock['data'];

const props = defineProps<{
	modelValue: Partial<ButtonBlockData>;
	projectId: string;
	/** Ids of `code` blocks already on this page — the possible targets of an "action" button. */
	codeBlockIds: string[];
}>();

const emit = defineEmits<{
	'update:modelValue': [value: ButtonBlockData];
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
			triggerNodeTypes: [EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE],
			active: true,
			isArchived: false,
		},
	);
	workflowOptions.value = workflows.map((workflow) => ({ id: workflow.id, name: workflow.name }));
});

const initialTarget = props.modelValue.target;
const form = reactive({
	label: props.modelValue.label ?? '',
	style: props.modelValue.style ?? ('primary' as ButtonBlockData['style']),
	targetKind: initialTarget?.kind ?? ('workflow' as 'workflow' | 'action'),
	workflowId: initialTarget?.kind === 'workflow' ? initialTarget.workflowId : '',
	blockId: initialTarget?.kind === 'action' ? initialTarget.blockId : '',
	action: initialTarget?.kind === 'action' ? initialTarget.action : '',
});
const inputRows = reactive<Array<{ key: string; value: string }>>(
	Object.entries(initialTarget?.kind === 'workflow' ? (initialTarget.input ?? {}) : {}).map(
		([key, value]) => ({ key, value }),
	),
);

function emitUpdate() {
	const target: ButtonBlockData['target'] =
		form.targetKind === 'workflow'
			? {
					kind: 'workflow',
					workflowId: form.workflowId,
					input: Object.fromEntries(
						inputRows.filter((row) => row.key).map((row) => [row.key, row.value]),
					),
				}
			: { kind: 'action', blockId: form.blockId, action: form.action };
	emit('update:modelValue', { label: form.label, style: form.style, target });
}

const addInputRow = () => inputRows.push({ key: '', value: '' });
const removeInputRow = (index: number) => inputRows.splice(index, 1);

watch(form, emitUpdate, { deep: true });
watch(inputRows, emitUpdate, { deep: true });
</script>

<template>
	<div :class="$style.container" data-test-id="button-block-config">
		<N8nInput
			v-model="form.label"
			size="medium"
			:placeholder="i18n.baseText('apps.block.button.label.placeholder')"
			data-test-id="button-block-label"
		/>
		<N8nSelect v-model="form.style" size="medium" data-test-id="button-block-style">
			<N8nOption value="primary" :label="i18n.baseText('apps.block.button.style.primary')" />
			<N8nOption value="secondary" :label="i18n.baseText('apps.block.button.style.secondary')" />
		</N8nSelect>
		<N8nSelect v-model="form.targetKind" size="medium" data-test-id="button-block-target-kind">
			<N8nOption value="workflow" :label="i18n.baseText('apps.block.button.target.workflow')" />
			<N8nOption value="action" :label="i18n.baseText('apps.block.button.target.action')" />
		</N8nSelect>

		<template v-if="form.targetKind === 'workflow'">
			<N8nInputLabel
				:label="i18n.baseText('apps.block.form.workflow.label')"
				input-name="button-workflow"
			>
				<N8nSelect
					v-model="form.workflowId"
					size="medium"
					filterable
					data-test-id="button-block-workflow-select"
				>
					<N8nOption
						v-for="option in workflowOptions"
						:key="option.id"
						:value="option.id"
						:label="option.name"
					/>
				</N8nSelect>
			</N8nInputLabel>
			<div v-for="(row, index) in inputRows" :key="index" :class="$style.row">
				<N8nInput
					v-model="row.key"
					size="medium"
					:placeholder="i18n.baseText('apps.block.button.input.key')"
				/>
				<N8nInput
					v-model="row.value"
					size="medium"
					:placeholder="i18n.baseText('apps.block.button.input.value')"
				/>
				<N8nIconButton
					icon="trash-2"
					size="medium"
					variant="subtle"
					:aria-label="i18n.baseText('generic.delete')"
					@click="removeInputRow(index)"
				/>
			</div>
			<N8nButton
				size="medium"
				variant="subtle"
				data-test-id="button-block-add-input"
				@click="addInputRow"
			>
				{{ i18n.baseText('apps.block.button.input.add') }}
			</N8nButton>
		</template>
		<template v-else>
			<N8nSelect
				v-model="form.blockId"
				size="medium"
				data-test-id="button-block-action-block-select"
			>
				<N8nOption
					v-for="blockId in codeBlockIds"
					:key="blockId"
					:value="blockId"
					:label="blockId"
				/>
			</N8nSelect>
			<N8nInput
				v-model="form.action"
				size="medium"
				:placeholder="i18n.baseText('apps.block.button.action.name.placeholder')"
				data-test-id="button-block-action-name"
			/>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
}

.row {
	display: flex;
	gap: var(--spacing--3xs);
	align-items: center;
}
</style>
