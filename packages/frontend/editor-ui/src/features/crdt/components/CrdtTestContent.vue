<script lang="ts" setup>
import { useWorkflowDoc } from '../composables/useWorkflowSync';
import WorkflowCanvas from './WorkflowCanvas.vue';

const doc = useWorkflowDoc();
</script>

<template>
	<WorkflowCanvas v-if="doc.isReady.value" />
	<div v-else-if="doc.state.value === 'connecting'" :class="$style.loading">
		Connecting to workflow...
	</div>
	<div v-else-if="doc.state.value === 'error'" :class="$style.error">
		<h2>Error Loading CRDT Workflow</h2>
		<p>{{ doc.error.value }}</p>
	</div>
</template>

<style lang="scss" module>
.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	font-size: var(--font-size--lg);
	color: var(--color--text--tint-1);
}

.error {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: var(--color--text--danger);

	h2 {
		margin-bottom: var(--spacing--sm);
	}
}
</style>
