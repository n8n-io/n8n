<script setup lang="ts">
/**
 * Configure a workflow-type tool on an agent.
 *
 * Workflow tools have a very different shape from node tools — no node
 * parameters, no credentials — so we render a small dedicated form instead
 * of reusing `NodeToolSettingsContent`. The LLM-facing fields are:
 *   - workflow (the target workflow, stored by **name** — the backend resolves
 *     it by name scoped to the project)
 *   - name (edited in the modal header's inline-text widget)
 *   - description (what the LLM reads to understand when to use the tool)
 *   - allOutputs (`true` returns every node output; `false` = last node only)
 *
 * The underlying workflow's runtime input schema is inferred by
 * `WorkflowToolFactory.inferInputSchema` at invocation time based on the
 * trigger type — we don't configure it here.
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
import { useRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useAgentToolCatalog } from '../composables/useAgentToolCatalog';
import type { WorkflowToolRef } from '../types';

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

/** Target is gone from the project entirely — deleted, renamed, moved, or it
 *  lost its supported trigger (the fetch filters on trigger type). */
const isMissing = computed(
	() =>
		!isLoadingWorkflows.value &&
		workflow.value.length > 0 &&
		!projectWorkflows.value.some((candidate) => candidate.name === workflow.value),
);

/** Target still exists but is archived or holds a node that can't run as a tool. */
const isUnusable = computed(
	() =>
		!isLoadingWorkflows.value &&
		!isMissing.value &&
		workflow.value.length > 0 &&
		!availableWorkflows.value.some((candidate) => candidate.name === workflow.value),
);

/** Workflow names aren't unique, and the backend resolves the ref by name. */
const isAmbiguous = computed(
	() => projectWorkflows.value.filter((candidate) => candidate.name === workflow.value).length > 1,
);

/**
 * Options are keyed by id so that same-named workflows render as separate rows
 * and only one reads as selected — keying them by name would mark every row
 * sharing that name. We still *store* the name, so the update time is what
 * tells duplicates apart; which one the agent ends up calling is what
 * `isAmbiguous` warns about.
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

const targetWorkflowId = computed(
	() => workflowOptions.value.find((option) => option.name === workflow.value)?.id,
);

/** Falls back to the raw stored name so an unresolved target still displays. */
const selectedOptionId = computed(() => targetWorkflowId.value ?? workflow.value);

function handleChangeName(newName: string) {
	name.value = newName;
}

function applyTarget(next: string) {
	// Re-selecting the current option still emits, and blurring the prefilled id
	// field re-resolves it — neither is a change, and both would clear the
	// description the user just wrote.
	if (next === workflow.value) return;
	// Carry the tool name over only while it's still the old target's default,
	// so a name the user typed themselves survives a target change.
	if (name.value === workflow.value) name.value = next;
	workflow.value = next;
	description.value = '';
}

function handleSelectWorkflow(optionId: string) {
	applyTarget(workflowOptions.value.find((option) => option.id === optionId)?.name ?? optionId);
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
	enteredId.value = workflowOptions.value.find((o) => o.name === workflow.value)?.id ?? '';
}

/**
 * An id can't be stored — the backend resolves `workflow` by name — so a pasted
 * id is translated to one here. Only the ids the list mode offers are accepted:
 * anything else is outside this project or unusable as a tool, and would leave
 * the agent with a target its project-scoped name lookup can never resolve.
 */
function handleEnterWorkflowId(id: string) {
	const trimmed = id.trim();
	if (!trimmed) return;

	const known = availableWorkflows.value.find((candidate) => candidate.id === trimmed);
	isIdUnresolvable.value = !known;
	if (known) applyTarget(known.name);
}

defineExpose({
	name,
	description,
	allOutputs,
	workflow,
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
						v-if="isMissing || isUnusable"
						:key="workflow"
						:value="workflow"
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
</style>
