<script lang="ts" setup>
import WorkflowSetupCard from './WorkflowSetupCard.vue';
import WorkflowSetupWizardFooter from './WorkflowSetupWizardFooter.vue';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';

const ctx = useWorkflowSetupContext();
</script>

<template>
	<WorkflowSetupCard
		v-if="ctx.activeSection.value"
		:key="ctx.activeSection.value.id"
		:section="ctx.activeSection.value"
	>
		<template #footer>
			<WorkflowSetupWizardFooter />
		</template>
	</WorkflowSetupCard>
</template>
