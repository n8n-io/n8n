import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { CallerPolicyDefaultAnyRule } from '../caller-policy-default-any.rule';

const ruleWithDefaultPolicy = (callerPolicyDefaultOption: string) =>
	new CallerPolicyDefaultAnyRule(
		mock<GlobalConfig>({ workflows: { callerPolicyDefaultOption } } as never),
	);

describe('CallerPolicyDefaultAnyRule', () => {
	describe('detect()', () => {
		it('should be affected when the instance default is "any"', async () => {
			const result = await ruleWithDefaultPolicy('any').detect();

			expect(result.isAffected).toBe(true);
			expect(result.instanceIssues).toHaveLength(1);
			expect(result.instanceIssues[0].title).toContain('N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION');
			expect(result.recommendations).toHaveLength(2);
			// Changing the variable does not cover workflows that store `any` themselves.
			expect(result.recommendations[1].action).toContain('workflow issues');
		});

		it.each(['none', 'workflowsFromAList', 'workflowsFromSameOwner'])(
			'should not be affected when the instance default is "%s"',
			async (policy) => {
				const result = await ruleWithDefaultPolicy(policy).detect();

				expect(result.isAffected).toBe(false);
				expect(result.instanceIssues).toHaveLength(0);
				expect(result.recommendations).toHaveLength(0);
			},
		);
	});

	describe('getMetadata()', () => {
		it('should report as an instance-level change', () => {
			const metadata = ruleWithDefaultPolicy('any').getMetadata();

			expect(metadata.version).toBe('v3');
			expect(metadata.category).toBe('instance');
			expect(metadata.severity).toBe('medium');
		});
	});
});
