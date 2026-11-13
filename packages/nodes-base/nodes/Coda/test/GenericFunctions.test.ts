import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { codaApiRequest, codaApiRequestAllItems, toPathValue } from '../GenericFunctions';

describe('codaApiRequest', () => {
	const setup = () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.helpers.request.mockResolvedValue({});
		return context;
	};

	it('should encode path values as one segment', async () => {
		const context = setup();

		const tableId = 'grid-pqRstUv/rows?x=1';
		await codaApiRequest.call(context, 'GET', requestPath`/docs/AbCDeFGH/tables/${tableId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://coda.io/apis/v1/docs/AbCDeFGH/tables/grid-pqRstUv%2Frows%3Fx=1',
				}),
			}),
		);
	});

	describe('codaApiRequestAllItems', () => {
		const page = (nextPageLink?: string) => ({ items: [{ id: 'a' }], nextPageLink });
		const run = async (link: string) => {
			const context = setup();
			context.getNode.mockReturnValue(mock<INode>());
			context.helpers.request.mockResolvedValueOnce(page(link)).mockResolvedValueOnce(page());
			const result = codaApiRequestAllItems.call(
				context,
				'items',
				'GET',
				requestPath`/docs/AbCDeFGH/tables`,
				{},
				{ useColumnNames: 'true' },
			);
			return { context, result };
		};
		const secondRequest = (context: ReturnType<typeof setup>) =>
			context.helpers.request.mock.calls[1][0];

		it('should request the next page from the path and query of the link', async () => {
			const { context, result } = await run(
				'https://coda.io/apis/v1/docs/AbCDeFGH/tables?limit=100&pageToken=next-page',
			);
			await result;

			expect(context.helpers.request).toHaveBeenCalledTimes(2);
			expect(secondRequest(context)).toEqual(
				expect.objectContaining({
					uri: expect.objectContaining({ value: 'https://coda.io/apis/v1/docs/AbCDeFGH/tables' }),
					qs: { limit: '100', pageToken: 'next-page' },
				}),
			);
		});

		it('should keep requesting the configured host when the link has another host', async () => {
			const { context, result } = await run(
				'https://other.example/apis/v1/docs/AbCDeFGH/tables?pageToken=x',
			);
			await result;

			expect(context.helpers.request).toHaveBeenCalledTimes(2);
			expect(secondRequest(context)).toEqual(
				expect.objectContaining({
					uri: expect.objectContaining({ value: 'https://coda.io/apis/v1/docs/AbCDeFGH/tables' }),
					qs: { pageToken: 'x' },
				}),
			);
		});

		it('should keep an encoded segment encoded once', async () => {
			const { context, result } = await run(
				'https://coda.io/apis/v1/docs/AbCDeFGH/tables/grid-a%2Fb/rows?pageToken=x',
			);
			await result;

			expect(secondRequest(context)).toEqual(
				expect.objectContaining({
					uri: expect.objectContaining({
						value: 'https://coda.io/apis/v1/docs/AbCDeFGH/tables/grid-a%2Fb/rows',
					}),
				}),
			);
		});

		it('should keep repeated query keys', async () => {
			const { context, result } = await run(
				'https://coda.io/apis/v1/docs/AbCDeFGH/tables?tableTypes=view&tableTypes=table&pageToken=x',
			);
			await result;

			expect(secondRequest(context)).toEqual(
				expect.objectContaining({
					qs: { tableTypes: ['view', 'table'], pageToken: 'x' },
				}),
			);
		});

		it.each([
			['another path prefix', 'https://coda.io/other/v1/docs/AbCDeFGH/tables?pageToken=x'],
			['a dot segment', 'https://coda.io/apis/v1/docs/%2E%2E/%2E%2E/tables?pageToken=x'],
			['an empty segment', 'https://coda.io/apis/v1/docs//tables?pageToken=x'],
			['a malformed encoding', 'https://coda.io/apis/v1/docs/%E0%A4%A/tables?pageToken=x'],
			['an invalid URL', 'not a url'],
		])('should reject a link with %s', async (_, link) => {
			const { context, result } = await run(link);

			await expect(result).rejects.toThrow('Unexpected next page link');
			expect(context.helpers.request).toHaveBeenCalledTimes(1);
		});
	});

	it.each([
		['Task One/Two', 'Task%20One%2FTwo'],
		['Task%20One%2FTwo', 'Task%2520One%252FTwo'],
		['My%20Table', 'My%2520Table'],
		['Q1+Q2', 'Q1%2BQ2'],
		['100% done', '100%25%20done'],
	])('should send the table and row name %s as %s', async (name, expected) => {
		const context = setup();

		await codaApiRequest.call(
			context,
			'GET',
			requestPath`/docs/AbCDeFGH/tables/${name}/rows/${name}`,
		);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: `https://coda.io/apis/v1/docs/AbCDeFGH/tables/${expected}/rows/${expected}`,
				}),
			}),
		);
	});
});

describe('toPathValue', () => {
	it.each([
		[1, 'Task%20One%2FTwo', 'Task One/Two'],
		[1.1, 'Task%20One%2FTwo', 'Task One/Two'],
		[1.2, 'Task%20One%2FTwo', 'Task%20One%2FTwo'],
		[1.1, 'Task One', 'Task One'],
	])('should convert %s value %s to %s', (version, value, expected) => {
		expect(toPathValue(version, value)).toBe(expected);
	});
});
