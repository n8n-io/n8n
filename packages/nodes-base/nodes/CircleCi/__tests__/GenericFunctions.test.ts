import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { circleciApiRequest } from '../GenericFunctions';

describe('CircleCI GenericFunctions', () => {
	const request = jest.fn();

	const executeFunctions = {
		getCredentials: jest.fn(),
		getNodeParameter: jest.fn(),
		getNode: jest.fn(),
		helpers: { request },
	} as unknown as jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		jest.clearAllMocks();
		request.mockResolvedValue({});
		executeFunctions.getCredentials.mockResolvedValue({ apiKey: 'test-api-key' });
		executeFunctions.getNodeParameter.mockReturnValue('accessToken');
	});

	it.each([
		['n8n-io/n8n', 'n8n-io%2Fn8n'],
		['n8n-io%2Fn8n', 'n8n-io%252Fn8n'],
		['n8n-io/c++', 'n8n-io%2Fc%2B%2B'],
	])('should encode the project slug %s as a single segment', async (slug, expectedSegment) => {
		await circleciApiRequest.call(
			executeFunctions,
			'GET',
			requestPath`/project/github/${slug}/pipeline`,
		);

		const [options] = request.mock.calls[0];
		expect(String(options.uri)).toBe(
			`https://circleci.com/api/v2/project/github/${expectedSegment}/pipeline`,
		);
	});
});
