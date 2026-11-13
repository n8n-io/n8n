import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { webexApiRequest } from '../GenericFunctions';

describe('Cisco Webex GenericFunctions', () => {
	const requestOAuth2 = jest.fn();

	const executeFunctions = {
		getCredentials: jest.fn(),
		getNodeParameter: jest.fn(),
		getNode: jest.fn(),
		helpers: { requestOAuth2 },
	} as unknown as jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		requestOAuth2.mockResolvedValue({});
		executeFunctions.getCredentials.mockResolvedValue({ apiKey: 'test-api-key' });
		executeFunctions.getNodeParameter.mockReturnValue('accessToken');
	});

	it('should encode path values as a single segment', async () => {
		const id = 'Y2lzY29/rooms';

		await webexApiRequest.call(executeFunctions, 'GET', requestPath`/messages/${id}`);

		const [, options] = requestOAuth2.mock.calls[0];
		expect(String(options.uri)).toBe('https://webexapis.com/v1/messages/Y2lzY29%2Frooms');
	});
});
