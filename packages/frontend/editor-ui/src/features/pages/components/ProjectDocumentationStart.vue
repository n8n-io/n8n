<script setup lang="ts">
import { computed } from 'vue';

import { useProjectDocumentation } from '../composables/useProjectDocumentation';
import DocumentProjectButton from './DocumentProjectButton.vue';

/**
 * Offers to document a project next to its list of workflows.
 * It renders nothing when a workflow of the project already has a page, and when the project has no workflow.
 * It reads the documentation overview from the store and does not load it.
 */
const { projectId, hasDocumentation, undocumentedWorkflows } = useProjectDocumentation();

const offersDocumentation = computed(
	() => !hasDocumentation.value && undocumentedWorkflows.value.length > 0,
);
</script>

<template>
	<div v-if="offersDocumentation" :class="$style.start" data-test-id="project-documentation-start">
		<DocumentProjectButton
			:project-id="projectId"
			:undocumented-workflows="undocumentedWorkflows"
		/>
	</div>
</template>

<style lang="scss" module>
.start {
	display: flex;
	justify-content: flex-end;
	margin-bottom: var(--spacing--sm);
}
</style>
