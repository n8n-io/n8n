<script setup lang="ts">
/**
 * Workflow target picker with the list/id modes the workflow tool form uses:
 * list mode offers the project's callable workflows by name, id mode takes a
 * raw id. The saved value stays visible even when the loaded list no longer
 * holds it, so an edit keeps its target.
 */
import dateformat from 'dateformat';
import { N8nIconButton, N8nInput, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
	AGENT_DECISION_TRIGGER_NODE_TYPE,
	getGuardrailCheckWorkflowIncompatibilityReason,
} from '@n8n/api-types';

import { VIEWS } from '@/app/constants';
import { useAgentToolCatalog } from '../composables/useAgentToolCatalog';

const props = withDefaults(
	defineProps<{
		/** The selected workflow id. Empty when no target is set. */
		modelValue: string;
		projectId?: string;
		disabled?: boolean;
		/** A guardrail check also accepts workflows starting with the decision trigger. */
		forGuardrailCheck?: boolean;
	}>(),
	{ projectId: undefined, disabled: false, forGuardrailCheck: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const i18n = useI18n();
const router = useRouter();
const { availableWorkflows, projectWorkflows, loadWorkflows } = useAgentToolCatalog();

const isLoading = ref(true);
const mode = ref<'list' | 'id'>('list');
const enteredId = ref('');
const isIdUnresolvable = ref(false);

onMounted(async () => {
	await loadWorkflows(props.projectId);
	isLoading.value = false;
});

/** The workflows this picker offers: tool-callable, plus decision-trigger ones for a check. */
const sourceWorkflows = computed(() => {
	if (!props.forGuardrailCheck) return availableWorkflows.value;
	const seen = new Set(availableWorkflows.value.map((workflow) => workflow.id));
	// The decision-trigger extras must pass the same compatibility check the
	// backend validation applies, so the picker cannot offer a check workflow
	// that saving or publishing would reject.
	const decisionWorkflows = projectWorkflows.value.filter(
		(workflow) =>
			!workflow.isArchived &&
			!seen.has(workflow.id) &&
			(workflow.nodes ?? []).some(
				(node) => node.type === AGENT_DECISION_TRIGGER_NODE_TYPE && !node.disabled,
			) &&
			getGuardrailCheckWorkflowIncompatibilityReason(workflow) === null,
	);
	return [...availableWorkflows.value, ...decisionWorkflows];
});

/** Options are keyed by id so same-named workflows remain individually selectable. */
const workflowOptions = computed(() =>
	[...sourceWorkflows.value]
		.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
		.map((workflow) => ({
			id: workflow.id,
			name: workflow.name,
			meta: [dateformat(workflow.updatedAt, 'd mmm yyyy, HH:MM'), workflow.description]
				.filter(Boolean)
				.join(' · '),
		})),
);

/** A saved target outside the loaded list still displays, so an edit keeps its value. */
const isKnown = computed(() =>
	workflowOptions.value.some((option) => option.id === props.modelValue),
);

function handleModeSwitch(next: 'list' | 'id') {
	mode.value = next;
	isIdUnresolvable.value = false;
	enteredId.value = props.modelValue;
}

function handleSelectWorkflow(optionId: string) {
	const selected = workflowOptions.value.find((option) => option.id === optionId);
	if (selected) emit('update:modelValue', selected.id);
}

/** Only workflows this picker offers are valid targets, the same rule as the tool form. */
function handleEnterWorkflowId(id: string) {
	const trimmed = id.trim();
	if (!trimmed) return;
	const known = sourceWorkflows.value.find((workflow) => workflow.id === trimmed);
	isIdUnresolvable.value = !known;
	if (known) emit('update:modelValue', known.id);
}

function openWorkflow() {
	if (!props.modelValue) return;
	const { href } = router.resolve({
		name: VIEWS.WORKFLOW,
		params: { workflowId: props.modelValue },
	});
	window.open(href, '_blank');
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.controlRow">
			<N8nSelect
				:model-value="mode"
				:class="$style.modeSelector"
				:disabled="disabled"
				data-testid="agent-workflow-picker-mode"
				@update:model-value="handleModeSwitch"
			>
				<N8nOption value="list" :label="i18n.baseText('resourceLocator.mode.list')" />
				<N8nOption value="id" :label="i18n.baseText('resourceLocator.mode.id')" />
			</N8nSelect>

			<N8nSelect
				v-if="mode === 'list'"
				:model-value="modelValue"
				:class="$style.controlInput"
				filterable
				:loading="isLoading"
				:disabled="disabled"
				:placeholder="i18n.baseText('agents.toolConfig.workflow.target.placeholder')"
				:popper-class="$style.popper"
				data-testid="agent-workflow-picker-target"
				@update:model-value="handleSelectWorkflow"
			>
				<N8nOption
					v-if="modelValue && !isKnown"
					:key="modelValue"
					:value="modelValue"
					:label="modelValue"
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
				:model-value="enteredId"
				:class="$style.controlInput"
				:disabled="disabled"
				:placeholder="i18n.baseText('resourceLocator.id.placeholder')"
				data-testid="agent-workflow-picker-target-id"
				@update:model-value="enteredId = $event"
				@blur="handleEnterWorkflowId(enteredId)"
				@keyup.enter="handleEnterWorkflowId(enteredId)"
			/>

			<N8nIconButton
				v-if="modelValue"
				icon="external-link"
				variant="ghost"
				size="small"
				:disabled="disabled"
				:title="i18n.baseText('agents.toolConfig.workflow.target.open')"
				:aria-label="i18n.baseText('agents.toolConfig.workflow.target.open')"
				data-testid="agent-workflow-picker-open"
				@click="openWorkflow"
			/>
		</div>
		<N8nText
			v-if="isIdUnresolvable"
			size="xsmall"
			color="danger"
			data-testid="agent-workflow-picker-unresolvable"
		>
			{{ i18n.baseText('agents.builder.guardrails.workflow.checkWorkflow.idNotFound') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
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
