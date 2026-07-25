import { describe, expect, it, vi } from 'vitest';

import { runBinaryChecks } from '../binaryChecks/index';
import type { WorkflowResponse } from '../clients/n8n-client';

vi.mock('../binaryChecks/checks/index', () => ({
	DETERMINISTIC_CHECKS: [
		{
			name: 'always_passes',
			description: 'passes',
			kind: 'deterministic',
			dimension: 'structure',
			run: () => ({ pass: true }),
		},
		{
			name: 'errors_out',
			description: 'reports a measurement failure',
			kind: 'deterministic',
			dimension: 'structure',
			run: () => ({ pass: false, errored: true, comment: 'timed out' }),
		},
		{
			name: 'crashes',
			description: 'throws',
			kind: 'deterministic',
			dimension: 'structure',
			run: () => {
				throw new Error('boom');
			},
		},
	],
	LLM_CHECKS: [],
}));

describe('runBinaryChecks · measurement errors', () => {
	it('maps errored results and crashed checks to status "error" and keeps them out of pass_rate', async () => {
		const { feedback, outcomes } = await runBinaryChecks({} as WorkflowResponse, {
			prompt: 'p',
		});

		const byName = new Map(outcomes.map((o) => [o.name, o]));
		expect(byName.get('always_passes')?.status).toBe('pass');
		expect(byName.get('errors_out')?.status).toBe('error');
		expect(byName.get('crashes')?.status).toBe('error');
		expect(byName.get('crashes')?.comment).toBe('Error: boom');

		const metricNames = feedback.filter((f) => f.kind === 'metric').map((f) => f.metric);
		expect(metricNames).toEqual(['always_passes']);

		const passRate = feedback.find((f) => f.metric === 'pass_rate');
		expect(passRate?.score).toBe(1);
		expect(passRate?.comment).toBe('1/1 checks passed (2 errored)');
	});
});
