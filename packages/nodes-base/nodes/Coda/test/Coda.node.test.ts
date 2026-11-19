import { mockDeep } from 'vitest-mock-extended';
import type { IDataObject, IExecuteFunctions, LegacyRequestOptions } from 'n8n-workflow';

import { Coda } from '../Coda.node';

describe('Coda node path values', () => {
	const setup = (typeVersion: number, parameters: IDataObject) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue({ typeVersion } as ReturnType<IExecuteFunctions['getNode']>);
		context.getInputData.mockReturnValue([{ json: { data: {} } }]);
		context.getNodeParameter.mockImplementation(
			(name: string) => parameters[name] as ReturnType<IExecuteFunctions['getNodeParameter']>,
		);
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.helpers.request.mockResolvedValue({});
		context.helpers.returnJsonArray.mockReturnValue([]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		return context;
	};

	const requestedUri = (context: ReturnType<typeof setup>) =>
		String((context.helpers.request.mock.calls[0][0] as LegacyRequestOptions).uri);

	it.each([
		[1.1, 'Task%20One'],
		[1.2, 'Task%2520One'],
	])('should send the row ID of getRow in version %s as %s', async (version, expected) => {
		const context = setup(version, {
			resource: 'table',
			operation: 'getRow',
			docId: 'AbCDeFGH',
			tableId: 'grid-pqRstUv',
			rowId: 'Task%20One',
			options: {},
		});

		await new Coda().execute.call(context);

		expect(requestedUri(context)).toBe(
			`https://coda.io/apis/v1/docs/AbCDeFGH/tables/grid-pqRstUv/rows/${expected}`,
		);
	});

	it.each([
		[1.1, 'My%20Formula'],
		[1.2, 'My%2520Formula'],
	])('should send the formula ID of get in version %s as %s', async (version, expected) => {
		const context = setup(version, {
			resource: 'formula',
			operation: 'get',
			docId: 'AbCDeFGH',
			formulaId: 'My%20Formula',
		});

		await new Coda().execute.call(context);

		expect(requestedUri(context)).toBe(
			`https://coda.io/apis/v1/docs/AbCDeFGH/formulas/${expected}`,
		);
	});

	it.each([
		[1.1, 'My%20Table'],
		[1.2, 'My%2520Table'],
	])('should send the table ID of getRow in version %s as %s', async (version, expected) => {
		const context = setup(version, {
			resource: 'table',
			operation: 'getRow',
			docId: 'AbCDeFGH',
			tableId: 'My%20Table',
			rowId: 'i-row',
			options: {},
		});

		await new Coda().execute.call(context);

		expect(requestedUri(context)).toBe(
			`https://coda.io/apis/v1/docs/AbCDeFGH/tables/${expected}/rows/i-row`,
		);
	});

	describe('view operations', () => {
		const viewParameters = {
			resource: 'view',
			docId: 'Doc%20One',
			viewId: 'My%20View',
			rowId: 'Task%20One',
			columnId: 'Col%20One',
			keyName: 'data',
			returnAll: true,
			options: {},
		};

		it.each([
			['deleteViewRow', '/rows/Task%20One', '/rows/Task%2520One'],
			[
				'pushViewButton',
				'/rows/Task%20One/buttons/Col%20One',
				'/rows/Task%2520One/buttons/Col%2520One',
			],
			['updateViewRow', '/rows/Task%20One', '/rows/Task%2520One'],
			['getAllViewRows', '/rows', '/rows'],
			['getAllViewColumns', '/columns', '/columns'],
		])(
			'should send the path values of %s as entered in version 1.2',
			async (operation, oldTail, newTail) => {
				const [oldContext, newContext] = [
					setup(1.1, { ...viewParameters, operation }),
					setup(1.2, { ...viewParameters, operation }),
				];

				await new Coda().execute.call(oldContext);
				await new Coda().execute.call(newContext);

				expect(requestedUri(oldContext)).toBe(
					`https://coda.io/apis/v1/docs/Doc%20One/tables/My%20View${oldTail}`,
				);
				expect(requestedUri(newContext)).toBe(
					`https://coda.io/apis/v1/docs/Doc%2520One/tables/My%2520View${newTail}`,
				);
			},
		);
	});
});
