import { computed, toValue, type MaybeRef } from 'vue';
import { computedAsync } from '@vueuse/core';

import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowHelpers } from '@/app/composables/useWorkflowHelpers';

export interface WebhookDisplayData {
	url: string;
	httpMethod: string;
	isMethodVisible: boolean;
}

/**
 * Resolves visible webhook test URLs for a given node.
 * Used by setup-panel cards to display copiable webhook URLs
 * while the trigger is in a listening state.
 */
export function useWebhookUrls(node: MaybeRef<INodeUi | null>) {
	const nodeTypesStore = useNodeTypesStore();
	const workflowHelpers = useWorkflowHelpers();

	const nodeValue = computed(() => toValue(node));

	const nodeType = computed(() =>
		nodeValue.value
			? nodeTypesStore.getNodeType(nodeValue.value.type, nodeValue.value.typeVersion)
			: null,
	);

	const webhooks = computed(() => {
		if (!nodeType.value?.webhooks) return [];
		return nodeType.value.webhooks.filter((w) => w.restartWebhook !== true);
	});

	const webhookUrls = computedAsync(async () => {
		const currentNode = nodeValue.value;
		if (!currentNode || webhooks.value.length === 0) return [];

		const result: WebhookDisplayData[] = [];

		for (const webhook of webhooks.value) {
			const nodeName = currentNode.name;

			// Check ndvHideUrl visibility
			let isVisible = !webhook.ndvHideUrl;
			if (typeof webhook.ndvHideUrl === 'string') {
				try {
					isVisible = !(await workflowHelpers.getWebhookExpressionValue(
						webhook,
						'ndvHideUrl',
						true,
						nodeName,
					));
				} catch {
					isVisible = true;
				}
			}
			if (!isVisible) continue;

			// Resolve URL (always test mode)
			const url = await workflowHelpers.getWebhookUrl(webhook, currentNode, 'test');

			// Resolve HTTP method visibility
			let isMethodVisible = !webhook.ndvHideMethod;
			try {
				const method = await workflowHelpers.getWebhookExpressionValue(
					webhook,
					'httpMethod',
					false,
					nodeName,
				);
				if (Array.isArray(method) && method.length !== 1) {
					isMethodVisible = false;
				} else if (typeof webhook.ndvHideMethod === 'string') {
					isMethodVisible = !(await workflowHelpers.getWebhookExpressionValue(
						webhook,
						'ndvHideMethod',
						true,
						nodeName,
					));
				}
			} catch {
				// Keep default
			}

			// Resolve HTTP method string
			let httpMethod = '';
			try {
				const method = await workflowHelpers.getWebhookExpressionValue(
					webhook,
					'httpMethod',
					false,
					nodeName,
				);
				httpMethod = Array.isArray(method) ? method[0] : (method as string);
			} catch {
				// Keep empty
			}

			result.push({ url, httpMethod, isMethodVisible });
		}

		return result;
	}, []);

	return {
		webhookUrls,
	};
}
