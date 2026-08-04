import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { ExecuteWorkflowSourceModesRule } from '../execute-workflow-source-modes.rule';

describe('ExecuteWorkflowSourceModesRule', () => {
	let rule: ExecuteWorkflowSourceModesRule;

	beforeEach(() => {
		rule = new ExecuteWorkflowSourceModesRule();
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

		it('should not be affected when Execute Workflow node uses the "database" source', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('SubWF', 'n8n-nodes-base.executeWorkflow', { source: 'database' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when Execute Workflow node uses the "parameter" source', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('SubWF', 'n8n-nodes-base.executeWorkflow', { source: 'parameter' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when source is unset (defaults to "database")', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('SubWF', 'n8n-nodes-base.executeWorkflow'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should detect Execute Workflow node using the "localFile" source', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('SubWF', 'n8n-nodes-base.executeWorkflow', { source: 'localFile' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toContain('SubWF');
			expect(result.issues[0].title).toContain('Local File');
			expect(result.issues[0].level).toBe('error');
			expect(result.issues[0].nodeName).toBe('SubWF');
		});

		it('should detect Execute Workflow node using the "url" source', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('SubWF', 'n8n-nodes-base.executeWorkflow', { source: 'url' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toContain('URL');
			expect(result.issues[0].level).toBe('error');
		});

		it('should flag only the removed-source nodes when multiple Execute Workflow nodes exist', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('LocalOne', 'n8n-nodes-base.executeWorkflow', { source: 'localFile' }),
				createNode('UrlOne', 'n8n-nodes-base.executeWorkflow', { source: 'url' }),
				createNode('DbOne', 'n8n-nodes-base.executeWorkflow', { source: 'database' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);
			expect(result.issues.map((issue) => issue.nodeName)).toEqual(['LocalOne', 'UrlOne']);
		});
	});

	describe('getRecommendations()', () => {
		it('should recommend the database source and node-defined JSON', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(2);
			expect(recommendations[0].action).toContain('Database');
			expect(recommendations[1].action).toContain('workflow JSON');
		});
	});
});
