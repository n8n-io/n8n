import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { AI_TRANSFORM_NODE_TYPE, AiTransformDeprecatedRule } from '../ai-transform-deprecated.rule';

describe('AiTransformDeprecatedRule', () => {
	let rule: AiTransformDeprecatedRule;

	beforeEach(() => {
		rule = new AiTransformDeprecatedRule();
	});

	describe('detectWorkflow()', () => {
		it('should not be affected when no AI Transform node is present', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Code', 'n8n-nodes-base.code', { jsCode: 'return items;' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should detect each AI Transform node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Transform A', AI_TRANSFORM_NODE_TYPE, { jsCode: 'return items;' }),
				createNode('Transform B', AI_TRANSFORM_NODE_TYPE, { jsCode: 'return [];' }),
				createNode('Set', 'n8n-nodes-base.set', {}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);
			expect(result.issues.map((i) => i.nodeName)).toEqual(['Transform A', 'Transform B']);
			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].nodeId).toBe('node-Transform A');
		});
	});
});
