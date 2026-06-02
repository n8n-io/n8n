import type { RedactionEnforcementSettings } from '@n8n/api-types';
import { WorkflowEntity } from '@n8n/db';
import type { WorkflowSettings } from 'n8n-workflow';

import { dropRedactionPolicy, policyFromFloor, policyMeetsFloor } from '@/workflows/utils';

const floor = (
	enforced: boolean,
	production = false,
	manual = false,
): RedactionEnforcementSettings => ({ enforced, production, manual });

describe('policyFromFloor', () => {
	it('returns undefined when the floor is not enforced', () => {
		expect(policyFromFloor(floor(false))).toBeUndefined();
		expect(policyFromFloor(floor(false, true, true))).toBeUndefined();
	});

	it('returns undefined when nothing is required, even with enforcement on', () => {
		expect(policyFromFloor(floor(true, false, false))).toBeUndefined();
	});

	it('returns non-manual for a production-only floor', () => {
		expect(policyFromFloor(floor(true, true, false))).toBe('non-manual');
	});

	it('returns all when manual redaction is required', () => {
		expect(policyFromFloor(floor(true, true, true))).toBe('all');
	});
});

describe('policyMeetsFloor', () => {
	const policies: WorkflowSettings.RedactionPolicy[] = ['none', 'manual-only', 'non-manual', 'all'];

	it('accepts any policy when the floor is not enforced', () => {
		for (const policy of policies) {
			expect(policyMeetsFloor(policy, floor(false))).toBe(true);
		}
	});

	describe('with a production-only floor', () => {
		const productionFloor = floor(true, true, false);

		it.each<[WorkflowSettings.RedactionPolicy, boolean]>([
			['none', false],
			['manual-only', false],
			['non-manual', true],
			['all', true],
		])('policy %s → %s', (policy, expected) => {
			expect(policyMeetsFloor(policy, productionFloor)).toBe(expected);
		});
	});

	describe('with a production+manual floor', () => {
		const allFloor = floor(true, true, true);

		it.each<[WorkflowSettings.RedactionPolicy, boolean]>([
			['none', false],
			['manual-only', false],
			['non-manual', false],
			['all', true],
		])('policy %s → %s', (policy, expected) => {
			expect(policyMeetsFloor(policy, allFloor)).toBe(expected);
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
