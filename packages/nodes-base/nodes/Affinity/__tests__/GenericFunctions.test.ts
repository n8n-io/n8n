import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { affinityApiRequest } from '../GenericFunctions';

describe('Affinity GenericFunctions', () => {
	const request = vi.fn();
	const context = {
		getCredentials: vi.fn().mockResolvedValue({ apiKey: 'test-api-key' }),
		getNode: vi.fn(),
		helpers: { request },
	} as unknown as IExecuteFunctions;

	it('should encode path values as a single segment', async () => {
		request.mockResolvedValue({});
		const personId = '38706/organizations?x=1';

		await affinityApiRequest.call(context, 'GET', requestPath`/persons/${personId}`);

		expect(String(request.mock.calls[0][0].uri)).toBe(
			'https://api.affinity.co/persons/38706%2Forganizations%3Fx=1',
		);
	});
});
