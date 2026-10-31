<script setup lang="ts">
import { WORKFLOW_EXECUTION_BLOCK_CAUSES, type WorkflowExecutionBlockCause } from '@n8n/api-types';
import { N8nCheckbox } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { EXECUTION_BLOCK_CAUSE_COPY } from './wontExecute';

const selected = defineModel<WorkflowExecutionBlockCause[]>({ required: true });

const i18n = useI18n();

const allSelected = computed(() =>
	WORKFLOW_EXECUTION_BLOCK_CAUSES.every((cause) => selected.value.includes(cause)),
);
const someSelected = computed(() => selected.value.length > 0 && !allSelected.value);

function onToggleAll(checked: boolean) {
	selected.value = checked ? [...WORKFLOW_EXECUTION_BLOCK_CAUSES] : [];
}

function onToggleCause(cause: WorkflowExecutionBlockCause, checked: boolean) {
	selected.value = WORKFLOW_EXECUTION_BLOCK_CAUSES.filter((option) =>
		option === cause ? checked : selected.value.includes(option),
	);
}
</script>

<template>
	<div data-test-id="wont-execute-filter">
		<N8nCheckbox
			:label="i18n.baseText('typeAvailabilityPolicies.wontExecute.filter')"
			:model-value="allSelected"
			:indeterminate="someSelected"
			data-test-id="wont-execute-filter-all"
			@update:model-value="onToggleAll"
		/>
		<div :class="$style.causes">
			<N8nCheckbox
				v-for="cause in WORKFLOW_EXECUTION_BLOCK_CAUSES"
				:key="cause"
				:label="i18n.baseText(EXECUTION_BLOCK_CAUSE_COPY[cause].label)"
				:model-value="selected.includes(cause)"
				:data-test-id="`wont-execute-filter-${cause}`"
				@update:model-value="onToggleCause(cause, $event)"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.causes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
	padding-left: var(--spacing--lg);
}
</style>
