import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';

import type { WorkflowEntity } from '@/databases/entities/workflow-entity';
import type { IWorkflowDb } from '@/interfaces';
import type { WorkflowRunner } from '@/workflow-runner';
import { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

const webhookNode: INode = {
	name: 'Webhook',
	type: 'n8n-nodes-base.webhook',
	id: '111f1db0-e7be-44c5-9ce9-3e35362490f0',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
	webhookId: 'de0f8dcb-7b64-4f22-b66d-d8f74d6aefb7',
};

const secondWebhookNode = {
	...webhookNode,
	name: 'Webhook 2',
	id: '222f1db0-e7be-44c5-9ce9-3e35362490f1',
};

const executeWorkflowTriggerNode: INode = {
	name: 'Execute Workflow Trigger',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	id: '78d63bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

const respondToWebhookNode: INode = {
	name: 'Respond to Webhook',
	type: 'n8n-nodes-base.respondToWebhook',
	id: '66d63bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

const hackerNewsNode: INode = {
	name: 'Hacker News',
	type: 'n8n-nodes-base.hackerNews',
	id: '55d63bca-bb6c-4568-948f-8ed9aacb1fe9',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
};

describe('WorkflowExecutionService', () => {
	const workflowRunner = mock<WorkflowRunner>();
	const workflowExecutionService = new WorkflowExecutionService(
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		workflowRunner,
		mock(),
		mock(),
	);

	describe('runWorkflow()', () => {
		test('should call `WorkflowRunner.run()`', async () => {
			const node = mock<INode>();
			const workflow = mock<WorkflowEntity>({ active: true, nodes: [node] });

			workflowRunner.run.mockResolvedValue('fake-execution-id');

			await workflowExecutionService.runWorkflow(workflow, node, [[]], mock(), 'trigger');

			expect(workflowRunner.run).toHaveBeenCalledTimes(1);
		});
	});

	describe('selectPinnedActivatorStarter()', () => {
		const workflow = mock<IWorkflowDb>({
			nodes: [],
		});

		const pinData = {
			[webhookNode.name]: [{ json: { key: 'value' } }],
			[executeWorkflowTriggerNode.name]: [{ json: { key: 'value' } }],
		};

		afterEach(() => {
			workflow.nodes = [];
		});

		it('should return `null` if no pindata', () => {
			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, []);

			expect(node).toBeNull();
		});

		it('should return `null` if no starter nodes', () => {
			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow);

			expect(node).toBeNull();
		});

		it('should select webhook node if only choice', () => {
			workflow.nodes.push(webhookNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toEqual(webhookNode);
		});

		it('should return `null` if no choice', () => {
			workflow.nodes.push(hackerNewsNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toBeNull();
		});

		it('should return ignore Respond to Webhook', () => {
			workflow.nodes.push(respondToWebhookNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toBeNull();
		});

		it('should select execute workflow trigger if only choice', () => {
			workflow.nodes.push(executeWorkflowTriggerNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toEqual(executeWorkflowTriggerNode);
		});

		it('should favor webhook node over execute workflow trigger', () => {
			workflow.nodes.push(webhookNode, executeWorkflowTriggerNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toEqual(webhookNode);
		});

		it('should favor first webhook node over second webhook node', () => {
			workflow.nodes.push(webhookNode, secondWebhookNode);

			const node = workflowExecutionService.selectPinnedActivatorStarter(workflow, [], pinData);

			expect(node).toEqual(webhookNode);
		});
	});
});
