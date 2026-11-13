import { mockDeep } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions, LegacyRequestOptions } from 'n8n-workflow';

import { FileMaker } from '../FileMaker.node';

describe('FileMaker node path values', () => {
	const baseUrl = 'https://fm.example.com/fmi/data/v1/databases/CRM';

	const setup = (typeVersion: number, parameters: IDataObject) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue({ typeVersion } as ReturnType<IExecuteFunctions['getNode']>);
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation(
			(name: string) => parameters[name] as ReturnType<IExecuteFunctions['getNodeParameter']>,
		);
		context.getCredentials.mockResolvedValue({
			host: 'fm.example.com',
			db: 'CRM',
			login: 'admin',
			password: 'fake-password',
		});
		context.helpers.request.mockImplementation(
			async (uriOrObject: string | LegacyRequestOptions) =>
				typeof uriOrObject !== 'string' && uriOrObject.method === 'POST'
					? { response: { token: 'a1b2c3d4e5f6' } }
					: {},
		);
		return context;
	};

	const requestedUrls = (context: ReturnType<typeof setup>) =>
		context.helpers.request.mock.calls.map(([options]) =>
			String((options as LegacyRequestOptions).uri),
		);

	it.each([
		[1, 'My%20Layout'],
		[1.1, 'My%2520Layout'],
	])('should send the layout in version %s as %s', async (version, expected) => {
		const context = setup(version, { action: 'delete', layout: 'My%20Layout', recid: '42' });

		await new FileMaker().execute.call(context);

		expect(requestedUrls(context)).toContain(`${baseUrl}/layouts/${expected}/records/42`);
	});

	it.each([
		[1, 'My%20Script'],
		[1.1, 'My%2520Script'],
	])('should send the script in version %s as %s', async (version, expected) => {
		const context = setup(version, {
			action: 'performscript',
			layout: 'Contacts',
			script: 'My%20Script',
		});

		await new FileMaker().execute.call(context);

		expect(requestedUrls(context)).toContain(`${baseUrl}/layouts/Contacts/script/${expected}`);
	});
});
