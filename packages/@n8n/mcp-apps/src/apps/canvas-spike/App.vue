<script setup lang="ts">
import type { INodeTypeDescription } from 'n8n-workflow';

import WorkflowCanvasHost from '@mcp-apps/components/workflow-preview/workflow-canvas-host.vue';

import type { WorkflowPreviewData } from '../workflow-preview/types';

/**
 * Standalone dev harness for the embedded canvas PoC: renders a hardcoded
 * workflow through the same host component the MCP workflow-preview app
 * uses, without requiring an MCP host connection.
 */
const nodeTypes: INodeTypeDescription[] = [
	{
		displayName: 'Manual Trigger',
		name: 'n8n-nodes-base.manualTrigger',
		icon: 'fa:mouse-pointer',
		iconColor: 'gray',
		group: ['trigger'],
		version: 1,
		description: 'Runs the flow on clicking a button in n8n',
		defaults: { name: 'When clicking ‘Execute workflow’', color: '#909298' },
		inputs: [],
		outputs: ['main'],
		properties: [],
	},
	{
		displayName: 'Edit Fields (Set)',
		name: 'n8n-nodes-base.set',
		icon: 'fa:pen',
		iconColor: 'blue',
		group: ['input'],
		version: 3.4,
		description: 'Modify, add, or remove item fields',
		defaults: { name: 'Edit Fields', color: '#0000FF' },
		inputs: ['main'],
		outputs: ['main'],
		properties: [],
	},
	{
		displayName: 'If',
		name: 'n8n-nodes-base.if',
		icon: 'fa:map-signs',
		iconColor: 'green',
		group: ['transform'],
		version: 2.2,
		description: 'Route items to different branches (true/false)',
		defaults: { name: 'If', color: '#408000' },
		inputs: ['main'],
		outputs: ['main', 'main'],
		outputNames: ['true', 'false'],
		properties: [],
	},
];

const workflow: WorkflowPreviewData = {
	id: 'canvas-spike',
	name: 'Canvas spike workflow',
	nodes: [
		{
			id: '11111111-1111-1111-1111-111111111111',
			name: 'When clicking ‘Execute workflow’',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: '22222222-2222-2222-2222-222222222222',
			name: 'Edit Fields',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [280, 0],
			parameters: {},
		},
		{
			id: '33333333-3333-3333-3333-333333333333',
			name: 'If',
			type: 'n8n-nodes-base.if',
			typeVersion: 2.2,
			position: [560, 0],
			parameters: {},
		},
		{
			id: '44444444-4444-4444-4444-444444444444',
			name: 'Success',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [840, -100],
			parameters: {},
		},
		{
			id: '55555555-5555-5555-5555-555555555555',
			name: 'Unknown Node',
			type: 'n8n-nodes-base.doesNotExist',
			typeVersion: 1,
			position: [840, 100],
			parameters: {},
		},
	],
	// n8n workflow connections are keyed by node display name.
	/* eslint-disable @typescript-eslint/naming-convention */
	connections: {
		'When clicking ‘Execute workflow’': {
			main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]],
		},
		'Edit Fields': {
			main: [[{ node: 'If', type: 'main', index: 0 }]],
		},
		If: {
			main: [
				[{ node: 'Success', type: 'main', index: 0 }],
				[{ node: 'Unknown Node', type: 'main', index: 0 }],
			],
		},
	},
	/* eslint-enable @typescript-eslint/naming-convention */
};

function onError(error: unknown) {
	console.error('[canvas-spike] Failed to render canvas', error);
}
</script>

<template>
	<div class="spike-shell">
		<WorkflowCanvasHost :workflow="workflow" :node-types="nodeTypes" @error="onError" />
	</div>
</template>

<style scoped lang="scss">
.spike-shell {
	width: 100vw;
	height: 100vh;
	background: var(--canvas--color--background);
}
</style>
