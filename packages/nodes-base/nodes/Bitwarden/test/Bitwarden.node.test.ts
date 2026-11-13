import type { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { Bitwarden } from '../Bitwarden.node';

describe('Bitwarden node', () => {
	const setup = (resource: string, idParameter: string, id: string) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getCredentials.mockResolvedValue({ environment: 'cloudHosted' });
		context.getNodeParameter.mockImplementation((name: string) => {
			const parameters: Record<string, string> = {
				resource,
				operation: 'get',
				[idParameter]: id,
			};
			return parameters[name];
		});
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.request.mockResolvedValue({ access_token: 'fake-access-token' });
		return context;
	};

	it.each([
		['collection', 'collectionId', '/public/collections/x%2Fevents'],
		['group', 'groupId', '/public/groups/x%2Fevents'],
		['member', 'memberId', '/public/members/x%2Fevents'],
	])('should send the %s ID as one path segment', async (resource, idParameter, expectedPath) => {
		const context = setup(resource, idParameter, 'x/events');

		await new Bitwarden().execute.call(context);

		const requests = context.helpers.request.mock.calls.map(([options]) => options);
		const apiRequest = requests[requests.length - 1] as IRequestOptions;
		expect(String(apiRequest.uri)).toBe(`https://api.bitwarden.com${expectedPath}`);
	});

	it.each([
		['collection', 'collectionId'],
		['group', 'groupId'],
		['member', 'memberId'],
	])('should reject a %s ID that is a dot segment', async (resource, idParameter) => {
		const context = setup(resource, idParameter, '..');

		await expect(new Bitwarden().execute.call(context)).rejects.toThrow('Invalid identifier');

		expect(context.helpers.request).toHaveBeenCalledTimes(1);
	});
});
