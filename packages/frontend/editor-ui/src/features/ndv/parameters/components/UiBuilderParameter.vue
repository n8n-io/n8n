<script setup lang="ts">
import type { IUpdateInformation } from '@/Interface';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { UiBuilderPanel } from '@n8n/ui-builder';
import type { HostExecutionOutput, HostWorkflow, UiBuilderHost } from '@n8n/ui-builder';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { NodeParameterValueType } from 'n8n-workflow';
import { computed } from 'vue';

import { RESPOND_TO_WEBHOOK_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/app/constants/nodeTypes';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { CanvasConnectionMode } from '@/features/workflows/canvas/canvas.types';
import { createCanvasConnectionHandleString } from '@/features/workflows/canvas/canvas.utils';

/**
 * The `uiBuilder` parameter, and the only part of the UI builder that editor-ui
 * owns. Everything visible lives in @n8n/ui-builder; this supplies the handful
 * of things that package cannot do for itself, all of which belong to the
 * workflow editor rather than to a UI document.
 */
const props = defineProps<{
	value: NodeParameterValueType;
	path: string;
	isReadOnly?: boolean;
}>();

const emit = defineEmits<{ valueChanged: [value: IUpdateInformation] }>();

/** The parameter is stored as a JSON string; anything else is treated as unset. */
const document = computed(() =>
	typeof props.value === 'string' || (props.value && typeof props.value === 'object')
		? (props.value as string | object)
		: undefined,
);

const rootStore = useRootStore();
const workflowsListStore = useWorkflowsListStore();
const executionsStore = useExecutionsStore();
const documentStore = injectWorkflowDocumentStore();
const { addNodes, addConnections } = useCanvasOperations();

function pathsOf(nodes: Array<{ type: string; parameters?: Record<string, unknown> }>): string[] {
	return nodes
		.filter((node) => node.type === WEBHOOK_NODE_TYPE)
		.map((node) => String(node.parameters?.path ?? '').replace(/^\//, ''))
		.filter(Boolean);
}

const host: UiBuilderHost = {
	// `path` and not a node's resolved name: the Webhook node's description is
	// `isFullPath`, so the production URL is the path on its own.
	webhookUrlFor: (path) => `${rootStore.webhookUrl}/${path}`,

	// Read from the open canvas rather than the server, so a trigger added a
	// moment ago and not yet saved is already offered.
	localWebhookPaths: () => pathsOf(documentStore.value?.allNodes ?? []),

	workflowId: () => documentStore.value?.workflowId,

	/**
	 * The pair an action needs: the trigger receives the posted state, the
	 * responder returns the partial to merge, so it is pre-set to an empty JSON
	 * body for the author to fill in.
	 *
	 * Everything not passed here is resolved by the canvas: ids, unique names,
	 * the default type version, the webhook id, and a non-overlapping position.
	 * `isAutoAdd` is what stops each new node being wired to whichever node's
	 * parameter panel is currently open, which is this one.
	 */
	async createWebhookPair(path) {
		const [trigger, responder] = await addNodes(
			[
				{
					type: WEBHOOK_NODE_TYPE,
					isAutoAdd: true,
					parameters: { httpMethod: 'POST', path, responseMode: 'responseNode' },
				},
				{
					type: RESPOND_TO_WEBHOOK_NODE_TYPE,
					isAutoAdd: true,
					parameters: { respondWith: 'json', responseBody: '{}' },
				},
			],
			{ trackHistory: true, trackBulk: true, telemetry: false },
		);

		if (!trigger || !responder) return false;

		await addConnections(
			[
				{
					source: trigger.id,
					sourceHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Output,
						type: NodeConnectionTypes.Main,
						index: 0,
					}),
					target: responder.id,
					targetHandle: createCanvasConnectionHandleString({
						mode: CanvasConnectionMode.Input,
						type: NodeConnectionTypes.Main,
						index: 0,
					}),
					data: {
						source: { index: 0, type: NodeConnectionTypes.Main },
						target: { index: 0, type: NodeConnectionTypes.Main },
					},
				},
			],
			{ trackHistory: true, trackBulk: false },
		);

		return true;
	},

	/**
	 * `with-node-types` returns workflow summaries without their nodes, so the
	 * paths need a second fetch per workflow. Fine at PoC scale, and the panel
	 * only asks when someone opens the cross-workflow picker.
	 */
	async listWebhookWorkflows(): Promise<HostWorkflow[]> {
		const response = await workflowsListStore.fetchWorkflowsWithNodesIncluded([WEBHOOK_NODE_TYPE]);
		const summaries = response?.data ?? [];
		const found: HostWorkflow[] = [];

		for (const summary of summaries) {
			// The workflow being edited is the dropdown's job, and the open canvas
			// is a fresher account of it than the server's copy.
			if (summary.id === documentStore.value?.workflowId) continue;

			const workflow = await workflowsListStore.fetchWorkflow(summary.id);

			found.push({
				id: workflow.id,
				name: workflow.name,
				active: Boolean(workflow.active),
				paths: pathsOf(workflow.nodes ?? []),
			});
		}

		return found;
	},

	/**
	 * The output of the last node to run in the most recent execution, which is
	 * what that workflow's Respond to Webhook handed back.
	 */
	async lastExecutionOutput(workflowId): Promise<HostExecutionOutput | undefined> {
		// The list goes through the REST helper rather than the executions store:
		// the store's fetch wants a whole filter object and clears its own view
		// state as it goes, neither of which belongs to a panel asking one
		// question. The single fetch below is worth having, since it unflattens
		// the execution for us.
		const list = await makeRestApiRequest<{ results: Array<{ id: string }> }>(
			rootStore.restApiContext,
			'GET',
			'/executions',
			{ filter: { workflowId }, limit: 1 },
		);

		const latest = list?.results?.[0];
		if (!latest) return undefined;

		const execution = await executionsStore.fetchExecution(latest.id);
		const resultData = execution?.data?.resultData;
		const node = resultData?.lastNodeExecuted;
		const runs = node ? resultData?.runData?.[node] : undefined;

		return { node, json: runs?.[runs.length - 1]?.data?.main?.[0]?.[0]?.json };
	},
};

function onUpdate(json: string) {
	emit('valueChanged', { name: props.path, value: json });
}
</script>

<template>
	<UiBuilderPanel
		:value="document"
		:host="host"
		:read-only="isReadOnly"
		@update="onUpdate"
	/>
</template>
