import { UnexpectedError } from 'n8n-workflow';

import type { PolicyDecision } from '../policy-check';
import type { PolicyCleared, PolicySubject } from '../policy-cleared';
import { mintPolicyCleared } from '../policy-mint';

const subject: PolicySubject = { type: 'workflow', id: 'wf-1' };

const cleared: PolicyDecision = { violations: [] };

describe('mintPolicyCleared', () => {
	it('binds the token to the point, the subject and the decision', () => {
		const decision: PolicyDecision = {
			violations: [],
			policyVersions: [{ scope: 'instance', version: 3 }],
		};

		const token = mintPolicyCleared({ point: 'workflowSave', subject, decision });

		expect(token.point).toBe('workflowSave');
		expect(token.subject).toBe(subject);
		expect(token.decision).toBe(decision);
		expect(token.policyVersions).toEqual([{ scope: 'instance', version: 3 }]);
	});

	it('exposes an empty version list when the decision read no policy', () => {
		const token = mintPolicyCleared({ point: 'workflowStart', subject, decision: cleared });

		expect(token.policyVersions).toEqual([]);
	});

	it('refuses to clear a decision that has violations', () => {
		const decision: PolicyDecision = {
			violations: [
				{ kind: 'node-type-unavailable', checkId: 'node-type-availability', message: 'blocked' },
			],
		};

		expect(() => mintPolicyCleared({ point: 'workflowSave', subject, decision })).toThrow(
			UnexpectedError,
		);
	});

	it('refuses to clear when a check never ran', () => {
		const decision: PolicyDecision = {
			violations: [],
			checkErrors: [{ checkId: 'node-type-availability', correlationId: 'abc123' }],
		};

		expect(() => mintPolicyCleared({ point: 'workflowStart', subject, decision })).toThrow(
			UnexpectedError,
		);
	});

	describe('brand', () => {
		it('does not accept a token minted for another point', () => {
			const saveToken = mintPolicyCleared({ point: 'workflowSave', subject, decision: cleared });
			const takesStartToken = (token: PolicyCleared<'workflowStart'>) => token.point;

			// @ts-expect-error the point is part of the type — a save token is not a start token
			expect(takesStartToken(saveToken)).toBe('workflowSave');
		});

		it('cannot be hand-built outside this module', () => {
			const forge = (): PolicyCleared<'workflowSave'> =>
				// @ts-expect-error the brand symbol is module-private, so this shape is unbuildable
				({ point: 'workflowSave', subject, decision: cleared, policyVersions: [] });

			expect(forge().point).toBe('workflowSave');
		});
	});

	describe('subject', () => {
		it('rejects a kind outside the union', () => {
			// @ts-expect-error a typo'd kind would bind to nothing and silently never match
			const typo: PolicySubject = { type: 'wokflow', id: 'wf-1' };

			expect(typo.id).toBe('wf-1');
		});
	});
});
