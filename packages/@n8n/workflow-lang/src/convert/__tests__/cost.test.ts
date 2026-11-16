/**
 * The cost gate of converted workflows: a run must not execute more instructions or
 * allocate more than the record. After a change that lowers a cost, or that adds a case,
 * write the record again with `node scripts/convert-cost.ts --write`.
 */
import { describe, expect, it } from 'vitest';

import { CONVERT_COST } from './cost.generated.ts';
import { measureCosts } from './cost-cases.ts';

describe('cost of converted workflows', () => {
	const costs = measureCosts();

	it('has a record for each case, and no other', () => {
		expect(Object.keys(costs).sort()).toEqual(Object.keys(CONVERT_COST).sort());
	});

	it('has the 36 corpus workflows and the converted workflows', () => {
		const names = Object.keys(costs);
		expect(names.filter((name) => name.startsWith('corpus/')).length).toBeGreaterThanOrEqual(36);
		expect(names.filter((name) => name.startsWith('convert/')).length).toBeGreaterThanOrEqual(30);
	});

	it('does not run more instructions or allocate more than the record', () => {
		const risen: string[] = [];
		for (const [name, [ops, allocations]] of Object.entries(costs)) {
			const [recordOps, recordAllocations] = CONVERT_COST[name] ?? [0, 0];
			if (ops > recordOps || allocations > recordAllocations) {
				risen.push(
					`${name}: instructions ${recordOps} -> ${ops}, allocations ${recordAllocations} -> ${allocations}`,
				);
			}
		}
		expect(risen).toEqual([]);
	});
});
