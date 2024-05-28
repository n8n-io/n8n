import type { IWorkflowDataUpdate } from '@/Interface';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import router from '@/router';
import { createTestingPinia } from '@pinia/testing';
import type { INode } from 'n8n-workflow';
import { setActivePinia } from 'pinia';

const TEST_WEBHOOK_SUFFIX = '/test';

const duplicateTestWorkflow: IWorkflowDataUpdate = {
	name: 'Duplicate webhook test',
	active: false,
	nodes: [
		{
			parameters: {
				path: '5340ae49-2c96-4492-9073-7744d2e52b8a',
				options: {},
			},
			id: 'c1e1b6e7-df13-41b1-95f6-42903b85e438',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [680, 20],
			webhookId: '5340ae49-2c96-4492-9073-7744d2e52b8a',
		},
		{
			parameters: {
				path: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
				options: {},
			},
			id: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
			name: 'Webhook 2',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [700, 40],
			webhookId: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
		},
		{
			parameters: {
				resume: 'webhook',
				options: {
					webhookSuffix: TEST_WEBHOOK_SUFFIX,
				},
			},
			id: '979d8443-51b1-48e2-b239-acf399b66509',
			name: 'Wait',
			type: 'n8n-nodes-base.wait',
			typeVersion: 1.1,
			position: [900, 20],
			webhookId: '5340ae49-2c96-4492-9073-7744d2e52b8a',
		},
	],
	connections: {},
};

/**
 * Extract webhook suffixes from nodes that have them
 * @param nodes List of nodes
 * @returns List of webhook suffixes found in the nodes
 */
const extractWebhookSuffixes = (nodes: INode[]) => {
	return nodes
		.map((node) => node.parameters.options)
		.filter(
			(options): options is { webhookSuffix: string } =>
				options !== null && typeof options === 'object' && 'webhookSuffix' in options,
		)
		.map((options) => options.webhookSuffix)
		.filter((suffix) => suffix);
};

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		workflowsById: {},
		createNewWorkflow: vi.fn(() => {}),
		addWorkflow: vi.fn(() => {}),
		setActive: vi.fn(() => {}),
		setWorkflowId: vi.fn(() => {}),
		setWorkflowVersionId: vi.fn(() => {}),
		setWorkflowName: vi.fn(() => {}),
		setWorkflowSettings: vi.fn(() => {}),
		setNodeValue: vi.fn(() => {}),
		setWorkflowTagIds: vi.fn(() => {}),
		getCurrentWorkflow: vi.fn(() => ({})),
	})),
}));

describe('useWorkflowHelpers', () => {
	describe('saveAsNewWorkflow', () => {
		beforeAll(() => {
			setActivePinia(createTestingPinia());
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should respect `resetWebhookUrls: false` when duplicating workflows', async () => {
			if (!duplicateTestWorkflow.nodes) {
				throw new Error('Missing nodes in test workflow');
			}
			const { saveAsNewWorkflow } = useWorkflowHelpers({ router });
			const webHookIdsPreSave = duplicateTestWorkflow.nodes.map((node) => node.webhookId);
			const pathsPreSave = duplicateTestWorkflow.nodes.map((node) => node.parameters.path);

			await saveAsNewWorkflow({
				name: duplicateTestWorkflow.name,
				resetWebhookUrls: false,
				data: duplicateTestWorkflow,
			});

			const webHookIdsPostSave = duplicateTestWorkflow.nodes.map((node) => node.webhookId);
			const pathsPostSave = duplicateTestWorkflow.nodes.map((node) => node.parameters.path);
			const webhookSuffixPostSave = extractWebhookSuffixes(duplicateTestWorkflow.nodes);
			// Expect webhookIds, paths and suffix to be the same as in the original workflow
			expect(webHookIdsPreSave).toEqual(webHookIdsPostSave);
			expect(pathsPreSave).toEqual(pathsPostSave);
			expect(webhookSuffixPostSave).toEqual([TEST_WEBHOOK_SUFFIX]);
		});

		it('should respect `resetWebhookUrls: true` when duplicating workflows', async () => {
			if (!duplicateTestWorkflow.nodes) {
				throw new Error('Missing nodes in test workflow');
			}
			const { saveAsNewWorkflow } = useWorkflowHelpers({ router });
			const webHookIdsPreSave = duplicateTestWorkflow.nodes.map((node) => node.webhookId);
			const pathsPreSave = duplicateTestWorkflow.nodes.map((node) => node.parameters.path);

			await saveAsNewWorkflow({
				name: duplicateTestWorkflow.name,
				resetWebhookUrls: true,
				data: duplicateTestWorkflow,
			});

			const webHookIdsPostSave = duplicateTestWorkflow.nodes.map((node) => node.webhookId);
			const pathsPostSave = duplicateTestWorkflow.nodes.map((node) => node.parameters.path);
			const webhookSuffixPostSave = extractWebhookSuffixes(duplicateTestWorkflow.nodes);
			// Now, expect webhookIds, paths and suffix to be different
			expect(webHookIdsPreSave).not.toEqual(webHookIdsPostSave);
			expect(pathsPreSave).not.toEqual(pathsPostSave);
			expect(webhookSuffixPostSave).toEqual([`${TEST_WEBHOOK_SUFFIX}-copy`]);
		});
	});
});
