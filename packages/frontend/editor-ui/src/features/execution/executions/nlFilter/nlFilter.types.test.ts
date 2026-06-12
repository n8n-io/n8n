import { NlExecutionFilterAiResponseSchema } from './nlFilter.types';

describe('NlExecutionFilterAiResponseSchema', () => {
	it('accepts a fully empty object', () => {
		expect(NlExecutionFilterAiResponseSchema.safeParse({}).success).toBe(true);
	});

	it('rejects unknown keys (.strict prevents AI from sneaking in hallucinated fields)', () => {
		const result = NlExecutionFilterAiResponseSchema.safeParse({
			status: 'error',
			nodes: ['Slack'],
		});
		expect(result.success).toBe(false);
	});

	it('rejects status values outside the allowed enum', () => {
		const result = NlExecutionFilterAiResponseSchema.safeParse({ status: 'explosion' });
		expect(result.success).toBe(false);
	});
});
