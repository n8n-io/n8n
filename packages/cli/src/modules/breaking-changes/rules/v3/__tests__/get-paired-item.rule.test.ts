import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { GetPairedItemRule } from '../get-paired-item.rule';

describe('GetPairedItemRule', () => {
	let rule: GetPairedItemRule;

	beforeEach(() => {
		rule = new GetPairedItemRule();
	});

	describe('detectWorkflow()', () => {
		it('should not be affected when no node uses $getPairedItem', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Set', 'n8n-nodes-base.set', { value: '={{ $json.name }}' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should detect $getPairedItem in an expression', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Set', 'n8n-nodes-base.set', {
					value: "={{ $getPairedItem('Node', $input.item) }}",
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toContain('Set');
			expect(result.issues[0].level).toBe('error');
			expect(result.issues[0].nodeName).toBe('Set');
		});

		it('should detect $getPairedItem in nested parameters', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest', {
					options: { headers: { value: '={{ $getPairedItem("Webhook").json.id }}' } },
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
		});

		it('should flag each affected node once', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Set1', 'n8n-nodes-base.set', { value: '={{ $getPairedItem("A") }}' }),
				createNode('Set2', 'n8n-nodes-base.set', { value: '={{ $json.ok }}' }),
				createNode('Set3', 'n8n-nodes-base.set', { value: '={{ $getPairedItem("B") }}' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);
			expect(result.issues.map((i) => i.nodeName)).toEqual(['Set1', 'Set3']);
		});
	});
});
