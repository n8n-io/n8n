import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import { ERPNext } from '../ERPNext.node';

const credentials = {
	environment: 'cloudHosted',
	subdomain: 'acme',
	domain: 'erpnext.com',
};

describe('ERPNext Node', () => {
	describe('loadOptions', () => {
		it.each([
			['getDocFields', 1, 'Sales%20Invoice', 'Sales%20Invoice'],
			['getDocFilters', 1, 'Sales%20Invoice', 'Sales%20Invoice'],
			['getDocFields', 1.1, 'Sales Invoice', 'Sales%20Invoice'],
			['getDocFilters', 1.1, 'Sales Invoice', 'Sales%20Invoice'],
		] as const)(
			'%s at version %s should request the selected DocType',
			async (method, typeVersion, docType, expected) => {
				const context = mockDeep<ILoadOptionsFunctions>();
				context.getNode.mockReturnValue({ typeVersion } as ReturnType<typeof context.getNode>);
				context.getCurrentNodeParameter.mockReturnValue(docType);
				context.getCredentials.mockResolvedValue(credentials);
				context.helpers.requestWithAuthentication.mockResolvedValue({
					data: { fields: [{ label: 'Customer', fieldname: 'customer' }] },
				});

				await new ERPNext().methods.loadOptions[method].call(context);

				const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
				expect(String(options.uri)).toBe(
					`https://acme.erpnext.com/api/resource/DocType/${expected}`,
				);
			},
		);

		it.each([
			[1, 'Sales Invoice', 'Sales%20Invoice'],
			[1.1, 'Sales Invoice', 'Sales Invoice'],
		])(
			'getDocTypes at version %s should return the DocType name %s as %s',
			async (typeVersion, name, value) => {
				const context = mockDeep<ILoadOptionsFunctions>();
				context.getNode.mockReturnValue({ typeVersion } as ReturnType<typeof context.getNode>);
				context.getCredentials.mockResolvedValue(credentials);
				context.helpers.requestWithAuthentication
					.mockResolvedValueOnce({ data: [{ name }] })
					.mockResolvedValueOnce({ data: [] });

				const options = await new ERPNext().methods.loadOptions.getDocTypes.call(context);

				expect(options).toEqual([expect.objectContaining({ value })]);
			},
		);
	});

	describe('execute', () => {
		it.each([
			[1, 'Sales%20Invoice', 'SINV%2F2024%2F001', 'Sales%20Invoice/SINV%2F2024%2F001'],
			[1.1, 'Sales Invoice', 'SINV/2024/001', 'Sales%20Invoice/SINV%2F2024%2F001'],
			[1.1, 'Item%20A', 'SINV%2F2024', 'Item%2520A/SINV%252F2024'],
		])(
			'document get at version %s should send %s and %s as %s',
			async (typeVersion, docType, documentName, expected) => {
				const context = mockDeep<IExecuteFunctions>();
				context.getNode.mockReturnValue({ typeVersion } as ReturnType<typeof context.getNode>);
				context.getInputData.mockReturnValue([{ json: {} }]);
				context.getNodeParameter.mockImplementation(
					(name: string) =>
						({ resource: 'document', operation: 'get', docType, documentName })[name],
				);
				context.getCredentials.mockResolvedValue(credentials);
				context.helpers.requestWithAuthentication.mockResolvedValue({ data: {} });
				context.helpers.returnJsonArray.mockReturnValue([]);
				context.helpers.constructExecutionMetaData.mockReturnValue([]);

				await new ERPNext().execute.call(context);

				const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
				expect(String(options.uri)).toBe(`https://acme.erpnext.com/api/resource/${expected}`);
			},
		);
	});
});
