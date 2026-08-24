import { toNodeTypeViolation } from '../policy-violation';

describe('toNodeTypeViolation', () => {
	it('builds a violation for a deny verdict decided by an explicit rule', () => {
		const violation = toNodeTypeViolation(
			{ action: 'deny', matchedRuleId: 'rule-1' },
			'n8n-nodes-base.executeCommand',
			'instance',
		);

		expect(violation).toEqual({
			kind: 'node-type-unavailable',
			checkId: 'node-type-availability',
			message: 'n8n-nodes-base.executeCommand is not available in this instance',
			subject: 'n8n-nodes-base.executeCommand',
			subjectType: 'node-type',
			scope: 'instance',
			matchedRuleId: 'rule-1',
		});
	});

	it('narrows a null matchedRuleId to undefined for a default-action deny', () => {
		const violation = toNodeTypeViolation(
			{ action: 'deny', matchedRuleId: null },
			'n8n-nodes-base.executeCommand',
			'project',
		);

		expect(violation?.matchedRuleId).toBeUndefined();
	});

	it.each(['allow', 'delegate'] as const)('returns null for a %s verdict', (action) => {
		const violation = toNodeTypeViolation(
			{ action, matchedRuleId: null },
			'n8n-nodes-base.slack',
			'instance',
		);

		expect(violation).toBeNull();
	});
});
