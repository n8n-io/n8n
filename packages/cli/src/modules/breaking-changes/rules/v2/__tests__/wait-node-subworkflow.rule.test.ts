import type { INode } from 'n8n-workflow';

import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { BreakingChangeCategory } from '../../../types';
import { WaitNodeSubworkflowRule } from '../wait-node-subworkflow.rule';

class TestRule extends WaitNodeSubworkflowRule {
	testExtractCalledWorkflowId(node: INode, callerWorkflowId: string): string | undefined {
		return super.extractCalledWorkflowId(node, callerWorkflowId);
	}
}

describe('WaitNodeSubworkflowRule', () => {
	let rule: TestRule;

	beforeEach(() => {
		jest.clearAllMocks();
		rule = new TestRule();
		rule.reset();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toMatchObject({
				version: 'v2',
				title: 'Sub-workflow waiting node output behavior change',
				description: expect.stringContaining('Parent workflows calling sub-workflows'),
				category: BreakingChangeCategory.workflow,
				severity: 'medium',
			});
		});
	});

	describe('getRecommendations()', () => {
		it('should return recommendations', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(2);
			expect(recommendations[0].action).toBe('Review Execute Workflow node outputs');
			expect(recommendations[1].action).toBe('Test affected parent workflows');
		});
	});

	describe('batch workflow detection', () => {
		it('should flag parent workflow when it calls a sub-workflow with waiting nodes', async () => {
			// Create a sub-workflow with waiting nodes
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			// Create a parent workflow that calls the sub-workflow
			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('Start', 'n8n-nodes-base.manualTrigger'),
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
				}),
			]);

			// Collect data from both workflows
			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);

			// Produce report
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(1);
			expect(report.affectedWorkflows[0].workflowId).toBe('parent-wf-1');
			expect(report.affectedWorkflows[0].issues).toHaveLength(1);
			expect(report.affectedWorkflows[0].issues[0].nodeName).toBe('ExecuteWorkflow');
			expect(report.affectedWorkflows[0].issues[0].description).toContain('sub-wf-1');
		});

		it('should NOT flag sub-workflow itself', async () => {
			// Create a sub-workflow with waiting nodes (no parent calling it)
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);

			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			// Sub-workflow should NOT be in the affected list - only parents should be flagged
			expect(report.affectedWorkflows).toHaveLength(0);
		});

		it('should NOT flag parent when waitForSubWorkflow is false', async () => {
			// Create a sub-workflow with waiting nodes
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);

			// Create a parent workflow that does NOT wait for sub-workflow completion
			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('Start', 'n8n-nodes-base.manualTrigger'),
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
					options: { waitForSubWorkflow: false },
				}),
			]);

			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(0);
		});

		it('should flag parent when waitForSubWorkflow is true (explicit)', async () => {
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);

			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
					options: { waitForSubWorkflow: true },
				}),
			]);

			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(1);
			expect(report.affectedWorkflows[0].workflowId).toBe('parent-wf-1');
		});

		it('should flag parent when waitForSubWorkflow is not set (defaults to true)', async () => {
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);

			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
					// No options set - waitForSubWorkflow defaults to true
				}),
			]);

			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(1);
		});

		it('should flag parent when waitForSubWorkflow is an expression (treated as true)', async () => {
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);

			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
					options: { waitForSubWorkflow: '={{ $json.shouldWait }}' },
				}),
			]);

			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			// Expression is treated as true to avoid false negatives
			expect(report.affectedWorkflows).toHaveLength(1);
			expect(report.affectedWorkflows[0].workflowId).toBe('parent-wf-1');
		});

		it('should NOT flag parent when sub-workflow has no waiting nodes', async () => {
			// Create a sub-workflow WITHOUT waiting nodes
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
				}),
			]);

			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(0);
		});

		it('should NOT flag parent when sub-workflow has waiting nodes but no ExecuteWorkflowTrigger', async () => {
			// A workflow with waiting nodes but NOT a sub-workflow (no trigger)
			const regularWorkflow = createWorkflow('regular-wf', 'Regular Workflow', [
				createNode('ManualTrigger', 'n8n-nodes-base.manualTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);

			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'regular-wf' },
				}),
			]);

			await rule.collectWorkflowData(regularWorkflow.workflow, regularWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(0);
		});

		it('should handle workflowId as string', async () => {
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);

			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: 'sub-wf-1', // String instead of object
				}),
			]);

			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(1);
		});

		it('should flag when workflowId is an expression (dynamic call)', async () => {
			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: '={{ $json.workflowId }}', // Expression - can't evaluate statically
				}),
			]);

			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			// Should flag with "may call" warning since we can't determine the workflow ID
			expect(report.affectedWorkflows).toHaveLength(1);
			expect(report.affectedWorkflows[0].workflowId).toBe('parent-wf-1');
			expect(report.affectedWorkflows[0].issues[0].title).toContain('may call');
			expect(report.affectedWorkflows[0].issues[0].description).toContain('dynamically');
		});

		it('should flag when source is not database (dynamic call)', async () => {
			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'parameter', // JSON parameter source
					workflowJson: '{}',
				}),
			]);

			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			// Should flag with "may call" warning since we can't determine the workflow ID
			expect(report.affectedWorkflows).toHaveLength(1);
			expect(report.affectedWorkflows[0].workflowId).toBe('parent-wf-1');
			expect(report.affectedWorkflows[0].issues[0].title).toContain('may call');
		});

		it('should flag parent when sub-workflow has Form node', async () => {
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Form', 'n8n-nodes-base.form'),
			]);

			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
				}),
			]);

			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(1);
		});

		it('should flag parent when sub-workflow has HITL node with sendAndWait operation', async () => {
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Slack', 'n8n-nodes-base.slack', { operation: 'sendAndWait' }),
			]);

			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
				}),
			]);

			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(1);
		});

		it('should NOT flag when HITL node does not use waiting operation', async () => {
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Slack', 'n8n-nodes-base.slack', { operation: 'sendMessage' }), // Not sendAndWait
			]);

			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
				}),
			]);

			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(0);
		});

		it('should flag parent calling multiple affected sub-workflows', async () => {
			const subWorkflow1 = createWorkflow('sub-wf-1', 'Sub Workflow 1', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);

			const subWorkflow2 = createWorkflow('sub-wf-2', 'Sub Workflow 2', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Form', 'n8n-nodes-base.form'),
			]);

			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow1', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
				}),
				createNode('ExecuteWorkflow2', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-2' },
				}),
			]);

			await rule.collectWorkflowData(subWorkflow1.workflow, subWorkflow1.nodesGroupedByType);
			await rule.collectWorkflowData(subWorkflow2.workflow, subWorkflow2.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(1);
			expect(report.affectedWorkflows[0].workflowId).toBe('parent-wf-1');
			expect(report.affectedWorkflows[0].issues).toHaveLength(2);
		});

		it('should flag multiple parents calling the same affected sub-workflow', async () => {
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);

			const parentWorkflow1 = createWorkflow('parent-wf-1', 'Parent Workflow 1', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
				}),
			]);

			const parentWorkflow2 = createWorkflow('parent-wf-2', 'Parent Workflow 2', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
				}),
			]);

			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow1.workflow, parentWorkflow1.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow2.workflow, parentWorkflow2.nodesGroupedByType);
			const report = await rule.produceReport();

			expect(report.affectedWorkflows).toHaveLength(2);
			const workflowIds = report.affectedWorkflows.map((w) => w.workflowId);
			expect(workflowIds).toContain('parent-wf-1');
			expect(workflowIds).toContain('parent-wf-2');
		});

		it('should reset state correctly', async () => {
			const subWorkflow = createWorkflow('sub-wf-1', 'Sub Workflow', [
				createNode('ExecuteWorkflowTrigger', 'n8n-nodes-base.executeWorkflowTrigger'),
				createNode('Wait', 'n8n-nodes-base.wait'),
			]);

			const parentWorkflow = createWorkflow('parent-wf-1', 'Parent Workflow', [
				createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
					source: 'database',
					workflowId: { value: 'sub-wf-1' },
				}),
			]);

			// First run
			await rule.collectWorkflowData(subWorkflow.workflow, subWorkflow.nodesGroupedByType);
			await rule.collectWorkflowData(parentWorkflow.workflow, parentWorkflow.nodesGroupedByType);
			const report1 = await rule.produceReport();
			expect(report1.affectedWorkflows).toHaveLength(1);

			// Reset
			rule.reset();

			// Second run should be empty without collecting data again
			const report2 = await rule.produceReport();
			expect(report2.affectedWorkflows).toHaveLength(0);
		});
	});

	describe('extractCalledWorkflowId()', () => {
		it('should extract the called workflow ID', () => {
			const node = createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
				source: 'database',
				workflowId: { value: 'sub-wf-1' },
			});

			const calledWorkflowId = rule.testExtractCalledWorkflowId(node, 'caller-wf-1');
			expect(calledWorkflowId).toBe('sub-wf-1');
		});

		it('should return the caller workflow ID if it is an expression', () => {
			const node = createNode('ExecuteWorkflow', 'n8n-nodes-base.executeWorkflow', {
				workflowId: '={{ $workflow.id }}',
				mode: 'each',
				options: {},
			});

			const calledWorkflowId = rule.testExtractCalledWorkflowId(node, 'caller-wf-1');
			expect(calledWorkflowId).toBe('caller-wf-1');
		});
	});
});
