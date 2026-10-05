<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, toRaw, useId, watch } from 'vue';
import { N8nIconButton, N8nInput, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentJsonWorkflowToolInputField } from '@n8n/api-types';
import { WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE, type INodeProperties } from 'n8n-workflow';
import type { IUpdateInformation } from '@/Interface';
import { ExpressionLocalResolveContextSymbol, WorkflowDocumentStoreKey } from '@/app/constants';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import {
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import {
	disposeWorkflowExecutionStateStore,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { disposeNDVStore, useNDVStore } from '@/features/ndv/shared/ndv.store';
import ParameterInputWrapper from '@/features/ndv/parameters/components/ParameterInputWrapper.vue';
import ParameterOptions from '@/features/ndv/parameters/components/ParameterOptions.vue';
import {
	formatWorkflowToolFixedValue,
	parseWorkflowToolFixedValue,
	type WorkflowToolInputFieldDef,
} from '../utils/workflowToolInputFields';
import type { WorkflowToolRef } from '../types';
import FromAiOverrideField from '@/features/ndv/parameters/components/ParameterInputOverrides/FromAiOverrideField.vue';

const props = defineProps<{
	fields: WorkflowToolInputFieldDef[];
	toolName: string;
	submitted: boolean;
}>();
const inputs = defineModel<NonNullable<WorkflowToolRef['inputs']>>({ required: true });
const emit = defineEmits<{ 'update:valid': [valid: boolean] }>();
const i18n = useI18n();
const id = useId();
const rawValues = ref<Record<string, string>>({});

const documentId = createWorkflowDocumentId(`workflow-tool-inputs-${id}`);
const documentStore = useWorkflowDocumentStore(documentId);
const ndvStore = useNDVStore(documentId);
const executionStore = useWorkflowExecutionStateStore(documentId);
provide(
	WorkflowDocumentStoreKey,
	computed(() => documentStore),
);
provide(
	ExpressionLocalResolveContextSymbol,
	computed<ExpressionLocalResolveContext>(() => ({
		localResolve: true,
		nodeName: props.toolName,
		additionalKeys: {},
	})),
);
watch(
	() => props.toolName,
	(name) => {
		documentStore.setNodes([
			{
				id,
				name,
				type: WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
				typeVersion: 2.2,
				position: [0, 0],
				parameters: {},
			},
		]);
		ndvStore.setActiveNodeName(name, 'other');
	},
	{ immediate: true },
);
onBeforeUnmount(() => {
	disposeNDVStore(ndvStore);
	disposeWorkflowExecutionStateStore(executionStore);
	disposeWorkflowDocumentStore(documentStore);
});

function bindingFor(name: string): AgentJsonWorkflowToolInputField {
	const bindings = toRaw(inputs.value);
	return Object.hasOwn(bindings, name) ? bindings[name] : { mode: 'ai' };
}

function descriptionFor(name: string): string {
	const binding = bindingFor(name);
	return binding.mode === 'ai' ? (binding.description ?? '') : '';
}

function parameterFor(field: WorkflowToolInputFieldDef): INodeProperties {
	let type: INodeProperties['type'] = 'string';
	if (field.type === 'number' || field.type === 'boolean') type = field.type;
	if (['array', 'object', 'any'].includes(field.type ?? '')) type = 'json';
	return { displayName: field.name, name: field.name, type, default: '', typeOptions: { rows: 3 } };
}

function displayValue(field: WorkflowToolInputFieldDef) {
	const binding = bindingFor(field.name);
	if (binding.mode === 'ai') return '';
	if (binding.mode === 'expression') return binding.value;
	if (field.type === 'boolean') return binding.value === true;
	const raw = toRaw(rawValues.value);
	if (Object.hasOwn(raw, field.name)) return raw[field.name];
	if (field.type === 'any') return JSON.stringify(binding.value);
	return formatWorkflowToolFixedValue(binding.value);
}

function setMode(field: WorkflowToolInputFieldDef, mode: AgentJsonWorkflowToolInputField['mode']) {
	let next = { ...toRaw(inputs.value) };
	delete rawValues.value[field.name];
	if (mode === 'ai') {
		delete next[field.name];
	} else if (mode === 'expression') {
		next = { ...next, [field.name]: { mode, value: '=' } };
	} else {
		next = {
			...next,
			[field.name]: {
				mode,
				value: field.type === 'boolean' ? false : parseWorkflowToolFixedValue('', field.type),
			},
		};
	}
	inputs.value = next;
}

function changeExpressionMode(field: WorkflowToolInputFieldDef, action: string) {
	if (action === 'addExpression') setMode(field, 'expression');
	if (action === 'removeExpression') setMode(field, 'fixed');
}

function updateValue(field: WorkflowToolInputFieldDef, update: IUpdateInformation) {
	const raw = formatWorkflowToolFixedValue(update.value);
	const mode = bindingFor(field.name).mode;
	if (mode === 'ai') return;
	if (mode === 'fixed') rawValues.value = { ...toRaw(rawValues.value), [field.name]: raw };
	const binding: AgentJsonWorkflowToolInputField =
		mode === 'expression'
			? { mode, value: raw }
			: { mode, value: parseWorkflowToolFixedValue(raw, field.type) };
	inputs.value = { ...toRaw(inputs.value), [field.name]: binding };
}

function updateDescription(name: string, description: string) {
	let next = { ...toRaw(inputs.value) };
	if (description.trim()) next = { ...next, [name]: { mode: 'ai', description } };
	else delete next[name];
	inputs.value = next;
}

function inputError(field: WorkflowToolInputFieldDef): string | undefined {
	const binding = bindingFor(field.name);
	if (binding.mode === 'ai') return undefined;
	if (binding.mode === 'expression') {
		return binding.value.slice(1).trim()
			? undefined
			: i18n.baseText('agents.toolConfig.workflow.inputs.expression.empty');
	}
	const value = parseWorkflowToolFixedValue(
		formatWorkflowToolFixedValue(binding.value),
		field.type,
	);
	if (value === null) return undefined;
	let valid = true;
	switch (field.type) {
		case 'number':
			valid = typeof value === 'number' && Number.isFinite(value);
			break;
		case 'boolean':
			valid = typeof value === 'boolean';
			break;
		case 'array':
			valid = Array.isArray(value);
			break;
		case 'object':
			valid = typeof value === 'object' && !Array.isArray(value);
			break;
		case 'any':
			try {
				JSON.parse(String(displayValue(field)));
			} catch {
				valid = false;
			}
	}
	return valid
		? undefined
		: i18n.baseText('agents.toolConfig.workflow.inputs.value.invalid', {
				interpolate: { type: field.type ?? 'string' },
			});
}

const fieldsWithErrors = computed(() => props.fields.filter((field) => inputError(field)));
watch(fieldsWithErrors, (fields) => emit('update:valid', fields.length === 0), { immediate: true });
</script>

<template>
	<div :class="$style.fields" data-test-id="agent-workflow-tool-inputs">
		<div
			v-for="(field, index) in fields"
			:key="field.name"
			:class="$style.field"
			:data-test-id="`agent-workflow-tool-input-${encodeURIComponent(field.name)}`"
			role="group"
			:aria-labelledby="`${id}-${index}-label`"
		>
			<div :class="$style.header">
				<N8nText :id="`${id}-${index}-label`" size="small" bold :class="$style.name">
					{{ field.name }}
					<N8nText size="xsmall" color="text-light">{{ field.type ?? 'string' }}</N8nText>
				</N8nText>
				<ParameterOptions
					v-if="bindingFor(field.name).mode !== 'ai'"
					:parameter="parameterFor(field)"
					:value="bindingFor(field.name).mode === 'expression' ? '=' : ''"
					:is-read-only="false"
					:show-options="false"
					:show-focus-panel="false"
					@update:model-value="changeExpressionMode(field, $event)"
				/>
			</div>
			<template v-if="bindingFor(field.name).mode === 'ai'">
				<FromAiOverrideField @close="setMode(field, 'fixed')" />
				<label :for="`${id}-${index}-description`" :class="$style.descriptionLabel">
					{{ i18n.baseText('agents.toolConfig.workflow.inputs.description') }}
				</label>
				<N8nInput
					:id="`${id}-${index}-description`"
					:model-value="descriptionFor(field.name)"
					type="textarea"
					:rows="2"
					:placeholder="i18n.baseText('agents.toolConfig.workflow.inputs.description.placeholder')"
					@update:model-value="updateDescription(field.name, String($event))"
				/>
			</template>
			<ParameterInputWrapper
				v-else
				:parameter="{
					...parameterFor(field),
					noDataExpression: bindingFor(field.name).mode === 'fixed',
				}"
				:model-value="displayValue(field)"
				:path="`inputs.${field.name}`"
				:rows="3"
				can-be-overridden
				:external-issues="submitted && inputError(field) ? [inputError(field)!] : []"
				@update="updateValue(field, $event)"
				@text-input="updateValue(field, $event)"
			>
				<template #overrideButton>
					<N8nTooltip :content="i18n.baseText('parameterOverride.applyOverrideButtonTooltip')">
						<N8nIconButton
							icon="sparkles"
							variant="ghost"
							size="small"
							:aria-label="i18n.baseText('parameterOverride.applyOverrideButtonTooltip')"
							@click="setMode(field, 'ai')"
						/>
					</N8nTooltip>
				</template>
			</ParameterInputWrapper>
			<N8nText v-if="submitted && inputError(field)" size="xsmall" color="danger" role="alert">
				{{ inputError(field) }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
}

.name {
	overflow-wrap: anywhere;
}

.descriptionLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}
</style>
