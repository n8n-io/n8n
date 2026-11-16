import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { EvaluateExpressionCodeNodeRule } from '../evaluate-expression-code-node.rule';

describe('EvaluateExpressionCodeNodeRule', () => {
	let rule: EvaluateExpressionCodeNodeRule;

	beforeEach(() => {
		rule = new EvaluateExpressionCodeNodeRule();
	});

	describe('detectWorkflow()', () => {
		it('should detect a Code node that calls $evaluateExpression', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Code', 'n8n-nodes-base.code', {
					jsCode:
						"const value = $evaluateExpression('{{ $json.name }}', 0);\nreturn [{ json: { value } }];",
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toContain('Code');
			expect(result.issues[0].level).toBe('error');
			expect(result.issues[0].nodeId).toBe('node-Code');
		});

		it('should not be affected by a Code node that does not call $evaluateExpression', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Code', 'n8n-nodes-base.code', { jsCode: 'return $input.all();' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should detect a v2 Code node that uses the default language', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...createNode('Code', 'n8n-nodes-base.code', {
						jsCode: "return [{ json: { value: $evaluateExpression('{{ $json.name }}', 0) } }];",
					}),
					typeVersion: 2,
				},
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
		});

		it('should not be affected by a Python Code node that keeps old JavaScript code', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...createNode('Code', 'n8n-nodes-base.code', {
						language: 'pythonNative',
						jsCode: "return [{ json: { value: $evaluateExpression('{{ $json.name }}', 0) } }];",
						pythonCode: 'return _items',
					}),
					typeVersion: 2,
				},
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
		});

		it('should not be affected by $evaluateExpression in an expression field of another node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Set', 'n8n-nodes-base.set', {
					value: "={{ $evaluateExpression('{{ $json.name }}') }}",
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
		});
	});
});
