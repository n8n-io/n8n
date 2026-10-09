import { describe, expect, it } from 'vitest';

import {
	evaluateMcpDiscoveryEligibility,
	MCP_DISCOVERY_DELAY_MS,
	type McpDiscoveryEligibilityInput,
} from '../eligibility';

const firstVisit = Date.UTC(2026, 9, 2, 12);
const eligible: McpDiscoveryEligibilityInput = {
	now: firstVisit + MCP_DISCOVERY_DELAY_MS,
	isTrial: true,
	firstLoginAt: firstVisit,
	assistantMutationAt: null,
	pickedClaude: true,
};

describe('MCP discovery eligibility', () => {
	it('qualifies at exactly 30 elapsed minutes without a role restriction', () => {
		expect(evaluateMcpDiscoveryEligibility(eligible)).toEqual({
			status: 'eligible',
			eligibleAt: eligible.now,
		});
	});

	it('waits until the deadline', () => {
		expect(evaluateMcpDiscoveryEligibility({ ...eligible, now: eligible.now - 1 })).toEqual({
			status: 'waiting',
			eligibleAt: eligible.now,
		});
	});

	it('qualifies on a later visit without resetting the clock', () => {
		expect(
			evaluateMcpDiscoveryEligibility({ ...eligible, now: firstVisit + 2 * 60 * 60 * 1000 }),
		).toEqual({ status: 'eligible', eligibleAt: eligible.now });
	});

	it.each([
		['assistantMutationAt', eligible.now, 'assistant'],
		['pickedClaude', false, 'client'],
	] as const)('excludes when %s is %s', (key, value, reason) => {
		expect(evaluateMcpDiscoveryEligibility({ ...eligible, [key]: value })).toEqual({
			status: 'excluded',
			reason,
		});
	});

	it('excludes an account that is not trialing', () => {
		expect(evaluateMcpDiscoveryEligibility({ ...eligible, isTrial: false })).toEqual({
			status: 'excluded',
			reason: 'trial',
		});
	});

	it.each(['isTrial', 'firstLoginAt', 'assistantMutationAt', 'pickedClaude'] as const)(
		'does not infer eligibility when %s is unknown',
		(key) => {
			expect(evaluateMcpDiscoveryEligibility({ ...eligible, [key]: undefined })).toEqual({
				status: 'unknown',
			});
		},
	);

	it('ignores an Assistant edit after the fixed deadline', () => {
		expect(
			evaluateMcpDiscoveryEligibility({
				...eligible,
				now: eligible.now + 60_000,
				assistantMutationAt: eligible.now + 1,
			}),
		).toEqual({ status: 'eligible', eligibleAt: eligible.now });
	});

	it.each([NaN, Infinity, -Infinity])('rejects invalid timestamps (%s)', (now) => {
		expect(evaluateMcpDiscoveryEligibility({ ...eligible, now })).toEqual({ status: 'unknown' });
	});
});
