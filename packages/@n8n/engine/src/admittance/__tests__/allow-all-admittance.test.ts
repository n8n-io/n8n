import { describe, expect, it } from 'vitest';

import { AllowAllAdmittance } from '../allow-all-admittance';

describe('AllowAllAdmittance', () => {
	it('accepts every request', async () => {
		const admittance = new AllowAllAdmittance();

		const decision = await admittance.evaluate({ workflowId: 'wf-1' });

		expect(decision).toEqual({ accept: true });
	});
});
