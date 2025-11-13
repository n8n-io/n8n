import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { BreakingChangeCategory } from '../../../types';
import { WaitNodeSubworkflowRule } from '../wait-node-subworkflow.rule';

describe('WaitNodeSubworkflowRule', () => {
	let rule: WaitNodeSubworkflowRule;

	beforeEach(() => {
		jest.clearAllMocks();
		rule = new WaitNodeSubworkflowRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toMatchObject({
				version: 'v2',
				title: 'Wait node behavior change in sub-workflows',
				description:
					'Wait nodes in sub-workflows now return data from the last node instead of the node before the wait node',
				category: BreakingChangeCategory.workflow,
				severity: 'medium',
			});
		});
	});

	describe('getRecommendations()', () => {
		it('should return recommendations', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(3);
			expect(recommendations).toEqual([
				{
					action: 'Review sub-workflow output handling',
					description:
						'Check workflows that use Execute Workflow node to call sub-workflows containing Wait nodes. The output data structure may have changed.',
				},
				{
					action: 'Update downstream logic',
					description:
						'Adjust any logic in parent workflows that depends on the data returned from sub-workflows with Wait nodes, as it now returns the last node data instead of the node before the wait node.',
				},
				{
					action: 'Test affected workflows',
					description:
						'Test all workflows with Execute Workflow nodes calling sub-workflows that contain Wait nodes to ensure the new behavior works as expected.',
				},
			]);
		});
	});

	describe('detectWorkflow()', () => {
		it('should return no issues when workflow has no Wait nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
			]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should return no issues when workflow has Wait nodes but no Execute Workflow Trigger', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should return no issues when workflow has Execute Workflow Trigger but no Wait nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
			]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should detect sub-workflow with Wait nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
		});

		it('should detect sub-workflow with multiple Wait nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait1', 'n8n-nodes-base.wait'),
				createNode('Wait2', 'n8n-nodes-base.wait'),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
		});

		it('should detect complex sub-workflow with Wait among other nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				createNode('Wait', 'n8n-nodes-base.wait'),
				createNode('Code', 'n8n-nodes-base.code'),
				createNode('Set', 'n8n-nodes-base.set'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].level).toBe('warning');
		});

		it('should not detect regular workflow with Wait and Execute Workflow nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				createNode('Wait', 'n8n-nodes-base.wait'),
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});
	});
});
