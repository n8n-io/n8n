import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, requestPath } from 'n8n-workflow';

import { bitlinkPath, bitlyApiRequest } from '../GenericFunctions';

describe('Bitly GenericFunctions', () => {
	const context = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.helpers.request.mockResolvedValue({});
	});

	it('should encode a path value as one segment', async () => {
		const groupId = 'Ba1bc23dE4F/bitlinks?x=1';
		await bitlyApiRequest.call(context, 'GET', requestPath`/groups/${groupId}/tags`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api-ssl.bitly.com/v4/groups/Ba1bc23dE4F%2Fbitlinks%3Fx=1/tags',
				}),
			}),
		);
	});

	it.each([
		['bit.ly/22u3ypK', '/bitlinks/bit.ly/22u3ypK'],
		['https://bit.ly/22u3ypK', '/bitlinks/bit.ly/22u3ypK'],
		['example.link/my-link_1', '/bitlinks/example.link/my-link_1'],
		['bit.ly/22u3ypK?x=1', '/bitlinks/bit.ly/22u3ypK'],
		['https://bit.ly/22u3ypK#top', '/bitlinks/bit.ly/22u3ypK'],
	])('should build the bitlink path for "%s"', (bitlink, expected) => {
		expect(String(bitlinkPath.call(context, bitlink, 0))).toBe(expected);
	});

	it.each([
		'22u3ypK',
		'bit.ly/',
		'/22u3ypK',
		'bit.ly/22u3ypK/x',
		'https://bit.ly/22u3ypK/x',
		'bit.ly/..',
		'../22u3ypK',
		'./22u3ypK',
		'bit.ly/.',
	])('should reject the Bitlink "%s"', (bitlink) => {
		expect(() => bitlinkPath.call(context, bitlink, 0)).toThrow(NodeOperationError);
	});
});
