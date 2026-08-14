import type { RedactionFloor } from '@n8n/api-types';
import type { WorkflowSettings } from 'n8n-workflow';

import { policyForFloor, policyMeetsFloor } from '../redaction-policy';

type Policy = WorkflowSettings.RedactionPolicy;

describe('policyMeetsFloor', () => {
	// Exhaustive: every policy × every floor. Single source of truth for the matrix.
	const CASES: Array<[RedactionFloor, Policy, boolean]> = [
		['off', 'none', true],
		['off', 'manual-only', true],
		['off', 'non-manual', true],
		['off', 'all', true],

		['production', 'none', false],
		['production', 'manual-only', false],
		['production', 'non-manual', true],
		['production', 'all', true],

		['all', 'none', false],
		['all', 'manual-only', false],
		['all', 'non-manual', false],
		['all', 'all', true],
	];

	it.each(CASES)('floor=%s, policy=%s → %s', (floor, policy, expected) => {
		expect(policyMeetsFloor(policy, floor)).toBe(expected);
	});
});

describe('policyForFloor', () => {
	it.each<[RedactionFloor, Policy | undefined]>([
		['off', undefined],
		['production', 'non-manual'],
		['all', 'all'],
	])('floor=%s seeds %s', (floor, expected) => {
		expect(policyForFloor(floor)).toBe(expected);
	});

	// Invariant: a seeded policy always satisfies its own floor.
	it.each<RedactionFloor>(['production', 'all'])('seed for floor=%s meets that floor', (floor) => {
		const seed = policyForFloor(floor);
		expect(seed).toBeDefined();
		expect(policyMeetsFloor(seed as Policy, floor)).toBe(true);
	});
});
