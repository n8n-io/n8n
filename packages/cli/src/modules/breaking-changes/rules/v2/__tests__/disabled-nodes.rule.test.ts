import { DisabledNodesRule } from '../disabled-nodes.rule';
import { createNode, createWorkflow } from './test-helpers';

describe('DisabledNodesRule', () => {
	let rule: DisabledNodesRule;

	beforeEach(() => {
		rule = new DisabledNodesRule();
	});

	describe('detectWorkflow()', () => {
		it('should not be affected when no disabled nodes are found', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should detect ExecuteCommand node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Execute', 'n8n-nodes-base.executeCommand'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toContain('Execute');
			expect(result.issues[0].title).toContain('will be disabled');
		});

		it('should detect LocalFileTrigger node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('FileTrigger', 'n8n-nodes-base.localFileTrigger'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
		});
	});
});
