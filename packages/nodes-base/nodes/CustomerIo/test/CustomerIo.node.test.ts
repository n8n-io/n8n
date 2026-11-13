import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { CustomerIo } from '../CustomerIo.node';

describe('CustomerIo path values', () => {
	it.each([
		['customer', 'upsert', { id: 'a%2Fb' }, 'a%2Fb', 'a%252Fb'],
		['customer', 'delete', { id: 'a%40b.com' }, 'a@b.com', 'a%2540b.com'],
		['event', 'track', { customerId: 'a%2Fb', eventName: 'e' }, 'a%2Fb/events', 'a%252Fb/events'],
	])(
		'should handle the %s %s path value by node version',
		async (resource, operation, parameters, oldSegment, newSegment) => {
			const run = async (typeVersion: number) => {
				const context = mockDeep<IExecuteFunctions>();
				context.getInputData.mockReturnValue([{ json: {} }]);
				context.getNode.mockReturnValue({ typeVersion } as ReturnType<
					IExecuteFunctions['getNode']
				>);
				context.getCredentials.mockResolvedValue({ region: 'track.customer.io' });
				context.helpers.requestWithAuthentication.mockResolvedValue({});
				context.getNodeParameter.mockImplementation(((name: string) => {
					const values: Record<string, unknown> = {
						resource,
						operation,
						jsonParameters: false,
						additionalFields: {},
						email: 'x@example.com',
						...parameters,
					};
					return values[name];
				}) as IExecuteFunctions['getNodeParameter']);
				await new CustomerIo().execute.call(context);
				return context.helpers.requestWithAuthentication.mock.calls[0][1].url;
			};

			expect(await run(1)).toMatchObject({
				value: expect.stringContaining(`/customers/${oldSegment}`),
			});
			expect(await run(1.1)).toMatchObject({
				value: expect.stringContaining(`/customers/${newSegment}`),
			});
		},
	);
});
