<script setup lang="ts">
/**
 * Configure a workflow-type tool on an agent.
 *
 * Workflow tools have a very different shape from node tools — no node
 * parameters, no credentials — so we render a small dedicated form instead
 * of reusing `NodeToolSettingsContent`. The LLM-facing fields are:
 *   - name (edited in the modal header's inline-text widget)
 *   - description (what the LLM reads to understand when to use the tool)
 *   - allOutputs (`true` returns every node output; `false` = last node only)
 *
 * The underlying workflow's runtime input schema is inferred by
 * `WorkflowToolFactory.inferInputSchema` at invocation time based on the
 * trigger type — we don't configure it here.
 */
import { ref, watch } from 'vue';
import { N8nCheckbox, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { AgentJsonToolRef } from '../types';

const props = defineProps<{
	initialRef: AgentJsonToolRef;
}>();

const emit = defineEmits<{
	'update:valid': [isValid: boolean];
	'update:node-name': [name: string];
}>();

const i18n = useI18n();

const name = ref(props.initialRef.name ?? props.initialRef.workflow ?? '');
const description = ref(props.initialRef.description ?? '');
const allOutputs = ref(props.initialRef.allOutputs ?? false);

watch(
	() => props.initialRef,
	(updated) => {
		name.value = updated.name ?? updated.workflow ?? '';
		description.value = updated.description ?? '';
		allOutputs.value = updated.allOutputs ?? false;
	},
);

// Validity gate: the name is required (matches the node flow). Description
// and allOutputs are free to be empty/false.
watch(
	name,
	(value) => {
		emit('update:valid', value.trim().length > 0);
		emit('update:node-name', value);
	},
	{ immediate: true },
);

function handleChangeName(newName: string) {
	name.value = newName;
}

defineExpose({
	name,
	description,
	allOutputs,
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

		<div :class="$style.field">
			<N8nCheckbox
				v-model="allOutputs"
				:label="i18n.baseText('agents.toolConfig.workflow.allOutputs')"
				data-test-id="agent-workflow-tool-all-outputs"
			/>
			<N8nText size="xsmall" color="text-light">
				{{ i18n.baseText('agents.toolConfig.workflow.allOutputs.hint') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) var(--spacing--lg) var(--spacing--sm) 0;
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
</style>
