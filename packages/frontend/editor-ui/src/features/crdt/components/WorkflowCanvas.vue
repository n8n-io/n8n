<script lang="ts" setup>
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { useCanvasSync } from '../composables/useCanvasSync';
import { useWorkflowDoc } from '../composables/useWorkflowSync';

// Get injected document
const doc = useWorkflowDoc();

// Get VueFlow instance
const instance = useVueFlow(doc.workflowId);

// Wire document ↔ Vue Flow (bidirectional sync) and get initial nodes
const initialNodes = useCanvasSync(doc, instance);
</script>

<template>
	<VueFlow :id="doc.workflowId" :nodes="initialNodes" fit-view-on-init> </VueFlow>
</template>

<style lang="scss" module>
.toolbar {
	position: absolute;
	top: var(--spacing--sm);
	left: var(--spacing--sm);
	z-index: 10;
	display: flex;
	gap: var(--spacing--xs);
}

.button {
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background);
	color: var(--color--text);
	cursor: pointer;

	&:hover {
		background-color: var(--color--foreground--tint-1);
	}
}
</style>
