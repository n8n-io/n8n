import { computed, toValue, type MaybeRef } from 'vue';
import { computedAsync } from '@vueuse/core';
import type { IWebhookDescription } from 'n8n-workflow';

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

	async function resolveHideFlag(
		webhook: IWebhookDescription,
		field: 'ndvHideUrl' | 'ndvHideMethod',
		nodeName: string,
	): Promise<boolean> {
		const raw = webhook[field];
		if (typeof raw === 'string') {
			try {
				return !!(await workflowHelpers.getWebhookExpressionValue(webhook, field, true, nodeName));
			} catch {
				return false;
			}
		}
		return !!raw;
	}

	async function resolveHttpMethod(
		webhook: IWebhookDescription,
		nodeName: string,
	): Promise<{ httpMethod: string; isMethodVisible: boolean }> {
		let isMethodVisible = !webhook.ndvHideMethod;
		let httpMethod = '';

		try {
			const method = await workflowHelpers.getWebhookExpressionValue(
				webhook,
				'httpMethod',
				false,
				nodeName,
			);
			if (Array.isArray(method) && method.length !== 1) {
				isMethodVisible = false;
			} else {
				httpMethod = Array.isArray(method) ? method[0] : (method as string);
				if (typeof webhook.ndvHideMethod === 'string') {
					isMethodVisible = !(await resolveHideFlag(webhook, 'ndvHideMethod', nodeName));
				}
			}
		} catch {
			// Keep defaults
		}

		return { httpMethod, isMethodVisible };
	}

	const webhookUrls = computedAsync(async () => {
		const currentNode = nodeValue.value;
		if (!currentNode || webhooks.value.length === 0) return [];

		const result: WebhookDisplayData[] = [];

		for (const webhook of webhooks.value) {
			const nodeName = currentNode.name;

			if (await resolveHideFlag(webhook, 'ndvHideUrl', nodeName)) continue;

			const url = await workflowHelpers.getWebhookUrl(webhook, currentNode, 'test');
			const { httpMethod, isMethodVisible } = await resolveHttpMethod(webhook, nodeName);

			result.push({ url, httpMethod, isMethodVisible });
		}

		return result;
	}, []);

	return {
		webhookUrls,
	};
}
