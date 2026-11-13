import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { clearbitApiRequest } from '../GenericFunctions';

describe('Clearbit GenericFunctions', () => {
	const request = vi.fn();

	const executeFunctions = {
		getCredentials: vi.fn(),
		getNodeParameter: vi.fn(),
		getNode: vi.fn(),
		helpers: { request },
	} as unknown as Mocked<IExecuteFunctions>;

	beforeEach(() => {
		vi.clearAllMocks();
		request.mockResolvedValue({});
		executeFunctions.getCredentials.mockResolvedValue({ apiKey: 'test-api-key' });
		executeFunctions.getNodeParameter.mockReturnValue('accessToken');
	});

	it('should encode path values as a single segment', async () => {
		const id = 'abc/find?x=1';

		await clearbitApiRequest.call(
			executeFunctions,
			'GET',
			'company-stream',
			requestPath`/v2/companies/${id}`,
		);

		const [options] = request.mock.calls[0];
		expect(String(options.uri)).toBe(
			'https://company-stream.clearbit.com/v2/companies/abc%2Ffind%3Fx=1',
		);
	});
});
