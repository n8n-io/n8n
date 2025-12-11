import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { BreakingChangeCategory } from '../../../types';
import { StartNodeDeprecatedRule } from '../start-node-deprecated.rule';

describe('StartNodeDeprecatedRule', () => {
	let rule: StartNodeDeprecatedRule;

	beforeEach(() => {
		jest.clearAllMocks();
		rule = new StartNodeDeprecatedRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toMatchObject({
				version: 'v2',
				title: 'Start node is deprecated',
				description:
					'The Start node has been deprecated. Replace it with a Manual Trigger for manual executions, or with an Execute Workflow Trigger if used as a sub-workflow.',
				category: BreakingChangeCategory.workflow,
				severity: 'medium',
			});
		});
	});

	describe('getRecommendations()', () => {
		it('should return recommendations', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(2);
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

		it('should return no issues when start node is disabled', async () => {
			const disabledStartNode = {
				...createNode('Start', 'n8n-nodes-base.start'),
				disabled: true,
			};
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				disabledStartNode,
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should detect enabled start node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Start', 'n8n-nodes-base.start'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				title: "Start node 'Start' is deprecated",
				description:
					'Replace with Manual Trigger for manual executions, or Execute Workflow Trigger if used as a sub-workflow.',
				level: 'error',
				nodeId: 'node-Start',
				nodeName: 'Start',
			});
		});

		it('should detect multiple enabled start nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Start 1', 'n8n-nodes-base.start'),
				createNode('Start 2', 'n8n-nodes-base.start'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);
		});

		it('should only detect enabled start nodes and ignore disabled ones', async () => {
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
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('Start Enabled');
		});
	});
});
