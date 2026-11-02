import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { ERPNext } from '../ERPNext.node';

describe('ERPNext', () => {
	const node = new ERPNext();
	const credentials = { environment: 'selfHosted', domain: 'https://erpnext.example.com' };
	const docTypes = [
		{ name: 'Service Product', encoded: 'Service%20Product' },
		{ name: '50% Discount', encoded: '50%25%20Discount' },
		{ name: 'Sales/Orders?#', encoded: 'Sales%2FOrders%3F%23' },
		{ name: 'Customer', encoded: 'Customer' },
	];

	describe.each(docTypes)('$name', ({ name, encoded }) => {
		async function loadDocType() {
			const context = mockDeep<ILoadOptionsFunctions>();
			context.getCredentials.mockResolvedValue(credentials);
			context.helpers.requestWithAuthentication
				.mockResolvedValueOnce({ data: [{ name }] })
				.mockResolvedValueOnce({ data: [] });
			const options = await node.methods.loadOptions.getDocTypes.call(context);
			expect(options).toEqual([{ name, value: name }]);
			return options[0].value;
		}

		it('keeps the option value unchanged', async () => {
			await loadDocType();
		});

		it.each(['getDocFilters', 'getDocFields'] as const)(
			'encodes the DocType path for %s',
			async (method) => {
				const context = mockDeep<ILoadOptionsFunctions>();
				context.getCredentials.mockResolvedValue(credentials);
				context.getCurrentNodeParameter.mockReturnValue(await loadDocType());
				context.helpers.requestWithAuthentication.mockResolvedValue({ data: { fields: [] } });

				await node.methods.loadOptions[method].call(context);

				expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'erpNextApi',
					expect.objectContaining({
						method: 'GET',
						uri: `https://erpnext.example.com/api/resource/DocType/${encoded}`,
					}),
				);
			},
		);

		it.each([
			{ operation: 'get', method: 'GET', suffix: '/test-document', returnAll: false },
			{ operation: 'getAll', method: 'GET', suffix: '', returnAll: false },
			{ operation: 'getAll', method: 'GET', suffix: '', returnAll: true },
			{ operation: 'create', method: 'POST', suffix: '', returnAll: false },
			{ operation: 'update', method: 'PUT', suffix: '/test-document', returnAll: false },
			{ operation: 'delete', method: 'DELETE', suffix: '/test-document', returnAll: false },
		])(
			'encodes the path for $operation (returnAll=$returnAll)',
			async ({ operation, method, suffix, returnAll }) => {
				const docType = await loadDocType();
				const context = mockDeep<IExecuteFunctions>();
				context.getCredentials.mockResolvedValue(credentials);
				context.getInputData.mockReturnValue([{ json: {} }]);
				context.getNodeParameter.mockImplementation((parameter) => {
					switch (parameter) {
						case 'resource':
							return 'document';
						case 'operation':
							return operation;
						case 'docType':
							return docType;
						case 'documentName':
							return 'test-document';
						case 'returnAll':
							return returnAll;
						case 'limit':
							return 10;
						case 'properties':
							return { customProperty: [{ field: 'enabled', value: '1' }] };
						case 'options':
							return {
								filters: { customProperty: [{ field: 'enabled', operator: 'is', value: '1' }] },
							};
						default:
							throw new Error(`Unexpected parameter: ${parameter}`);
					}
				});
				context.helpers.requestWithAuthentication.mockResolvedValue({ data: [] });
				context.helpers.returnJsonArray.mockReturnValue([]);
				context.helpers.constructExecutionMetaData.mockReturnValue([]);

				await node.execute.call(context);

				expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'erpNextApi',
					expect.objectContaining({
						method,
						uri: `https://erpnext.example.com/api/resource/${encoded}${suffix}`,
					}),
				);
				if (operation === 'getAll') {
					expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
						'erpNextApi',
						expect.objectContaining({
							qs: expect.objectContaining({
								filters: JSON.stringify([[name, 'enabled', '=', '1']]),
							}),
						}),
					);
				}
			},
		);
	});
});
