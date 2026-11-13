import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { Chargebee } from '../Chargebee.node';

describe('Chargebee', () => {
	it('should encode path values', async () => {
		const parameters: Record<string, string> = {
			resource: 'invoice',
			operation: 'pdfUrl',
			invoiceId: 'inv_42/delete?x=1',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getCredentials.mockResolvedValue({ accountName: 'acme', apiKey: 'test_api_key' });
		context.getNodeParameter.mockImplementation((name: string) => parameters[name] as never);
		context.helpers.request.mockResolvedValue({ download: { download_url: 'https://x' } });
		context.helpers.constructExecutionMetaData.mockReturnValue([]);

		await new Chargebee().execute.call(context);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://acme.chargebee.com/api/v2/invoices/inv_42%2Fdelete%3Fx=1/pdf',
				}),
			}),
		);
	});
});
