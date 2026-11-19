<script setup lang="ts">
import { WORKFLOW_EXECUTION_BLOCK_CAUSES, type WorkflowExecutionBlockCause } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';

import { EXECUTION_BLOCK_CAUSE_COPY } from './wontExecute';
import CauseCheckboxFilter from '../components/CauseCheckboxFilter.vue';

const selected = defineModel<WorkflowExecutionBlockCause[]>({ required: true });

const i18n = useI18n();
</script>

<template>
	<CauseCheckboxFilter
		v-model="selected"
		:causes="WORKFLOW_EXECUTION_BLOCK_CAUSES"
		:label="i18n.baseText('typeAvailabilityPolicies.wontExecute.filter')"
		:cause-label="(cause) => i18n.baseText(EXECUTION_BLOCK_CAUSE_COPY[cause].label)"
		test-id-prefix="wont-execute-filter"
	/>
</template>
