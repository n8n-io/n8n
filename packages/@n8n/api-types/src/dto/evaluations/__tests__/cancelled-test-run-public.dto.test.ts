import { CancelledTestRunPublicDto } from '../test-run-public.dto';

describe('CancelledTestRunPublicDto', () => {
	test('accepts the cancelled run', () => {
		const result = CancelledTestRunPublicDto.safeParse({
			id: '9f8e7d6c5b4a3210',
			status: 'cancelled',
		});

		expect(result.success).toBe(true);
	});

	test('strips fields the route does not publish', () => {
		const result = CancelledTestRunPublicDto.safeParse({
			id: '9f8e7d6c5b4a3210',
			status: 'cancelled',
			workflowId: 'abc',
		});

		expect(result.success).toBe(true);
		expect(result.data).not.toHaveProperty('workflowId');
	});

	test.each([
		['a status other than cancelled', { id: '9f8e7d6c5b4a3210', status: 'running' }],
		['a missing id', { status: 'cancelled' }],
	])('rejects %s', (_label, body) => {
		expect(CancelledTestRunPublicDto.safeParse(body).success).toBe(false);
	});
});
