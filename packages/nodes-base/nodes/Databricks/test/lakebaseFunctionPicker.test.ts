import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { ILoadOptionsFunctions, INode, JsonObject } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { getLakebaseFunctions } from '../methods/listSearch';

const REST_BASE = 'https://host.example/api/2.0/workspace/7/rest';

// The PGRST205 retry inside lakebaseApiRequest sleeps 1 s
vi.mock('@n8n/utils/sleep', () => ({
	sleep: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../transport', async (importOriginal) => ({
	...(await importOriginal<typeof import('../transport')>()),
	resolveLakebaseRestBase: vi.fn(async () => REST_BASE),
}));

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

class AxiosError extends Error {
	constructor(
		message: string,
		readonly response: { status: number; data: unknown },
	) {
		super(message);
	}
}

const apiError = (status: number, data: unknown) =>
	new NodeApiError(
		node,
		new AxiosError(`Request failed with status code ${status}`, {
			status,
			data,
		}) as unknown as JsonObject,
	);

const document = {
	paths: {
		'/': {},
		'/orders': {},
		'/rpc/spike_add': {},
		'/rpc/report_grants': {},
		'/rpc/databricks_auth': {},
		'/rpc/pg_databricks_x': {},
		'/rpc/_dbx_y': {},
		'/rpc/grant_z': {},
	},
};

const item = (name: string) => ({ name, value: name });

describe('Lakebase -> function picker', () => {
	const setup = (locators: Record<string, string> = {}, response: unknown = document) => {
		const values: Record<string, string> = {
			lakebaseProject: 'proj',
			lakebaseBranch: 'main',
			lakebaseDatabase: 'app',
			lakebaseSchema: 'public',
			authentication: 'oAuth2',
			...locators,
		};
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNode.mockReturnValue(node);
		context.getNodeParameter.mockImplementation((name) => values[name]);
		context.getCredentials.mockResolvedValue({ host: 'https://host.example' });
		context.helpers.httpRequestWithAuthentication.mockResolvedValue(response);
		return context;
	};
	const apiMock = (context: ReturnType<typeof setup>) =>
		context.helpers.httpRequestWithAuthentication;

	it('lists the user functions and hides the internal helpers', async () => {
		const context = setup();

		const { results } = await getLakebaseFunctions.call(context);

		expect(results).toEqual([item('spike_add'), item('report_grants')]);
		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				url: `${REST_BASE}/app/public/openapi.json`,
				headers: expect.objectContaining({
					Accept: 'application/openapi+json, application/json',
				}),
			}),
			expect.anything(),
		);
	});

	it('filters by name without regard to case', async () => {
		const { results } = await getLakebaseFunctions.call(setup(), 'SPIKE');

		expect(results).toEqual([item('spike_add')]);
	});

	it.each([
		['lakebaseProject', 'Please Select a Project First'],
		['lakebaseBranch', 'Please Select a Branch First'],
		['lakebaseDatabase', 'Please Select a Database First'],
		['lakebaseSchema', 'Please Select a Schema First'],
	])('asks for %s before it requests anything', async (missing, placeholder) => {
		const context = setup({ [missing]: '' });

		const { results } = await getLakebaseFunctions.call(context);

		expect(results).toEqual([{ name: placeholder, value: '' }]);
		expect(apiMock(context)).not.toHaveBeenCalled();
	});

	it('encodes the database and schema', async () => {
		const context = setup({ lakebaseDatabase: 'my db', lakebaseSchema: 'my schema' });

		await getLakebaseFunctions.call(context);

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksOAuth2Api',
			expect.objectContaining({ url: `${REST_BASE}/my%20db/my%20schema/openapi.json` }),
			expect.anything(),
		);
	});

	it('names the OpenAPI setting when the document is off', async () => {
		const context = setup();
		apiMock(context).mockRejectedValue(
			apiError(404, { code: 'PGRST205', message: 'Could not find the table' }),
		);

		const failure = getLakebaseFunctions.call(context);

		await expect(failure).rejects.toThrow(NodeOperationError);
		await expect(failure).rejects.toThrow('OpenAPI specification');
		expect(apiMock(context)).toHaveBeenCalledTimes(2);
	});

	it('rethrows any other error untouched', async () => {
		const context = setup();
		const denied = apiError(403, { code: '42501', message: 'permission denied' });
		apiMock(context).mockRejectedValue(denied);

		await expect(getLakebaseFunctions.call(context)).rejects.toBe(denied);
	});

	it('returns no results for an empty document', async () => {
		expect(await getLakebaseFunctions.call(setup({}, {}))).toEqual({ results: [] });
	});
});
