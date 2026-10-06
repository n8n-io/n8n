import nock from 'nock';

import { PostHogWithEvaluationStatus } from '../posthog-with-evaluation-status';

describe('PostHog flag evaluation status', () => {
	const host = 'https://posthog.test';
	let client: PostHogWithEvaluationStatus;

	beforeEach(() => {
		client = new PostHogWithEvaluationStatus('project-key', {
			host,
			featureFlagsRequestMaxRetries: 0,
		});
	});

	afterEach(async () => {
		await client.shutdown();
		nock.cleanAll();
	});

	function endpoint() {
		return nock(host)
			.post('/flags/', {
				token: 'project-key',
				distinct_id: 'company_instance',
				groups: { company: 'instance' },
				person_properties: {},
				group_properties: {},
				flag_keys_to_evaluate: ['experiment'],
				geoip_disable: true,
			})
			.query({ v: '2' });
	}

	const evaluate = async () =>
		await client.evaluateFlagWithStatus('experiment', 'company_instance', { company: 'instance' });

	it.each([
		{ flags: {}, expected: false },
		{ flags: { experiment: { key: 'experiment', enabled: false } }, expected: false },
		{
			flags: { experiment: { key: 'experiment', enabled: true, variant: 'variant' } },
			expected: 'variant',
		},
	])('distinguishes successful flag responses: $expected', async ({ flags, expected }) => {
		const request = endpoint().reply(200, { flags });
		expect(await evaluate()).toEqual({ status: 'available', value: expected });
		expect(request.isDone()).toBe(true);
	});

	it.each([
		{ flags: {}, quotaLimited: ['feature_flags'] },
		{ flags: {}, errorsWhileComputingFlags: true },
	])('retries incomplete evaluations: %j', async (response) => {
		endpoint().reply(200, response);
		expect(await evaluate()).toEqual({ status: 'unavailable' });
	});

	it('reports an HTTP error as unavailable and recovers on the next request', async () => {
		endpoint().reply(503);
		expect(await evaluate()).toEqual({ status: 'unavailable' });
		endpoint().reply(200, { flags: {} });
		expect(await evaluate()).toEqual({ status: 'available', value: false });
	});

	it('reports a network error as unavailable', async () => {
		endpoint().replyWithError({ code: 'ETIMEDOUT', message: 'Timeout' });
		expect(await evaluate()).toEqual({ status: 'unavailable' });
	});
});
