import type { FrontendBuilderMessage } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { INodeUi } from '@/Interface';
import type { IRunData } from 'n8n-workflow';
import { computed, ref } from 'vue';

import { useWorkflowsStore } from '@/app/stores/workflows.store';

import {
	clearFrontendBuilderChat,
	getFrontendBuilderState,
	sendFrontendBuilderMessage,
} from '../api/frontend-builder.api';

const WEBHOOK_TRIGGER_TYPE = 'n8n-nodes-base.webhook';
const RESPOND_TO_WEBHOOK_TYPE = 'n8n-nodes-base.respondToWebhook';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * The webhook trigger's first run-data item is the request body the webhook
 * received. Returns `undefined` if the workflow hasn't been run, or the
 * trigger didn't fire in the latest run.
 */
function pickRequestExample(node: INodeUi, runData: IRunData | null): unknown {
	const taskRuns = runData?.[node.name];
	return taskRuns?.[0]?.data?.main?.[0]?.[0]?.json;
}

/**
 * The response v0 should expect comes from either:
 *   - a `respondToWebhook` node's INPUT (the data passed to it), or
 *   - the last successfully-run node's output.
 * Returns `undefined` if there's no run data to draw from.
 */
function pickResponseExample(allNodes: INodeUi[], runData: IRunData | null): unknown {
	if (!runData) return undefined;

	const respondNode = allNodes.find((n) => n.type === RESPOND_TO_WEBHOOK_TYPE && runData[n.name]);
	if (respondNode) {
		// The respond node receives its body via input — its output mirrors the input for
		// the spike's purposes, so use the same accessor.
		return runData[respondNode.name]?.[0]?.data?.main?.[0]?.[0]?.json;
	}

	// Fall back to the last-run node's output.
	const ranNodeNames = Object.keys(runData);
	const lastName = ranNodeNames[ranNodeNames.length - 1];
	return lastName ? runData[lastName]?.[0]?.data?.main?.[0]?.[0]?.json : undefined;
}

export function useFrontendBuilder() {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();

	const messages = ref<FrontendBuilderMessage[]>([]);
	const demoUrl = ref<string | null>(null);
	const sending = ref(false);
	const hydrating = ref(false);
	const error = ref<string | null>(null);

	const webhookTriggerNodes = computed(() =>
		workflowsStore.allNodes.filter((node) => node.type === WEBHOOK_TRIGGER_TYPE),
	);

	const hasWebhookTrigger = computed(() => webhookTriggerNodes.value.length > 0);

	async function hydrate() {
		hydrating.value = true;
		error.value = null;
		try {
			const state = await getFrontendBuilderState(
				rootStore.restApiContext,
				workflowsStore.workflowId,
			);
			if (state.chatId === null) {
				messages.value = [];
				demoUrl.value = null;
			} else {
				messages.value = state.messages;
				demoUrl.value = state.demoUrl;
			}
		} catch (err) {
			error.value = err instanceof Error ? err.message : String(err);
		} finally {
			hydrating.value = false;
		}
	}

	async function send(prompt: string) {
		if (!prompt.trim()) return;

		sending.value = true;
		error.value = null;

		try {
			const runData = workflowsStore.getWorkflowRunData;
			const responseExample = pickResponseExample(workflowsStore.allNodes, runData);

			const endpoints = webhookTriggerNodes.value.map((node) => ({
				nodeName: node.name,
				method: ((node.parameters?.httpMethod as string) ?? 'POST') as HttpMethod,
				url: `${rootStore.webhookUrl}/${(node.parameters?.path as string) ?? ''}`,
				requestExample: pickRequestExample(node, runData),
				responseExample,
			}));

			const response = await sendFrontendBuilderMessage(
				rootStore.restApiContext,
				workflowsStore.workflowId,
				{ prompt, endpoints },
			);

			messages.value.push(
				{ role: 'user', content: prompt, createdAt: new Date().toISOString() },
				response.assistantMessage,
			);
			// Preserve the prior demo URL across responses that don't carry one
			// (e.g. v0 asked a clarifying question instead of regenerating). It
			// only changes when v0 produced a new version.
			if (response.demoUrl) demoUrl.value = response.demoUrl;
		} catch (err) {
			error.value = err instanceof Error ? err.message : String(err);
		} finally {
			sending.value = false;
		}
	}

	async function clear() {
		error.value = null;
		try {
			await clearFrontendBuilderChat(rootStore.restApiContext, workflowsStore.workflowId);
			messages.value = [];
			demoUrl.value = null;
		} catch (err) {
			error.value = err instanceof Error ? err.message : String(err);
		}
	}

	return {
		messages,
		demoUrl,
		sending,
		hydrating,
		error,
		hasWebhookTrigger,
		hydrate,
		send,
		clear,
	};
}
