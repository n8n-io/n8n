import type { FrontendBuilderMessage } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';

import { useWorkflowsStore } from '@/app/stores/workflows.store';

import { getFrontendBuilderState, sendFrontendBuilderMessage } from '../api/frontend-builder.api';

const WEBHOOK_TRIGGER_TYPE = 'n8n-nodes-base.webhook';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

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
			const endpoints = webhookTriggerNodes.value.map((node) => ({
				nodeName: node.name,
				method: ((node.parameters?.httpMethod as string) ?? 'POST') as HttpMethod,
				url: `${rootStore.webhookUrl}/${(node.parameters?.path as string) ?? ''}`,
				// Slice 4 fills requestExample / responseExample from run data.
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

	return { messages, demoUrl, sending, hydrating, error, hasWebhookTrigger, hydrate, send };
}
