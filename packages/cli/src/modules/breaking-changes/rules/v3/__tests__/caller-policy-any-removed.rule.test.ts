import type { WorkflowEntity } from '@n8n/db';

import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { CallerPolicyAnyRemovedRule } from '../caller-policy-any-removed.rule';

const workflowWithSettings = (settings: WorkflowEntity['settings']) => {
	const created = createWorkflow('wf-1', 'Test Workflow', [
		createNode('When Executed by Another Workflow', 'n8n-nodes-base.executeWorkflowTrigger'),
	]);
	created.workflow.settings = settings;
	return created;
};

// Cast: v3 drops 'any' from CallerPolicy, but the value is still in the database, which is
// exactly what this rule looks for.
const callerPolicy = (policy: string) => ({ callerPolicy: policy }) as WorkflowEntity['settings'];

describe('CallerPolicyAnyRemovedRule', () => {
	let rule: CallerPolicyAnyRemovedRule;

	beforeEach(() => {
		rule = new CallerPolicyAnyRemovedRule();
	});

	describe('detectWorkflow()', () => {
		it('should detect a workflow whose caller policy is "any"', async () => {
			const { workflow, nodesGroupedByType } = workflowWithSettings(callerPolicy('any'));

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toContain('Any workflow');
			expect(result.issues[0].level).toBe('error');
		});

		it.each(['none', 'workflowsFromAList', 'workflowsFromSameOwner'])(
			'should not be affected when the caller policy is "%s"',
			async (policy) => {
				const { workflow, nodesGroupedByType } = workflowWithSettings(callerPolicy(policy));

				const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

				expect(result.isAffected).toBe(false);
				expect(result.issues).toHaveLength(0);
			},
		);

		it('should not be affected when the caller policy is unset', async () => {
			const { workflow, nodesGroupedByType } = workflowWithSettings({ executionOrder: 'v1' });

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when the workflow has no settings at all', async () => {
			const { workflow, nodesGroupedByType } = workflowWithSettings(undefined);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});
	});

	describe('getRecommendations()', () => {
		it('should recommend picking a new policy per workflow', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].action).toContain('caller policy');
		});
	});
});
