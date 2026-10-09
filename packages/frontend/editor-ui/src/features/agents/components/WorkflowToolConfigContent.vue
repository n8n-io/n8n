<script setup lang="ts">
/** Configure a workflow tool without changing its trigger. */
import { computed, onMounted, ref, toRaw, watch } from 'vue';
import dateformat from 'dateformat';
import {
	N8nButton,
	N8nCallout,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nSwitch2,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useAgentToolCatalog } from '../composables/useAgentToolCatalog';
import type { WorkflowToolRef } from '../types';
import { listWorkflowToolInputFields } from '../utils/workflowToolInputFields';
import WorkflowToolInputs from './WorkflowToolInputs.vue';
import { workflowToolTriggerLabel } from '../utils/workflowToolTriggers';

const props = defineProps<{
	initialRef: WorkflowToolRef;
	projectId?: string;
	submitCount?: number;
}>();

const emit = defineEmits<{
	'update:valid': [isValid: boolean];
	'update:node-name': [name: string];
}>();

const i18n = useI18n();
const triggerLabel = workflowToolTriggerLabel();

const router = useRouter();
const { availableWorkflows, projectWorkflows, loadWorkflows } = useAgentToolCatalog();

const name = ref(props.initialRef.name ?? props.initialRef.workflow ?? '');
const description = ref(props.initialRef.description ?? '');
const allOutputs = ref(props.initialRef.allOutputs ?? false);
const workflow = ref(props.initialRef.workflow ?? '');
const workflowId = ref<string | undefined>(props.initialRef.workflowId);
const inputs = ref<NonNullable<WorkflowToolRef['inputs']>>({
	...toRaw(props.initialRef.inputs ?? {}),
});
const isLoadingWorkflows = ref(true);
const workflowsLoaded = ref(false);
const inputsValid = ref(true);
const advancedExpanded = ref(false);
const mode = ref<'list' | 'id'>('list');
const enteredId = ref('');
const isIdUnresolvable = ref(false);

async function reloadWorkflows() {
	isLoadingWorkflows.value = true;
	workflowsLoaded.value = await loadWorkflows(props.projectId);
	isLoadingWorkflows.value = false;
}

onMounted(reloadWorkflows);

watch(
	() => props.initialRef,
	(updated) => {
		name.value = updated.name ?? updated.workflow ?? '';
		description.value = updated.description ?? '';
		allOutputs.value = updated.allOutputs ?? false;
		workflow.value = updated.workflow ?? '';
		workflowId.value = updated.workflowId;
		inputs.value = { ...toRaw(updated.inputs ?? {}) };
		mode.value = 'list';
		enteredId.value = '';
		isIdUnresolvable.value = false;
	},
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
		workflowsLoaded.value &&
		!isLoadingWorkflows.value &&
		workflow.value.length > 0 &&
		matchingProjectWorkflows.value.length === 0,
);

/** Target still exists but is archived or holds a node that can't run as a tool. */
const isUnusable = computed(
	() =>
		workflowsLoaded.value &&
		!isLoadingWorkflows.value &&
		!isMissing.value &&
		workflow.value.length > 0 &&
		matchingAvailableWorkflows.value.length === 0,
);

/** Only legacy name-based refs can be ambiguous. */
const isAmbiguous = computed(
	() => workflowId.value === undefined && matchingProjectWorkflows.value.length > 1,
);

/** Target works in preview, but the published agent cannot call it until it is published. */
const isUnpublished = computed(
	() =>
		workflowsLoaded.value &&
		!isLoadingWorkflows.value &&
		!isUnusable.value &&
		targetWorkflow.value?.activeVersionId === null,
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

const inputSchemaLoaded = computed(
	() =>
		workflowsLoaded.value &&
		!isLoadingWorkflows.value &&
		Array.isArray(targetWorkflow.value?.nodes),
);
const hasInputErrors = computed(
	() => inputSchemaLoaded.value && declaredInputFields.value.length > 0 && !inputsValid.value,
);

watch(
	[name, description, workflow, hasInputErrors],
	([nameValue, descriptionValue, workflowValue]) => {
		emit(
			'update:valid',
			nameValue.trim().length > 0 &&
				descriptionValue.trim().length > 0 &&
				workflowValue.trim().length > 0 &&
				!hasInputErrors.value,
		);
		emit('update:node-name', nameValue);
	},
	{ immediate: true },
);

watch([() => props.submitCount, hasInputErrors], ([submitCount, hasErrors]) => {
	if (submitCount && hasErrors) advancedExpanded.value = true;
});

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
	const bindings = toRaw(inputs.value);
	if (Object.keys(bindings).length === 0) return undefined;
	if (!inputSchemaLoaded.value) return bindings;
	// Drop bindings for fields that no longer exist on the selected workflow.
	const allowed = new Set(declaredInputFields.value.map((field) => field.name));
	const pruned: NonNullable<WorkflowToolRef['inputs']> = {};
	for (const [key, binding] of Object.entries(bindings)) {
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
			{{
				i18n.baseText('agents.toolConfig.workflow.target.notice', {
					interpolate: { trigger: triggerLabel },
				})
			}}
		</N8nCallout>

		<div :class="$style.field">
			<label :class="$style.label" for="workflow-tool-target">
				{{ i18n.baseText('agents.toolConfig.workflow.target') }}
				<N8nText color="primary" size="small" bold>*</N8nText>
			</label>
			<div :class="$style.controlRow">
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
					:class="$style.controlInput"
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
					:class="$style.controlInput"
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
				{{
					i18n.baseText('agents.toolConfig.workflow.target.idNotFound', {
						interpolate: { trigger: triggerLabel },
					})
				}}
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
			<N8nText
				v-else-if="isUnpublished"
				size="xsmall"
				color="warning"
				data-test-id="agent-workflow-tool-target-unpublished"
			>
				{{ i18n.baseText('agents.toolConfig.workflow.target.notPublished') }}
			</N8nText>
		</div>

		<slot name="commonSettings" />

		<div :class="$style.field">
			<button
				type="button"
				:class="$style.advancedTrigger"
				:aria-expanded="advancedExpanded"
				aria-controls="workflow-tool-advanced"
				data-test-id="agent-workflow-tool-advanced"
				@click="advancedExpanded = !advancedExpanded"
			>
				<N8nText size="small" bold>{{
					i18n.baseText('agents.toolConfig.workflow.advanced')
				}}</N8nText>
				<N8nIcon :icon="advancedExpanded ? 'chevron-up' : 'chevron-down'" size="small" />
			</button>
			<div id="workflow-tool-advanced" v-show="advancedExpanded" :class="$style.advancedContent">
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

				<N8nText size="small" bold>{{
					i18n.baseText('agents.toolConfig.workflow.inputs')
				}}</N8nText>
				<N8nText v-if="isLoadingWorkflows" size="small" color="text-light" role="status">
					{{ i18n.baseText('agents.toolConfig.workflow.inputs.loading') }}
				</N8nText>
				<template v-else-if="!workflowsLoaded">
					<N8nText size="small" color="danger" role="alert">
						{{ i18n.baseText('agents.toolConfig.workflow.inputs.loadError') }}
					</N8nText>
					<N8nButton
						variant="ghost"
						size="small"
						:label="i18n.baseText('generic.retry')"
						@click="reloadWorkflows"
					/>
				</template>
				<template v-else-if="inputSchemaLoaded">
					<N8nText v-if="!declaredInputFields.length" size="xsmall" color="text-light">
						{{ i18n.baseText('agents.toolConfig.workflow.inputs.empty') }}
					</N8nText>
					<WorkflowToolInputs
						v-else
						:key="targetWorkflowId"
						v-model="inputs"
						:fields="declaredInputFields"
						:tool-name="name"
						:submitted="(submitCount ?? 0) > 0"
						@update:valid="inputsValid = $event"
					/>
				</template>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
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

.controlRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.modeSelector {
	flex: 0 0 auto;
	width: 120px;
}

.controlInput {
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

.advancedTrigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs) 0;
	border: 0;
	background: transparent;
	color: inherit;
	cursor: pointer;

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.advancedContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
</style>
