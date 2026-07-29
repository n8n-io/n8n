import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { ExecuteWorkflowEachModeRule } from '../execute-workflow-each-mode.rule';

describe('ExecuteWorkflowEachModeRule', () => {
	let rule: ExecuteWorkflowEachModeRule;

	beforeEach(() => {
		rule = new ExecuteWorkflowEachModeRule();
	});

	describe('detectWorkflow()', () => {
		it('should not be affected when there is no Execute Workflow node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when Execute Workflow node uses "once" mode', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('SubWF', 'n8n-nodes-base.executeWorkflow', { mode: 'once' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when mode is unset (defaults to "once")', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('SubWF', 'n8n-nodes-base.executeWorkflow'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should detect Execute Workflow node using "each" mode', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('SubWF', 'n8n-nodes-base.executeWorkflow', { mode: 'each' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toContain('SubWF');
			expect(result.issues[0].title).toContain('Run once for each item');
			expect(result.issues[0].level).toBe('error');
			expect(result.issues[0].nodeName).toBe('SubWF');
		});

		it('should flag only the "each" mode nodes when multiple Execute Workflow nodes exist', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('EachOne', 'n8n-nodes-base.executeWorkflow', { mode: 'each' }),
				createNode('OnceOne', 'n8n-nodes-base.executeWorkflow', { mode: 'once' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('EachOne');
		});
	});

	describe('getRecommendations()', () => {
		it('should recommend replacing with a Loop Over Items node', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].action).toContain('Loop Over Items');
		});
	});
});
