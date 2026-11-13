import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { erpNextApiRequest, toPathValue } from '../GenericFunctions';

describe('erpNextApiRequest', () => {
	it.each([
		['Item%20100%', 'ITEM/001?x=1', 'Item%2520100%25/ITEM%2F001%3Fx=1'],
		['Sales%20Invoice', 'SINV%2F2024%2F001', 'Sales%2520Invoice/SINV%252F2024%252F001'],
		['Sales Invoice', 'SINV-2024+001', 'Sales%20Invoice/SINV-2024%2B001'],
	])(
		'should send DocType %s and document name %s as %s',
		async (docType, documentName, expected) => {
			const context = mockDeep<IExecuteFunctions>();
			context.getCredentials.mockResolvedValue({
				environment: 'selfHosted',
				domain: 'https://erp.example.com/',
			});
			context.helpers.requestWithAuthentication.mockResolvedValue({});

			await erpNextApiRequest.call(
				context,
				'GET',
				requestPath`/api/resource/${docType}/${documentName}`,
			);

			const [, options] = context.helpers.requestWithAuthentication.mock.calls[0];
			expect(String(options.uri)).toBe(`https://erp.example.com/api/resource/${expected}`);
		},
	);
});

describe('toPathValue', () => {
	it('should decode the value in versions before 1.1', () => {
		expect(toPathValue(1, 'Sales%20Invoice')).toBe('Sales Invoice');
	});

	it('should keep the value unchanged from version 1.1', () => {
		expect(toPathValue(1.1, 'Sales%20Invoice')).toBe('Sales%20Invoice');
	});
});
