import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	INode,
} from 'n8n-workflow';

import { brandfetchApiRequest } from '../../v2/GenericFunctions';

export const node: INode = {
	id: 'c4a5ca75-18c7-4cc8-bf7d-5d57bb7d84da',
	name: 'Brandfetch',
	type: 'n8n-nodes-base.Brandfetch',
	typeVersion: 2,
	position: [0, 0],
	parameters: {
		operation: 'data',
		type: 'domain',
		identifier: 'n8n.io',
	},
};

describe('BrandfetchV2', () => {
	describe('brandfetchApiRequest', () => {
		const mockThis = {
			helpers: {
				requestWithAuthentication: jest.fn().mockResolvedValue({ statusCode: 200 }),
			},
			getNode() {
				return node;
			},
			getNodeParameter: jest.fn(),
		} as unknown as IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

		it.each([
			['domain', 'n8n.io', '/brands/domain/n8n.io'],
			['ticker', 'AAPL', '/brands/ticker/AAPL'],
			['crypto', 'BTC', '/brands/crypto/BTC'],
			['isin', 'US0378331005', '/brands/isin/US0378331005'],
		])('should call the explicit %s route', async (_type, _identifier, resource) => {
			const method: IHttpRequestMethods = 'GET';

			await brandfetchApiRequest.call(mockThis, method, resource);

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('brandfetchApi', {
				method: 'GET',
				url: `https://api.brandfetch.io/v2${resource}`,
				json: true,
			});
		});
	});
});
