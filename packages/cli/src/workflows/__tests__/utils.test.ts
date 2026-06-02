import { WorkflowEntity } from '@n8n/db';
import type { WorkflowSettings } from 'n8n-workflow';

import { clampPolicyToFloor, dropRedactionPolicy } from '@/workflows/utils';

describe('clampPolicyToFloor', () => {
	describe('when the floor is not enforced', () => {
		it.each<WorkflowSettings.RedactionPolicy | undefined>([
			undefined,
			'none',
			'manual-only',
			'non-manual',
			'all',
		])('returns %s unchanged', (policy) => {
			expect(
				clampPolicyToFloor(policy, { enforced: false, production: false, manual: false }),
			).toBe(policy);
		});
	});

	describe('when the floor requires production redaction only', () => {
		it.each<[WorkflowSettings.RedactionPolicy | undefined, WorkflowSettings.RedactionPolicy]>([
			[undefined, 'non-manual'],
			['none', 'non-manual'],
			['manual-only', 'all'],
			['non-manual', 'non-manual'],
			['all', 'all'],
		])('clamps %s → %s', (policy, expected) => {
			expect(clampPolicyToFloor(policy, { enforced: true, production: true, manual: false })).toBe(
				expected,
			);
		});
	});

	describe('when the floor requires production and manual redaction', () => {
		it.each<[WorkflowSettings.RedactionPolicy | undefined, WorkflowSettings.RedactionPolicy]>([
			[undefined, 'all'],
			['none', 'all'],
			['manual-only', 'all'],
			['non-manual', 'all'],
			['all', 'all'],
		])('clamps %s → %s', (policy, expected) => {
			expect(clampPolicyToFloor(policy, { enforced: true, production: true, manual: true })).toBe(
				expected,
			);
		});
	});

	it('returns input unchanged when the floor is enforced but requires nothing', () => {
		expect(
			clampPolicyToFloor(undefined, { enforced: true, production: false, manual: false }),
		).toBeUndefined();
		expect(
			clampPolicyToFloor('non-manual', { enforced: true, production: false, manual: false }),
		).toBe('non-manual');
	});

	it("collapses 'manual-only' input to 'all' (manual implies production)", () => {
		expect(
			clampPolicyToFloor('manual-only', { enforced: true, production: false, manual: false }),
		).toBe('all');
	});

	it("normalizes an impossible manual-without-production floor to 'all'", () => {
		expect(clampPolicyToFloor(undefined, { enforced: true, production: false, manual: true })).toBe(
			'all',
		);
		expect(clampPolicyToFloor('none', { enforced: true, production: false, manual: true })).toBe(
			'all',
		);
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
