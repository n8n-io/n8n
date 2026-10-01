import { UnexpectedError } from 'n8n-workflow';

import type { PolicyDecision } from '../policy-check';
import { assertClearedFor, type PolicySubject } from '../policy-cleared';
import { mintPolicyCleared } from '../policy-mint';

const subject: PolicySubject = { type: 'workflow', id: 'wf-1' };
const cleared: PolicyDecision = { violations: [] };

describe('assertClearedFor', () => {
	it('throws when there is no clearance token', () => {
		expect(() => assertClearedFor(undefined, 'workflowSave', subject)).toThrow(UnexpectedError);
	});

	it('throws when the token cleared a different point', () => {
		const token = mintPolicyCleared({ point: 'workflowStart', subject, decision: cleared });

		expect(() => assertClearedFor(token, 'workflowSave', subject)).toThrow(UnexpectedError);
	});

	it('throws when the token cleared a different subject id', () => {
		const token = mintPolicyCleared({ point: 'workflowSave', subject, decision: cleared });

		expect(() => assertClearedFor(token, 'workflowSave', { type: 'workflow', id: 'wf-2' })).toThrow(
			UnexpectedError,
		);
	});

	it('throws when the token cleared a different subject type', () => {
		const token = mintPolicyCleared({
			point: 'workflowSave',
			subject: { type: 'credential', id: 'wf-1' },
			decision: cleared,
		});

		expect(() => assertClearedFor(token, 'workflowSave', subject)).toThrow(UnexpectedError);
	});

	it('throws on an object that was never minted (missing brand)', () => {
		const forged = { point: 'workflowSave', subject, decision: cleared, policyVersions: [] };

		expect(() => assertClearedFor(forged as never, 'workflowSave', subject)).toThrow(
			UnexpectedError,
		);
	});

	it('does not throw when point and subject both match', () => {
		const token = mintPolicyCleared({ point: 'workflowSave', subject, decision: cleared });

		expect(() => assertClearedFor(token, 'workflowSave', subject)).not.toThrow();
	});
});
