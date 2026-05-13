<script setup lang="ts">
import type { App as McpApp } from '@modelcontextprotocol/ext-apps';
import { shallowRef } from 'vue';

import type { PreviewWorkflowOutput } from '../../shared/workflow-diagram';
import WorkflowDiagram from './components/WorkflowDiagram.vue';

const props = defineProps<{
	mcp: McpApp;
}>();

const workflow = shallowRef<PreviewWorkflowOutput | null>(null);

props.mcp.addEventListener('toolresult', (result) => {
	const structuredContent = result.structuredContent;
	workflow.value = isPreviewWorkflowOutput(structuredContent) ? structuredContent : null;
});

function isPreviewWorkflowOutput(value: unknown): value is PreviewWorkflowOutput {
	if (!isRecord(value)) return false;

	return (
		typeof value.workflowId === 'string' &&
		typeof value.name === 'string' &&
		Array.isArray(value.nodes) &&
		value.nodes.every(isPreviewWorkflowNode) &&
		isRecord(value.connections)
	);
}

function isPreviewWorkflowNode(value: unknown): value is PreviewWorkflowOutput['nodes'][number] {
	if (!isRecord(value)) return false;

	return (
		typeof value.name === 'string' &&
		typeof value.type === 'string' &&
		Array.isArray(value.position) &&
		value.position.length === 2 &&
		value.position.every((coordinate) => typeof coordinate === 'number')
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
</script>

<template>
	<main class="app-shell">
		<section v-if="workflow" class="diagram-card" aria-live="polite">
			<header class="diagram-header">
				<div>
					<p class="eyebrow">Workflow preview</p>
					<h1>{{ workflow.name }}</h1>
				</div>
				<p class="summary">{{ workflow.nodes.length }} nodes</p>
			</header>

			<WorkflowDiagram :workflow="workflow" />
		</section>

		<section v-else class="empty-state" aria-live="polite">
			<p class="eyebrow">Workflow preview</p>
			<h1>Waiting for workflow data</h1>
			<p>Call the preview_workflow tool to render a diagram here.</p>
		</section>
	</main>
</template>
