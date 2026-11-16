import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import type { Mocked } from 'vitest';

import { webexApiRequest } from '../GenericFunctions';

describe('Cisco Webex GenericFunctions', () => {
	const requestOAuth2 = vi.fn();

	const executeFunctions = {
		getCredentials: vi.fn(),
		getNodeParameter: vi.fn(),
		getNode: vi.fn(),
		helpers: { requestOAuth2 },
	} as unknown as Mocked<IExecuteFunctions>;

	beforeEach(() => {
		vi.clearAllMocks();
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
