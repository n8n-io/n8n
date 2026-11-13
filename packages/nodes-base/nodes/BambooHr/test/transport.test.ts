import type { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { get } from '../v1/actions/employee/get/execute';
import { apiRequest } from '../v1/transport';

describe('BambooHR transport', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ subdomain: 'acme', apiKey: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});

		await apiRequest.call(context, 'GET', requestPath`employees/${'112/files/view'}`);

		expect(String((context.helpers.request.mock.calls[0][0] as IRequestOptions).url)).toBe(
			'https://api.bamboohr.com/api/gateway.php/acme/v1/employees/112%2Ffiles%2Fview',
		);
	});
});

describe('BambooHR employee get', () => {
	it('should send a Fields value given as a string', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ subdomain: 'acme', apiKey: 'fake-api-key' });
		context.getNodeParameter.mockImplementation((name: string) =>
			name === 'employeeId' ? '112' : 'firstName, lastName',
		);
		context.helpers.request.mockResolvedValue({});

		await get.call(context, 0);

		const options = context.helpers.request.mock.calls[0][0] as IRequestOptions;
		expect(String(options.url)).toBe(
			'https://api.bamboohr.com/api/gateway.php/acme/v1/employees/112',
		);
		expect(options.qs).toEqual({ fields: 'firstName,lastName' });
	});
});
