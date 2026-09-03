<script setup lang="ts">
/**
 * Configure a workflow-type tool on an agent.
 *
 * Workflow tools have a very different shape from node tools — no node
 * parameters, no credentials — so we render a small dedicated form instead
 * of reusing `NodeToolSettingsContent`. The LLM-facing fields are:
 *   - workflowId (the target workflow's stable lookup key)
 *   - workflow (the target workflow's display name and legacy lookup key)
 *   - name (edited in the modal header's inline-text widget)
 *   - description (what the LLM reads to understand when to use the tool)
 *   - allOutputs (`true` returns every node output; `false` = last node only)
 *   - inputs (optional AI vs fixed bindings for Execute Workflow Trigger fields)
 *
 * The underlying workflow's runtime input schema is inferred by
 * `WorkflowToolFactory.inferInputSchema` at invocation time; this form only
 * lets the user pin fixed values so the LLM is not asked for them.
 */
import { computed, onMounted, ref, watch } from 'vue';
import dateformat from 'dateformat';
import {
	N8nCallout,
	N8nIconButton,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nSwitch2,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentJsonWorkflowToolInputField } from '@n8n/api-types';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useAgentToolCatalog } from '../composables/useAgentToolCatalog';
import type { WorkflowToolRef } from '../types';
import {
	formatWorkflowToolFixedValue,
	listWorkflowToolInputFields,
	parseWorkflowToolFixedValue,
} from '../utils/workflowToolInputFields';

const props = defineProps<{
	initialRef: WorkflowToolRef;
	projectId?: string;
}>();

const emit = defineEmits<{
	'update:valid': [isValid: boolean];
	'update:node-name': [name: string];
}>();

const i18n = useI18n();

const router = useRouter();
const { availableWorkflows, projectWorkflows, loadWorkflows } = useAgentToolCatalog();

const name = ref(props.initialRef.name ?? props.initialRef.workflow ?? '');
const description = ref(props.initialRef.description ?? '');
const allOutputs = ref(props.initialRef.allOutputs ?? false);
const workflow = ref(props.initialRef.workflow ?? '');
const workflowId = ref<string | undefined>(props.initialRef.workflowId);
const inputs = ref<NonNullable<WorkflowToolRef['inputs']>>({
	...(props.initialRef.inputs ?? {}),
});
const isLoadingWorkflows = ref(true);
const mode = ref<'list' | 'id'>('list');
const enteredId = ref('');
const isIdUnresolvable = ref(false);

onMounted(async () => {
	await loadWorkflows(props.projectId);
	isLoadingWorkflows.value = false;
});

watch(
	() => props.initialRef,
	(updated) => {
		name.value = updated.name ?? updated.workflow ?? '';
		description.value = updated.description ?? '';
		allOutputs.value = updated.allOutputs ?? false;
		workflow.value = updated.workflow ?? '';
		workflowId.value = updated.workflowId;
		inputs.value = { ...(updated.inputs ?? {}) };
		mode.value = 'list';
		enteredId.value = '';
		isIdUnresolvable.value = false;
	},
);

// Validity gate: target, name and description are required — the description
// is what the LLM reads to decide when to invoke the tool, and executing
// without one fails. Only allOutputs is free to stay false.
watch(
	[name, description, workflow],
	([nameValue, descriptionValue, workflowValue]) => {
		emit(
			'update:valid',
			nameValue.trim().length > 0 &&
				descriptionValue.trim().length > 0 &&
				workflowValue.trim().length > 0,
		);
		emit('update:node-name', nameValue);
	},
	{ immediate: true },
);

function matchesReference(candidate: { id: string; name: string }) {
	return workflowId.value !== undefined
		? candidate.id === workflowId.value
		: candidate.name === workflow.value;
}

const matchingProjectWorkflows = computed(() => projectWorkflows.value.filter(matchesReference));
const matchingAvailableWorkflows = computed(() =>
	availableWorkflows.value.filter(matchesReference),
);

/** Resolve an exact id, or a unique legacy name. */
const targetWorkflow = computed(() => {
	if (workflowId.value !== undefined) return matchingProjectWorkflows.value[0];
	return matchingProjectWorkflows.value.length === 1
		? matchingProjectWorkflows.value[0]
		: undefined;
});

/** Target is gone from the project entirely — deleted, moved, or inaccessible. */
const isMissing = computed(
	() =>
		!isLoadingWorkflows.value &&
		workflow.value.length > 0 &&
		matchingProjectWorkflows.value.length === 0,
);

/** Target still exists but is archived or holds a node that can't run as a tool. */
const isUnusable = computed(
	() =>
		!isLoadingWorkflows.value &&
		!isMissing.value &&
		workflow.value.length > 0 &&
		matchingAvailableWorkflows.value.length === 0,
);

/** Only legacy name-based refs can be ambiguous. */
const isAmbiguous = computed(
	() => workflowId.value === undefined && matchingProjectWorkflows.value.length > 1,
);

/**
 * Options are keyed by id so same-named workflows remain individually
 * selectable.
 */
const workflowOptions = computed(() =>
	[...availableWorkflows.value]
		.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
		.map((candidate) => ({
			id: candidate.id,
			name: candidate.name,
			meta: [dateformat(candidate.updatedAt, 'd mmm yyyy, HH:MM'), candidate.description]
				.filter(Boolean)
				.join(' · '),
		})),
);

const targetWorkflowId = computed(() => targetWorkflow.value?.id ?? workflowId.value);

/** Falls back to the raw stored name so an unresolved target still displays. */
const selectedOptionId = computed(
	() => targetWorkflowId.value ?? workflowId.value ?? workflow.value,
);

const declaredInputFields = computed(() => listWorkflowToolInputFields(targetWorkflow.value));

function fieldBinding(fieldName: string): AgentJsonWorkflowToolInputField {
	return inputs.value[fieldName] ?? { mode: 'ai' };
}

function fieldMode(fieldName: string): 'ai' | 'fixed' {
	return fieldBinding(fieldName).mode;
}

function fieldType(fieldName: string): string | undefined {
	return declaredInputFields.value.find((field) => field.name === fieldName)?.type;
}

function fieldFixedValue(fieldName: string): string {
	const binding = fieldBinding(fieldName);
	if (binding.mode !== 'fixed') return '';
	return formatWorkflowToolFixedValue(binding.value);
}

// Raw text being typed per field. While editing, the input shows this
// uncoerced text so fractional numbers (and in-progress JSON) survive
// each keystroke. On blur the text is parsed and committed to `inputs`.
const fieldInputText = ref<Record<string, string>>({});

function fieldInputDisplay(fieldName: string): string {
	return fieldInputText.value[fieldName] ?? fieldFixedValue(fieldName);
}

function handleFieldInput(fieldName: string, value: string | number) {
	fieldInputText.value = { ...fieldInputText.value, [fieldName]: String(value) };
}

function commitFieldFixedValue(fieldName: string) {
	const raw = fieldInputText.value[fieldName];
	if (raw === undefined) return;
	setFieldFixedValue(fieldName, raw);
	const next = { ...fieldInputText.value };
	delete next[fieldName];
	fieldInputText.value = next;
}

function setFieldMode(fieldName: string, nextMode: string) {
	if (nextMode !== 'ai' && nextMode !== 'fixed') return;
	// Discard any in-progress text when the mode changes.
	const nextText = { ...fieldInputText.value };
	delete nextText[fieldName];
	fieldInputText.value = nextText;
	if (nextMode === 'ai') {
		const next = { ...inputs.value };
		delete next[fieldName];
		inputs.value = next;
		return;
	}
	setFieldFixedValue(fieldName, fieldFixedValue(fieldName));
}

function setFieldFixedValue(fieldName: string, value: string | number) {
	inputs.value = {
		...inputs.value,
		[fieldName]: {
			mode: 'fixed',
			value: parseWorkflowToolFixedValue(String(value), fieldType(fieldName)),
		},
	};
}

function handleChangeName(newName: string) {
	name.value = newName;
}

function applyTarget(next: { id: string; name: string }) {
	// Re-selecting the current option still emits, and blurring the prefilled id
	// field re-resolves it — neither is a change, and both would clear the
	// description the user just wrote.
	if (
		next.id === workflowId.value ||
		(workflowId.value === undefined && next.name === workflow.value)
	) {
		workflowId.value = next.id;
		return;
	}
	// Carry the tool name over only while it's still the old target's default,
	// so a name the user typed themselves survives a target change.
	if (name.value === workflow.value) name.value = next.name;
	workflowId.value = next.id;
	workflow.value = next.name;
	description.value = '';
	inputs.value = {};
}

function handleSelectWorkflow(optionId: string) {
	const selected = workflowOptions.value.find((option) => option.id === optionId);
	if (selected) applyTarget(selected);
}

function openTargetWorkflow() {
	if (!targetWorkflowId.value) return;
	const { href } = router.resolve({
		name: VIEWS.WORKFLOW,
		params: { workflowId: targetWorkflowId.value },
	});
	window.open(href, '_blank');
}

function handleModeSwitch(next: 'list' | 'id') {
	mode.value = next;
	isIdUnresolvable.value = false;
	enteredId.value = targetWorkflowId.value ?? '';
}

/** Only IDs offered in list mode can be used as workflow tools here. */
function handleEnterWorkflowId(id: string) {
	const trimmed = id.trim();
	if (!trimmed) return;

	const known = availableWorkflows.value.find((candidate) => candidate.id === trimmed);
	isIdUnresolvable.value = !known;
	if (known) applyTarget(known);
}

function getWorkflow() {
	return targetWorkflow.value?.name ?? workflow.value;
}

function getWorkflowId() {
	return targetWorkflowId.value;
}

function getInputs(): WorkflowToolRef['inputs'] {
	// Commit any in-progress text so the value isn't lost when the user
	// confirms the modal without blurring the field first.
	for (const fieldName of Object.keys(fieldInputText.value)) {
		commitFieldFixedValue(fieldName);
	}
	if (Object.keys(inputs.value).length === 0) return undefined;
	// Drop bindings for fields that no longer exist on the selected workflow.
	const allowed = new Set(declaredInputFields.value.map((field) => field.name));
	const pruned: NonNullable<WorkflowToolRef['inputs']> = {};
	for (const [key, binding] of Object.entries(inputs.value)) {
		if (allowed.has(key)) pruned[key] = binding;
	}
	return Object.keys(pruned).length > 0 ? pruned : undefined;
}

defineExpose({
	name,
	description,
	allOutputs,
	getWorkflow,
	getWorkflowId,
	getInputs,
	handleChangeName,
	/** Fixed for parity with the node content's `nodeTypeDescription` expose — the
	 *  workflow form has no node type to render in the header icon. */
	nodeTypeDescription: null,
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.field">
			<label :class="$style.label" for="workflow-tool-description">
				{{ i18n.baseText('agents.toolConfig.workflow.description') }}
				<N8nText color="primary" size="small" bold>*</N8nText>
			</label>
			<N8nInput
				id="workflow-tool-description"
				v-model="description"
				type="textarea"
				:rows="4"
				:placeholder="i18n.baseText('agents.toolConfig.workflow.description.placeholder')"
				data-test-id="agent-workflow-tool-description"
			/>
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText('agents.toolConfig.workflow.description.hint') }}
			</N8nText>
		</div>

		<N8nCallout theme="warning" data-test-id="agent-workflow-tool-target-notice">
			{{ i18n.baseText('agents.toolConfig.workflow.target.notice') }}
		</N8nCallout>

		<div :class="$style.field">
			<label :class="$style.label" for="workflow-tool-target">
				{{ i18n.baseText('agents.toolConfig.workflow.target') }}
				<N8nText color="primary" size="small" bold>*</N8nText>
			</label>
			<div :class="$style.targetRow">
				<N8nSelect
					:model-value="mode"
					:class="$style.modeSelector"
					data-test-id="agent-workflow-tool-target-mode"
					@update:model-value="handleModeSwitch"
				>
					<N8nOption value="list" :label="i18n.baseText('resourceLocator.mode.list')" />
					<N8nOption value="id" :label="i18n.baseText('resourceLocator.mode.id')" />
				</N8nSelect>

				<N8nSelect
					v-if="mode === 'list'"
					id="workflow-tool-target"
					:model-value="selectedOptionId"
					:class="$style.targetInput"
					filterable
					:loading="isLoadingWorkflows"
					:placeholder="i18n.baseText('agents.toolConfig.workflow.target.placeholder')"
					:popper-class="$style.popper"
					data-test-id="agent-workflow-tool-target"
					@update:model-value="handleSelectWorkflow"
				>
					<N8nOption
						v-if="isMissing || isUnusable || isAmbiguous"
						:key="workflowId ?? workflow"
						:value="workflowId ?? workflow"
						:label="workflow"
					/>
					<N8nOption
						v-for="option in workflowOptions"
						:key="option.id"
						:value="option.id"
						:label="option.name"
					>
						<div :class="$style.option">
							<N8nText size="small" bold>{{ option.name }}</N8nText>
							<N8nText size="xsmall" color="text-light" :class="$style.optionMeta">
								{{ option.meta }}
							</N8nText>
						</div>
					</N8nOption>
				</N8nSelect>
				<N8nInput
					v-else
					id="workflow-tool-target"
					v-model="enteredId"
					:class="$style.targetInput"
					:placeholder="i18n.baseText('resourceLocator.id.placeholder')"
					data-test-id="agent-workflow-tool-target-id"
					@blur="handleEnterWorkflowId(enteredId)"
					@keyup.enter="handleEnterWorkflowId(enteredId)"
				/>

				<N8nIconButton
					v-if="targetWorkflowId"
					icon="external-link"
					variant="ghost"
					size="small"
					:class="$style.openTarget"
					:title="i18n.baseText('agents.toolConfig.workflow.target.open')"
					:aria-label="i18n.baseText('agents.toolConfig.workflow.target.open')"
					data-test-id="agent-workflow-tool-target-open"
					@click="openTargetWorkflow"
				/>
			</div>
			<N8nText
				v-if="isIdUnresolvable"
				size="xsmall"
				color="danger"
				data-test-id="agent-workflow-tool-target-id-unresolvable"
			>
				{{ i18n.baseText('agents.toolConfig.workflow.target.idNotFound') }}
			</N8nText>
			<N8nText
				v-else-if="isMissing"
				size="xsmall"
				color="danger"
				data-test-id="agent-workflow-tool-target-missing"
			>
				{{
					i18n.baseText('agents.toolConfig.workflow.target.unavailable', {
						interpolate: { name: workflow },
					})
				}}
			</N8nText>
			<N8nText
				v-else-if="isUnusable"
				size="xsmall"
				color="danger"
				data-test-id="agent-workflow-tool-target-unusable"
			>
				{{
					i18n.baseText('agents.builder.validation.issue.tool.workflow.incompatibleReference', {
						interpolate: { id: workflow },
					})
				}}
			</N8nText>
			<N8nText
				v-else-if="isAmbiguous"
				size="xsmall"
				color="warning"
				data-test-id="agent-workflow-tool-target-duplicate"
			>
				{{
					i18n.baseText('agents.toolConfig.workflow.target.duplicateName', {
						interpolate: { name: workflow },
					})
				}}
			</N8nText>
		</div>

		<div
			v-if="declaredInputFields.length > 0"
			:class="$style.field"
			data-test-id="agent-workflow-tool-inputs"
		>
			<div :class="$style.label">
				{{ i18n.baseText('agents.toolConfig.workflow.inputs') }}
			</div>
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText('agents.toolConfig.workflow.inputs.hint') }}
			</N8nText>
			<div
				v-for="field in declaredInputFields"
				:key="field.name"
				:class="$style.inputRow"
				:data-test-id="`agent-workflow-tool-input-${field.name}`"
			>
				<div :class="$style.inputFieldOption">
					<N8nText size="small" :bold="true" :class="$style.inputName">{{ field.name }}</N8nText>
					<N8nSelect
						:model-value="fieldMode(field.name)"
						:class="$style.inputMode"
						:data-test-id="`agent-workflow-tool-input-mode-${field.name}`"
						@update:model-value="setFieldMode(field.name, $event)"
					>
						<N8nOption
							value="ai"
							:label="i18n.baseText('agents.toolConfig.workflow.inputs.mode.ai')"
						/>
						<N8nOption
							value="fixed"
							:label="i18n.baseText('agents.toolConfig.workflow.inputs.mode.fixed')"
						/>
					</N8nSelect>
				</div>

				<N8nInput
					v-if="fieldMode(field.name) === 'fixed'"
					:model-value="fieldInputDisplay(field.name)"
					:class="$style.inputValue"
					:placeholder="i18n.baseText('agents.toolConfig.workflow.inputs.value.placeholder')"
					:data-test-id="`agent-workflow-tool-input-value-${field.name}`"
					@update:model-value="handleFieldInput(field.name, $event)"
					@blur="commitFieldFixedValue(field.name)"
				/>
			</div>
		</div>

		<div :class="$style.toggleRow">
			<div :class="$style.toggleText">
				<N8nText size="small" :bold="true">
					{{ i18n.baseText('agents.toolConfig.workflow.allOutputs') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.toolConfig.workflow.allOutputs.hint') }}
				</N8nText>
			</div>
			<N8nSwitch2
				:model-value="allOutputs"
				data-test-id="agent-workflow-tool-all-outputs"
				@update:model-value="allOutputs = $event"
			/>
		</div>

		<slot name="commonSettings" />
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) 0;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.label {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.toggleRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--2xs);
}

.toggleText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.targetRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.modeSelector {
	flex: 0 0 auto;
	width: 120px;
}

.targetInput {
	flex: 1;
	min-width: 0;
}

.openTarget {
	flex: 0 0 auto;
}

.popper {
	// Give the two-line options room to breathe.
	:global(.el-select-dropdown__item) {
		height: auto;
		line-height: var(--line-height--md);
		padding-top: var(--spacing--2xs);
		padding-bottom: var(--spacing--2xs);
	}
}

.option {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.optionMeta {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
}

.inputRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-wrap: wrap;
	flex-direction: row;
}

.inputName {
	flex: 0 0 120px;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
}

.inputFieldOption {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-wrap: wrap;
	width: 100%;
}

.inputMode {
	flex: 0 0 200px;
}

.inputValue {
	flex: 1;
	min-width: 120px;
}
</style>
