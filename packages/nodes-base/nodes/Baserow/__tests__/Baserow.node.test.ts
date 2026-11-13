import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, NodeParameterValueType } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { Baserow } from '../Baserow.node';

describe('Baserow > execute row ID handling', () => {
	const node = new Baserow();
	const tableId = 482710;
	const tablePath = `https://api.baserow.io/api/database/rows/table/${tableId}`;
	let executeFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	const setup = (operation: string, rowId: string) => {
		const parameters: Record<string, NodeParameterValueType> = {
			operation,
			tableId,
			rowId,
			dataToSend: 'defineBelow',
		};
		executeFunctions.getNodeParameter.mockImplementation(
			(name: string, _index: number, fallback?: NodeParameterValueType) =>
				parameters[name] ?? fallback,
		);
	};

	const rowUris = () =>
		executeFunctions.helpers.request.mock.calls
			.map(([options]) => String((options as { uri: string }).uri))
			.filter((uri) => uri.includes('/rows/'));

	beforeEach(() => {
		executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getCredentials.mockResolvedValue({
			host: 'https://api.baserow.io',
			username: 'nathan@n8n.io',
			password: 'fake-password',
		});
		executeFunctions.continueOnFail.mockReturnValue(false);
		executeFunctions.helpers.request.mockImplementation(async (options) =>
			String((options as { uri: string }).uri).endsWith('/token-auth/') ? { token: 'jwt' } : [],
		);
		executeFunctions.helpers.constructExecutionMetaData.mockReturnValue([]);
		executeFunctions.helpers.returnJsonArray.mockReturnValue([]);
	});

	it.each([
		['get', 'GET'],
		['update', 'PATCH'],
		['delete', 'DELETE'],
	])('sends a row ID with a path separator as one segment for %s', async (operation, method) => {
		setup(operation, 'admin/users');

		await node.execute.call(executeFunctions);

		expect(executeFunctions.helpers.request).toHaveBeenLastCalledWith(
			expect.objectContaining({
				method,
				uri: requestUrl`${tablePath}/admin%2Fusers/`,
			}),
		);
	});

	it.each(['get', 'update', 'delete'])('rejects a relative row ID for %s', async (operation) => {
		setup(operation, '..');

		await expect(node.execute.call(executeFunctions)).rejects.toThrow('Invalid identifier');

		expect(rowUris()).toEqual([]);
	});
});
