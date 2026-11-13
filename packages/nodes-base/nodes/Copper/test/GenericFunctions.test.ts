import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { copperApiRequest } from '../GenericFunctions';

describe('copperApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const companyId = '1001/delete?x=1';
		await copperApiRequest.call(context, 'GET', requestPath`/companies/${companyId}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'copperApi',
			expect.objectContaining({
				url: expect.objectContaining({
					value: 'https://api.copper.com/developer_api/v1/companies/1001%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
