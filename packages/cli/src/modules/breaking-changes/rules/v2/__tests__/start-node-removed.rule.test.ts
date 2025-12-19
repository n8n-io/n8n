import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { BreakingChangeCategory } from '../../../types';
import { StartNodeRemovedRule } from '../start-node-removed.rule';

describe('StartNodeRemovedRule', () => {
	let rule: StartNodeRemovedRule;

	beforeEach(() => {
		jest.clearAllMocks();
		rule = new StartNodeRemovedRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toMatchObject({
				version: 'v2',
				title: 'Start node removed',
				description:
					'The Start node is no longer supported. Replace it with a Manual Trigger for manual executions, or with an Execute Workflow Trigger if used as a sub-workflow.',
				category: BreakingChangeCategory.workflow,
				severity: 'medium',
			});
		});
	});

	describe('getRecommendations()', () => {
		it('should return recommendations', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(3);
			expect(recommendations[0]).toMatchObject({
				action: 'Replace with Manual Trigger',
				description:
					'If the workflow is triggered manually, replace the Start node with the Manual Trigger node.',
			});
			expect(recommendations[1]).toMatchObject({
				action: 'Replace with Execute Workflow Trigger',
				description:
					'If the workflow is called as a sub-workflow, replace the Start node with the Execute Workflow Trigger node and activate the workflow.',
			});
			expect(recommendations[2]).toMatchObject({
				action: 'Delete disabled Start nodes',
				description: 'If the Start node is disabled, delete it from the workflow.',
			});
		});
	});

	describe('detectWorkflow()', () => {
		it('should return no issues when no start nodes are found', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Manual Trigger', 'n8n-nodes-base.manualTrigger'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should detect disabled start node with delete message', async () => {
			const disabledStartNode = {
				...createNode('Start', 'n8n-nodes-base.start'),
				disabled: true,
			};
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				disabledStartNode,
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				title: "Start node 'Start' is no longer supported",
				description: 'Delete this disabled Start node from the workflow.',
				level: 'error',
			});
		});

		it('should detect enabled start node with replace message', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Start', 'n8n-nodes-base.start'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				title: "Start node 'Start' is no longer supported",
				description:
					'Replace with Manual Trigger for manual executions, or Execute Workflow Trigger if used as a sub-workflow.',
				level: 'error',
				nodeId: 'node-Start',
				nodeName: 'Start',
			});
		});

		it('should detect multiple start nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Start 1', 'n8n-nodes-base.start'),
				createNode('Start 2', 'n8n-nodes-base.start'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);
		});

		it('should detect both enabled and disabled start nodes with appropriate messages', async () => {
			const disabledStartNode = {
				...createNode('Start Disabled', 'n8n-nodes-base.start'),
				disabled: true,
			};
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Start Enabled', 'n8n-nodes-base.start'),
				disabledStartNode,
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);

			const enabledIssue = result.issues.find((i) => i.nodeName === 'Start Enabled');
			const disabledIssue = result.issues.find((i) => i.nodeName === 'Start Disabled');

			expect(enabledIssue?.description).toBe(
				'Replace with Manual Trigger for manual executions, or Execute Workflow Trigger if used as a sub-workflow.',
			);
			expect(disabledIssue?.description).toBe('Delete this disabled Start node from the workflow.');
		});
	});
});
