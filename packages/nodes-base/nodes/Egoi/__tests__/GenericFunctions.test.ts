import type { IExecuteFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { getFields } from '../GenericFunctions';

describe('Egoi -> getFields', () => {
	it('should encode the list ID in the request URL', async () => {
		const request = vi.fn().mockResolvedValue([]);
		const executeFunctions = {
			getCredentials: vi.fn().mockResolvedValue({ apiKey: 'fake-api-key' }),
			helpers: { request },
			getNode: vi.fn(),
		} as unknown as IExecuteFunctions;

		await getFields.call(executeFunctions, '4/contacts');

		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({
				url: requestUrl`https://api.egoiapp.com/lists/4%2Fcontacts/fields`,
			}),
		);
	});
});
