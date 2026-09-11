import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';

const mockAllNodes = ref<Array<{ name: string; type: string }>>([]);
vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => ({
		get value() {
			return { allNodes: mockAllNodes.value };
		},
	}),
}));

import { useWebAppCandidateWorkflow } from './useWebAppCandidateWorkflow';

describe('useWebAppCandidateWorkflow', () => {
	it('is false for an empty workflow', () => {
		mockAllNodes.value = [];
		expect(useWebAppCandidateWorkflow().value).toBe(false);
	});

	it('is false with only a Webhook trigger', () => {
		mockAllNodes.value = [{ name: 'Webhook', type: 'n8n-nodes-base.webhook' }];
		expect(useWebAppCandidateWorkflow().value).toBe(false);
	});

	it('is false with only a Respond to Webhook node', () => {
		mockAllNodes.value = [{ name: 'Respond', type: 'n8n-nodes-base.respondToWebhook' }];
		expect(useWebAppCandidateWorkflow().value).toBe(false);
	});

	it('is true when both a Webhook trigger and a Respond to Webhook node are present', () => {
		mockAllNodes.value = [
			{ name: 'Webhook', type: 'n8n-nodes-base.webhook' },
			{ name: 'Set', type: 'n8n-nodes-base.set' },
			{ name: 'Respond', type: 'n8n-nodes-base.respondToWebhook' },
		];
		expect(useWebAppCandidateWorkflow().value).toBe(true);
	});
});
