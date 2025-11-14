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
				title: 'Waiting node behavior change in sub-workflows',
				description:
					'Waiting nodes (Wait, Form, and HITL nodes) in sub-workflows now return data from the last node instead of the node before the waiting node',
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
						'Check workflows that use Execute Workflow node to call sub-workflows containing waiting nodes (Wait, Form, or HITL nodes). The output data structure may have changed.',
				},
				{
					action: 'Update downstream logic',
					description:
						'Adjust any logic in parent workflows that depends on the data returned from sub-workflows with waiting nodes, as it now returns the last node data instead of the node before the waiting node.',
				},
				{
					action: 'Test affected workflows',
					description:
						'Test all workflows with Execute Workflow nodes calling sub-workflows that contain waiting nodes to ensure the new behavior works as expected.',
				},
			]);
		});
	});

	describe('detectWorkflow()', () => {
		it.each([
			{
				description: 'workflow has no waiting nodes',
				nodes: [
					createNode('HTTP', 'n8n-nodes-base.httpRequest'),
					createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				],
			},
			{
				description: 'workflow has waiting nodes but no Execute Workflow Trigger',
				nodes: [
					createNode('HTTP', 'n8n-nodes-base.httpRequest'),
					createNode('Wait', 'n8n-nodes-base.wait'),
				],
			},
			{
				description: 'workflow has Execute Workflow Trigger but no waiting nodes',
				nodes: [
					createNode('HTTP', 'n8n-nodes-base.httpRequest'),
					createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				],
			},
		])('should return no issues when $description', async ({ nodes }) => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', nodes);
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
			expect(result.issues[0].nodeId).toBeDefined();
			expect(result.issues[0].nodeName).toBe('Wait');
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
			expect(result.issues).toHaveLength(2);
			expect(result.issues[0].nodeId).toBeDefined();
			expect(result.issues[0].nodeName).toBe('Wait1');
			expect(result.issues[1].nodeId).toBeDefined();
			expect(result.issues[1].nodeName).toBe('Wait2');
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
			expect(result.issues[0].nodeId).toBeDefined();
			expect(result.issues[0].nodeName).toBe('Wait');
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

		it('should detect sub-workflow with Form node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Form', 'n8n-nodes-base.form'),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].description).toContain('form');
			expect(result.issues[0].nodeId).toBeDefined();
			expect(result.issues[0].nodeName).toBe('Form');
		});

		it.each([
			{
				nodeName: 'Slack',
				nodeType: 'n8n-nodes-base.slack',
				operation: 'sendAndWait',
				expectedInDescription: 'slack',
			},
		])(
			'should detect sub-workflow with $nodeName HITL node using $operation operation',
			async ({ nodeName, nodeType, operation, expectedInDescription }) => {
				const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
					createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
					createNode(nodeName, nodeType, { operation }),
					createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				]);

				const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

				expect(result.isAffected).toBe(true);
				expect(result.issues).toHaveLength(1);
				expect(result.issues[0].description).toContain(expectedInDescription);
				expect(result.issues[0].nodeId).toBeDefined();
				expect(result.issues[0].nodeName).toBe(nodeName);
			},
		);

		it.each([
			{
				nodeName: 'Slack',
				nodeType: 'n8n-nodes-base.slack',
				nonWaitingOperation: 'sendMessage',
			},
			{
				nodeName: 'Telegram',
				nodeType: 'n8n-nodes-base.telegram',
				nonWaitingOperation: 'sendMessage',
			},
			{
				nodeName: 'GitHub',
				nodeType: 'n8n-nodes-base.github',
				nonWaitingOperation: 'getIssue',
			},
		])(
			'should NOT detect sub-workflow with $nodeName node without $waitingOperation operation',
			async ({ nodeName, nodeType, nonWaitingOperation }) => {
				const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
					createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
					createNode(nodeName, nodeType, { operation: nonWaitingOperation }),
					createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				]);

				const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

				expect(result.isAffected).toBe(false);
				expect(result.issues).toHaveLength(0);
			},
		);

		it('should detect sub-workflow with multiple HITL node types', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
				createNode('Form', 'n8n-nodes-base.form'),
				createNode('Slack', 'n8n-nodes-base.slack', { operation: 'sendAndWait' }),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(3);
			expect(result.issues[0].description).toContain('wait');
			expect(result.issues[0].nodeId).toBeDefined();
			expect(result.issues[0].nodeName).toBe('Wait');
			expect(result.issues[1].description).toContain('form');
			expect(result.issues[1].nodeId).toBeDefined();
			expect(result.issues[1].nodeName).toBe('Form');
			expect(result.issues[2].description).toContain('slack');
			expect(result.issues[2].nodeId).toBeDefined();
			expect(result.issues[2].nodeName).toBe('Slack');
		});

		it.each([
			{ nodeName: 'Telegram', nodeType: 'n8n-nodes-base.telegram', operation: 'sendAndWait' },
			{ nodeName: 'EmailSend', nodeType: 'n8n-nodes-base.emailSend', operation: 'sendAndWait' },
			{
				nodeName: 'MicrosoftTeams',
				nodeType: 'n8n-nodes-base.microsoftTeams',
				operation: 'sendAndWait',
			},
			{
				nodeName: 'MicrosoftOutlook',
				nodeType: 'n8n-nodes-base.microsoftOutlook',
				operation: 'sendAndWait',
			},
			{ nodeName: 'Discord', nodeType: 'n8n-nodes-base.discord', operation: 'sendAndWait' },
			{ nodeName: 'GitHub', nodeType: 'n8n-nodes-base.github', operation: 'dispatchAndWait' },
		])(
			'should detect sub-workflow with $nodeName HITL node using $operation',
			async ({ nodeName, nodeType, operation }) => {
				const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
					createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
					createNode(nodeName, nodeType, { operation }),
				]);

				const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

				expect(result.isAffected).toBe(true);
				expect(result.issues).toHaveLength(1);
				expect(result.issues[0].nodeId).toBeDefined();
				expect(result.issues[0].nodeName).toBe(nodeName);
			},
		);
	});
});
