import { describe, it, expect } from 'vitest';

import { CANNED_METRICS } from './evaluation.constants';
import { getVisibleChecks } from './checkFilters';

describe('getVisibleChecks', () => {
	it('excludes toolsUsed when sliceCanHaveTools is false', () => {
		const visible = getVisibleChecks(CANNED_METRICS, { sliceCanHaveTools: false });
		expect(visible.map((m) => m.key)).not.toContain('toolsUsed');
	});

	it('includes all other four checks when sliceCanHaveTools is false', () => {
		const visible = getVisibleChecks(CANNED_METRICS, { sliceCanHaveTools: false });
		expect(visible.map((m) => m.key)).toContain('correctness');
		expect(visible.map((m) => m.key)).toContain('helpfulness');
		expect(visible.map((m) => m.key)).toContain('stringSimilarity');
		expect(visible.map((m) => m.key)).toContain('categorization');
		expect(visible).toHaveLength(CANNED_METRICS.length - 1);
	});

	it('includes all five checks when sliceCanHaveTools is true', () => {
		const visible = getVisibleChecks(CANNED_METRICS, { sliceCanHaveTools: true });
		expect(visible.map((m) => m.key)).toContain('toolsUsed');
		expect(visible).toHaveLength(CANNED_METRICS.length);
	});

	it('never removes correctness, helpfulness, stringSimilarity, or categorization regardless of context', () => {
		const ctx = { sliceCanHaveTools: false };
		const visible = getVisibleChecks(CANNED_METRICS, ctx);
		const keys = visible.map((m) => m.key);
		expect(keys).toContain('correctness');
		expect(keys).toContain('helpfulness');
		expect(keys).toContain('stringSimilarity');
		expect(keys).toContain('categorization');
	});
});
