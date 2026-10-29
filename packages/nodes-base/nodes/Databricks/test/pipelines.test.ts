import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { DATABRICKS_PARTNER_USER_AGENT } from '../constants';
import {
	getPipelines,
	PIPELINES_PAGE_SIZE,
	PIPELINES_SEARCH_MAX_PAGES,
} from '../trigger/pipelines';

const HOST = 'https://adb-example.cloud.databricks.com';
const ID_A = '8199cd89-e2f5-4169-a6aa-656a24c8886d';
const ID_B = '4518bfc6-f9d6-4a17-8038-1ad43f74c6da';
const ID_C = '01ee1dae-da54-415a-aba8-0c8b0de503f1';

const node = mock<INode>({ name: 'Databricks Trigger', typeVersion: 1 });

const pipeline = (id: string, name?: string) => ({ pipeline_id: id, name, state: 'IDLE' });
const listItem = (id: string, name = id) => ({ name, value: id, url: `${HOST}/pipelines/${id}` });

const createContext = () => {
	const context = mockDeep<ILoadOptionsFunctions>();
	context.getNode.mockReturnValue(node);
	context.getCredentials.mockResolvedValue({ host: HOST });
	context.getNodeParameter.mockReturnValue('accessToken');
	const api = context.helpers.httpRequestWithAuthentication;
	const requestQuery = (call = 0) => api.mock.calls[call][1].qs;
	const search = async (filter?: string, paginationToken?: string) =>
		await getPipelines.call(context, filter, paginationToken);
	return { api, requestQuery, search };
};

describe('getPipelines', () => {
	it('lists one page with the name, ID and link of each pipeline', async () => {
		const { api, search } = createContext();
		api.mockResolvedValue({
			statuses: [pipeline(ID_A, 'Sales ETL'), pipeline(ID_B), { name: 'no id' }, null],
			next_page_token: 'p2',
		});

		await expect(search()).resolves.toEqual({
			results: [listItem(ID_A, 'Sales ETL'), listItem(ID_B)],
			paginationToken: 'p2',
		});

		expect(api).toHaveBeenCalledTimes(1);
		expect(api).toHaveBeenCalledWith(
			'databricksApi',
			expect.objectContaining({
				method: 'GET',
				url: `${HOST}/api/2.0/pipelines`,
				qs: { max_results: PIPELINES_PAGE_SIZE },
				headers: expect.objectContaining({ 'User-Agent': DATABRICKS_PARTNER_USER_AGENT }),
			}),
		);
	});

	it('continues from the given pagination token', async () => {
		const { requestQuery, search, api } = createContext();
		api.mockResolvedValue({ statuses: [pipeline(ID_A, 'Sales ETL')] });

		await expect(search(undefined, 'p2')).resolves.toEqual({
			results: [listItem(ID_A, 'Sales ETL')],
		});

		expect(requestQuery()).toEqual({ max_results: PIPELINES_PAGE_SIZE, page_token: 'p2' });
	});

	it.each([
		['a blank next token', ''],
		['a null next token', null],
	])('treats %s and a missing list as the last empty page', async (_label, nextPageToken) => {
		const { api, search } = createContext();
		api.mockResolvedValue({ next_page_token: nextPageToken });

		await expect(search()).resolves.toEqual({ results: [] });
	});

	it('searches by name across pages without regard to case', async () => {
		const { api, requestQuery, search } = createContext();
		api
			.mockResolvedValueOnce({
				statuses: [pipeline(ID_A, 'Sales ETL'), pipeline(ID_B, 'Marketing')],
				next_page_token: 'p2',
			})
			.mockResolvedValueOnce({ statuses: [pipeline(ID_C, 'sales backfill')] });

		await expect(search('SALES')).resolves.toEqual({
			results: [listItem(ID_A, 'Sales ETL'), listItem(ID_C, 'sales backfill')],
		});

		expect(api).toHaveBeenCalledTimes(2);
		expect(requestQuery(1)).toEqual({ max_results: PIPELINES_PAGE_SIZE, page_token: 'p2' });
	});

	it('searches by a fragment of the ID', async () => {
		const { api, search } = createContext();
		api.mockResolvedValue({ statuses: [pipeline(ID_A, 'Sales ETL'), pipeline(ID_B, 'Marketing')] });

		await expect(search(ID_B.slice(0, 8).toUpperCase())).resolves.toEqual({
			results: [listItem(ID_B, 'Marketing')],
		});
	});

	it('stops scanning at the page cap and hands back the next token', async () => {
		const { api, search } = createContext();
		api.mockResolvedValue({ statuses: [pipeline(ID_A, 'other')], next_page_token: 'more' });

		await expect(search('sales')).resolves.toEqual({ results: [], paginationToken: 'more' });

		expect(api).toHaveBeenCalledTimes(PIPELINES_SEARCH_MAX_PAGES);
	});

	it('makes a PERMISSION_DENIED error legible', async () => {
		const { api, search } = createContext();
		api.mockRejectedValue(
			new NodeApiError(node, {
				message: 'Request failed with status code 403',
				response: {
					status: 403,
					data: { error_code: 'PERMISSION_DENIED', message: 'User does not have permission.' },
				},
			}),
		);

		const error = await search().catch((thrown: unknown) => thrown);

		expect(error).toBeInstanceOf(NodeApiError);
		expect(error).toMatchObject({
			message: 'User does not have permission.',
			description: expect.stringContaining('Grant the named permission'),
		});
	});

	it.each([
		['an HTML body', '<html>sign in</html>'],
		['a statuses field that is not a list', { statuses: 'none' }],
	])('rejects %s instead of returning an empty list', async (_label, response) => {
		const { api, search } = createContext();
		api.mockResolvedValue(response);

		await expect(search()).rejects.toThrow(NodeOperationError);
		await expect(search()).rejects.toThrow('Databricks did not return a JSON list of pipelines');
	});
});
