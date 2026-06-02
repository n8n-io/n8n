import { WorkflowEntity } from '@n8n/db';
import type { WorkflowSettings } from 'n8n-workflow';

import { dropRedactionPolicy, policyFromFloor, policyMeetsFloor } from '@/workflows/utils';

describe('policyFromFloor', () => {
	it('returns undefined when the floor is not enforced', () => {
		expect(policyFromFloor({ enforced: false, production: false, manual: false })).toBeUndefined();
		expect(policyFromFloor({ enforced: false, production: true, manual: true })).toBeUndefined();
	});

	it('returns undefined when nothing is required, even with enforcement on', () => {
		expect(policyFromFloor({ enforced: true, production: false, manual: false })).toBeUndefined();
	});

	it('returns non-manual for a production-only floor', () => {
		expect(policyFromFloor({ enforced: true, production: true, manual: false })).toBe('non-manual');
	});

	it('returns all when manual redaction is required', () => {
		expect(policyFromFloor({ enforced: true, production: true, manual: true })).toBe('all');
	});
});

describe('policyMeetsFloor', () => {
	const policies: WorkflowSettings.RedactionPolicy[] = ['none', 'manual-only', 'non-manual', 'all'];

	it('accepts any policy when the floor is not enforced', () => {
		for (const policy of policies) {
			expect(policyMeetsFloor(policy, { enforced: false, production: false, manual: false })).toBe(
				true,
			);
		}
	});

	describe('with a production-only floor', () => {
		it.each<[WorkflowSettings.RedactionPolicy, boolean]>([
			['none', false],
			['manual-only', false],
			['non-manual', true],
			['all', true],
		])('policy %s → %s', (policy, expected) => {
			expect(policyMeetsFloor(policy, { enforced: true, production: true, manual: false })).toBe(
				expected,
			);
		});
	});

	describe('with a production+manual floor', () => {
		it.each<[WorkflowSettings.RedactionPolicy, boolean]>([
			['none', false],
			['manual-only', false],
			['non-manual', false],
			['all', true],
		])('policy %s → %s', (policy, expected) => {
			expect(policyMeetsFloor(policy, { enforced: true, production: true, manual: true })).toBe(
				expected,
			);
		});
	});
});

describe('dropRedactionPolicy', () => {
	it('removes redactionPolicy when present', () => {
		const workflow = new WorkflowEntity();
		workflow.settings = { redactionPolicy: 'all', executionOrder: 'v1' };

		dropRedactionPolicy(workflow);

		expect(workflow.settings.redactionPolicy).toBeUndefined();
		expect(workflow.settings.executionOrder).toBe('v1');
	});

	it('is a no-op when settings has no redactionPolicy', () => {
		const workflow = new WorkflowEntity();
		workflow.settings = { executionOrder: 'v1' };

		dropRedactionPolicy(workflow);

		expect(workflow.settings).toEqual({ executionOrder: 'v1' });
	});

	it('is a no-op when settings is undefined', () => {
		const workflow = new WorkflowEntity();

		expect(() => dropRedactionPolicy(workflow)).not.toThrow();
		expect(workflow.settings).toBeUndefined();
	});
});
