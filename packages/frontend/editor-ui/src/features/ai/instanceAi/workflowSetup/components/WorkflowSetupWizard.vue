<script lang="ts" setup>
import { computed } from 'vue';
import WorkflowSetupCard from './WorkflowSetupCard.vue';
import WorkflowSetupGroupCard from './WorkflowSetupGroupCard.vue';
import WorkflowSetupWizardFooter from './WorkflowSetupWizardFooter.vue';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';

const ctx = useWorkflowSetupContext();

const activeGroup = computed(() =>
	ctx.activeStep.value?.kind === 'group' ? ctx.activeStep.value.group : undefined,
);

const activeSection = computed(() =>
	ctx.activeStep.value?.kind === 'section' ? ctx.activeStep.value.section : undefined,
);

const groupKey = computed(() => {
	return activeGroup.value ? `group:${activeGroup.value.subnodeRootNode.name}` : undefined;
});

const sectionKey = computed(() => activeSection.value?.id);
</script>

<template>
	<WorkflowSetupGroupCard v-if="activeGroup" :key="groupKey" :group="activeGroup">
		<template #footer>
			<WorkflowSetupWizardFooter />
		</template>
	</WorkflowSetupGroupCard>
	<WorkflowSetupCard v-else-if="activeSection" :key="sectionKey" :section="activeSection">
		<template #footer>
			<WorkflowSetupWizardFooter />
		</template>
	</WorkflowSetupCard>
</template>
