/* eslint-disable n8n-nodes-base/node-param-display-name-miscased */
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
	JsonObject,
	NodeParameterValueType,
} from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { resolveLakebaseSchemaUrl, resolveLakebaseTableUrl } from '../actions/lakebase/helpers';
import {
	getLakebaseBranches,
	getLakebaseDatabases,
	getLakebaseProjects,
	getLakebaseSchemas,
	getLakebaseTables,
} from '../methods/listSearch';
import { resolveLakebaseRestBase } from '../transport';

const HOST = 'https://adb-1234567890.1.azuredatabricks.net';
const EP_HOST = 'ep-old-glade-eggehocm.database.germanywestcentral.azuredatabricks.net';
const WORKSPACE_ID = '7405608428810497';
const REST_BASE = `https://${EP_HOST}/api/2.0/workspace/${WORKSPACE_ID}/rest`;
const SCHEMA_URL = `${REST_BASE}/databricks_postgres/public`;
const PERMISSION_MESSAGE = 'User does not have access to the project.';
const ITEM = 2;

const node: INode = {
	id: '1',
	name: 'Databricks',
	type: 'n8n-nodes-base.databricks',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

// Mirrors what core's httpRequest throws and authentication.ts wraps: an axios
// error with the response body under `response.data`
class AxiosError extends Error {
	constructor(
		message: string,
		readonly response: { status: number; data: unknown },
	) {
		super(message);
	}
}

const apiErrorFromBody = (status: number, data: unknown) =>
	new NodeApiError(
		node,
		new AxiosError(`Request failed with status code ${status}`, {
			status,
			data,
		}) as unknown as JsonObject,
	);

const endpointsPage = {
	endpoints: [{ status: { endpoint_type: 'READ_WRITE', hosts: { host: EP_HOST } } }],
};
const meResponse = { body: {}, headers: { 'x-databricks-org-id': WORKSPACE_ID }, statusCode: 200 };

type Locator = { mode: string; value: string };

const createLoadOptionsContext = (params: Record<string, Locator> = {}) => {
	const context = mockDeep<ILoadOptionsFunctions>();
	context.getNodeParameter.mockReturnValue('oAuth2');
	context.getCredentials.mockResolvedValue({ host: HOST });
	context.getNode.mockReturnValue(node);
	context.getCurrentNodeParameter.mockImplementation(
		(name: string) => params[name] as unknown as NodeParameterValueType,
	);
	return context;
};

const createExecuteContext = (locators: Record<string, string>) => {
	const context = mockDeep<IExecuteFunctions>();
	context.getInputData.mockReturnValue([]);
	context.getCredentials.mockResolvedValue({ host: HOST });
	context.getNode.mockReturnValue(node);
	context.getNodeParameter.mockImplementation((name: string, index: number) =>
		name === 'authentication' ? 'oAuth2' : index === ITEM ? locators[name] : undefined,
	);
	return context;
};

const defaultLocators = () => ({
	lakebaseProject: 'spike-test',
	lakebaseBranch: 'production',
	lakebaseDatabase: 'databricks_postgres',
	lakebaseSchema: 'public',
	lakebaseTable: 'my table',
});

const apiMock = (
	context: ReturnType<typeof createLoadOptionsContext> | ReturnType<typeof createExecuteContext>,
) => context.helpers.httpRequestWithAuthentication;

const project = (value: string): Locator => ({ mode: 'list', value });
const selectedProject = { lakebaseProject: project('spike-test') };
const selectedBranch = { ...selectedProject, lakebaseBranch: project('production') };
const selectedDatabase = { ...selectedBranch, lakebaseDatabase: project('databricks_postgres') };

describe('listSearch -> getLakebaseProjects', () => {
	const projectsPage = {
		projects: [
			{
				project_id: 'spike-test',
				name: 'projects/spike-test',
				status: { display_name: 'Spike Test' },
			},
			{ project_id: 'bare' },
		],
		next_page_token: 'p2',
	};

	it('lists projects by display name with the project id as value and hands back the next token', async () => {
		const context = createLoadOptionsContext();
		apiMock(context).mockResolvedValue(projectsPage);

		const result = await getLakebaseProjects.call(context, undefined, 'p1');

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksOAuth2Api',
			expect.objectContaining({
				method: 'GET',
				url: `${HOST}/api/2.0/postgres/projects`,
				qs: { page_size: 100, page_token: 'p1' },
			}),
		);
		expect(result).toEqual({
			results: [
				{ name: 'Spike Test', value: 'spike-test' },
				{ name: 'bare', value: 'bare' },
			],
			paginationToken: 'p2',
		});
	});

	it('returns no rows for a workspace without projects', async () => {
		const context = createLoadOptionsContext();
		apiMock(context).mockResolvedValue({});

		const result = await getLakebaseProjects.call(context);

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksOAuth2Api',
			expect.objectContaining({ qs: { page_size: 100 } }),
		);
		expect(result).toEqual({ results: [] });
	});

	it.each(['SPIKE', 'spike-test'])(
		'filters the fetched page by display name or id, ignoring case (%s)',
		async (filter) => {
			const context = createLoadOptionsContext();
			apiMock(context).mockResolvedValue(projectsPage);

			const { results } = await getLakebaseProjects.call(context, filter);

			expect(results).toEqual([{ name: 'Spike Test', value: 'spike-test' }]);
		},
	);

	it('uses the access-token credential when PAT auth is selected', async () => {
		const context = createLoadOptionsContext();
		context.getNodeParameter.mockReturnValue('accessToken');
		apiMock(context).mockResolvedValue({});

		await getLakebaseProjects.call(context);

		expect(apiMock(context)).toHaveBeenCalledWith('databricksApi', expect.anything());
	});

	it('rejects with the legible PERMISSION_DENIED message', async () => {
		const context = createLoadOptionsContext();
		apiMock(context).mockRejectedValue(
			apiErrorFromBody(403, { error_code: 'PERMISSION_DENIED', message: PERMISSION_MESSAGE }),
		);

		await expect(getLakebaseProjects.call(context)).rejects.toMatchObject({
			message: PERMISSION_MESSAGE,
		});
	});
});

describe('listSearch -> getLakebaseBranches', () => {
	it('asks for a project first', async () => {
		const context = createLoadOptionsContext();

		const result = await getLakebaseBranches.call(context);

		expect(result).toEqual({ results: [{ name: 'Please Select a Project First', value: '' }] });
		expect(apiMock(context)).not.toHaveBeenCalled();
	});

	it('lists branches of the selected project with the default branch first and hands back the next token', async () => {
		const context = createLoadOptionsContext(selectedProject);
		apiMock(context).mockResolvedValue({
			branches: [
				{ branch_id: 'dev' },
				{ branch_id: 'production', status: { default: true } },
				{ branch_id: 'staging' },
			],
			next_page_token: 'p2',
		});

		const result = await getLakebaseBranches.call(context, undefined, 'p1');

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksOAuth2Api',
			expect.objectContaining({
				url: `${HOST}/api/2.0/postgres/projects/spike-test/branches`,
				qs: { page_size: 100, page_token: 'p1' },
			}),
		);
		expect(result).toEqual({
			results: [
				{ name: 'production', value: 'production', description: 'Default branch' },
				{ name: 'dev', value: 'dev' },
				{ name: 'staging', value: 'staging' },
			],
			paginationToken: 'p2',
		});
	});

	it('encodes the project id in the path', async () => {
		const context = createLoadOptionsContext({ lakebaseProject: project('a b') });
		apiMock(context).mockResolvedValue({});

		await getLakebaseBranches.call(context);

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksOAuth2Api',
			expect.objectContaining({ url: expect.stringContaining('/projects/a%20b/branches') }),
		);
	});
});

describe('listSearch -> getLakebaseDatabases', () => {
	it.each([
		[{}, 'Please Select a Project First'],
		[selectedProject, 'Please Select a Branch First'],
	])('asks for a project, then a branch', async (params, placeholder) => {
		const context = createLoadOptionsContext(params);

		const result = await getLakebaseDatabases.call(context);

		expect(result).toEqual({ results: [{ name: placeholder, value: '' }] });
		expect(apiMock(context)).not.toHaveBeenCalled();
	});

	it('lists databases with the Postgres name as value and hands back the next token', async () => {
		const context = createLoadOptionsContext(selectedBranch);
		apiMock(context).mockResolvedValue({
			databases: [
				{ database_id: 'db-1', status: { postgres_database: 'databricks_postgres' } },
				{ database_id: 'plain' },
			],
			next_page_token: 'p2',
		});

		const result = await getLakebaseDatabases.call(context, undefined, 'p1');

		expect(apiMock(context)).toHaveBeenCalledWith(
			'databricksOAuth2Api',
			expect.objectContaining({
				url: `${HOST}/api/2.0/postgres/projects/spike-test/branches/production/databases`,
				qs: { page_size: 100, page_token: 'p1' },
			}),
		);
		expect(result).toEqual({
			results: [
				{ name: 'db-1', value: 'databricks_postgres' },
				{ name: 'plain', value: 'plain' },
			],
			paginationToken: 'p2',
		});
	});
});

describe('listSearch -> getLakebaseSchemas', () => {
	it('returns public without a request', async () => {
		const context = createLoadOptionsContext();

		const result = await getLakebaseSchemas.call(context);

		expect(result).toEqual({ results: [{ name: 'public', value: 'public' }] });
		expect(apiMock(context)).not.toHaveBeenCalled();
	});
});

describe('listSearch -> getLakebaseTables', () => {
	const schemaDocument = {
		components: {
			schemas: {
				orders: {},
				databricks_auth_metrics: {},
				pg_databricks_x: {},
				_dbx_y: {},
				grant_z: {},
				my_databricks_sync: {},
				customers: {},
			},
		},
	};
	const mockChain = (context: ReturnType<typeof createLoadOptionsContext>, document: unknown) =>
		apiMock(context)
			.mockResolvedValueOnce(endpointsPage)
			.mockResolvedValueOnce(meResponse)
			.mockResolvedValueOnce(document);

	it.each([
		[{}, 'Please Select a Project First'],
		[selectedProject, 'Please Select a Branch First'],
		[selectedBranch, 'Please Select a Database First'],
	])('asks for a project, branch and database first', async (params, placeholder) => {
		const context = createLoadOptionsContext(params);

		const result = await getLakebaseTables.call(context);

		expect(result).toEqual({ results: [{ name: placeholder, value: '' }] });
		expect(apiMock(context)).not.toHaveBeenCalled();
	});

	it('refuses personal access token auth before any request', async () => {
		const context = createLoadOptionsContext(selectedDatabase);
		context.getNodeParameter.mockReturnValue('accessToken');

		const promise = getLakebaseTables.call(context);

		await expect(promise).rejects.toBeInstanceOf(NodeOperationError);
		await expect(promise).rejects.toMatchObject({
			message:
				'Lakebase requires OAuth2 authentication. Set Authentication to OAuth2 to list tables, or enter the table name By ID.',
		});
		expect(apiMock(context)).not.toHaveBeenCalled();
	});

	it('lists the tables of the schema document, skipping internal objects', async () => {
		const context = createLoadOptionsContext(selectedDatabase);
		mockChain(context, schemaDocument);

		const result = await getLakebaseTables.call(context);

		expect(apiMock(context)).toHaveBeenNthCalledWith(
			3,
			'databricksOAuth2Api',
			expect.objectContaining({
				url: `${SCHEMA_URL}/openapi.json`,
				headers: expect.objectContaining({
					Accept: 'application/openapi+json, application/json',
				}),
			}),
		);
		expect(result).toEqual({
			results: [
				{ name: 'orders', value: 'orders' },
				{ name: 'my_databricks_sync', value: 'my_databricks_sync' },
				{ name: 'customers', value: 'customers' },
			],
		});
	});

	it('defaults the schema to public when none is selected', async () => {
		const context = createLoadOptionsContext(selectedDatabase);
		mockChain(context, {});

		await getLakebaseTables.call(context);

		expect(apiMock(context)).toHaveBeenNthCalledWith(
			3,
			'databricksOAuth2Api',
			expect.objectContaining({ url: expect.stringMatching(/\/public\/openapi\.json$/) }),
		);
	});

	it('uses the selected schema and encodes it', async () => {
		const context = createLoadOptionsContext({
			...selectedDatabase,
			lakebaseSchema: project('my schema'),
		});
		mockChain(context, {});

		await getLakebaseTables.call(context);

		expect(apiMock(context)).toHaveBeenNthCalledWith(
			3,
			'databricksOAuth2Api',
			expect.objectContaining({ url: expect.stringMatching(/\/my%20schema\/openapi\.json$/) }),
		);
	});

	it('filters the table list', async () => {
		const context = createLoadOptionsContext(selectedDatabase);
		mockChain(context, schemaDocument);

		const { results } = await getLakebaseTables.call(context, 'ord');

		expect(results).toEqual([{ name: 'orders', value: 'orders' }]);
	});

	it('rewrites a PGRST205 error to name the OpenAPI specification setting', async () => {
		const context = createLoadOptionsContext(selectedDatabase);
		const error = apiErrorFromBody(404, {
			code: 'PGRST205',
			message: "Could not find the table 'public.openapi.json' in the schema cache",
			hint: null,
			details: null,
		});
		apiMock(context)
			.mockResolvedValueOnce(endpointsPage)
			.mockResolvedValueOnce(meResponse)
			.mockRejectedValueOnce(error);

		await expect(getLakebaseTables.call(context)).rejects.toBe(error);

		expect(error.message).toBe(
			'Turn on the "OpenAPI specification" setting of the Data API to list tables, or enter the table name By ID',
		);
		expect(error.description).toBe(
			'In Databricks open the project, then Data API > API > Advanced settings, and enable OpenAPI specification.',
		);
	});

	it('rethrows other Data API errors untouched', async () => {
		const context = createLoadOptionsContext(selectedDatabase);
		const error = apiErrorFromBody(401, { code: 'PGRST301', message: 'invalid token permissions' });
		const originalMessage = error.message;
		apiMock(context)
			.mockResolvedValueOnce(endpointsPage)
			.mockResolvedValueOnce(meResponse)
			.mockRejectedValueOnce(error);

		await expect(getLakebaseTables.call(context)).rejects.toBe(error);

		expect(error.message).toBe(originalMessage);
	});

	it('surfaces a legible PERMISSION_DENIED from the endpoints lookup', async () => {
		const context = createLoadOptionsContext(selectedDatabase);
		apiMock(context).mockRejectedValueOnce(
			apiErrorFromBody(403, { error_code: 'PERMISSION_DENIED', message: PERMISSION_MESSAGE }),
		);

		await expect(getLakebaseTables.call(context)).rejects.toMatchObject({
			message: PERMISSION_MESSAGE,
		});
		expect(apiMock(context)).toHaveBeenCalledTimes(1);
	});

	it('returns no rows for a document without schemas', async () => {
		const context = createLoadOptionsContext(selectedDatabase);
		mockChain(context, {});

		const result = await getLakebaseTables.call(context);

		expect(result).toEqual({ results: [] });
	});
});

describe('resolveLakebaseRestBase', () => {
	it('builds the base from the READ_WRITE endpoint host and the workspace id header', async () => {
		const context = createExecuteContext(defaultLocators());
		apiMock(context)
			.mockResolvedValueOnce({
				endpoints: [
					{ status: { endpoint_type: 'READ_ONLY', hosts: { host: 'ro.example' } } },
					{ status: { endpoint_type: 'READ_WRITE', hosts: { host: EP_HOST } } },
				],
			})
			.mockResolvedValueOnce(meResponse);

		await expect(resolveLakebaseRestBase(context, 'spike-test', 'production')).resolves.toBe(
			REST_BASE,
		);

		expect(apiMock(context)).toHaveBeenNthCalledWith(
			1,
			'databricksOAuth2Api',
			expect.objectContaining({
				url: `${HOST}/api/2.0/postgres/projects/spike-test/branches/production/endpoints`,
			}),
		);
		expect(apiMock(context)).toHaveBeenNthCalledWith(
			2,
			'databricksOAuth2Api',
			expect.objectContaining({
				url: `${HOST}/api/2.0/preview/scim/v2/Me`,
				returnFullResponse: true,
			}),
		);
	});

	it('encodes the project and branch in the path', async () => {
		const context = createExecuteContext(defaultLocators());
		apiMock(context).mockResolvedValueOnce(endpointsPage).mockResolvedValueOnce(meResponse);

		await resolveLakebaseRestBase(context, 'a b', 'c/d');

		expect(apiMock(context)).toHaveBeenNthCalledWith(
			1,
			'databricksOAuth2Api',
			expect.objectContaining({
				url: expect.stringContaining('/projects/a%20b/branches/c%2Fd/endpoints'),
			}),
		);
	});

	it.each([
		{},
		{ endpoints: [] },
		{ endpoints: [{ status: {} }] },
		{ endpoints: [{ status: { endpoint_type: 'READ_ONLY', hosts: { host: 'ro.example' } } }] },
		{ endpoints: [{ status: { endpoint_type: 'READ_WRITE', hosts: {} } }] },
	])('fails when the branch has no read-write endpoint with a host (%j)', async (page) => {
		const context = createExecuteContext(defaultLocators());
		apiMock(context).mockResolvedValueOnce(page);

		const promise = resolveLakebaseRestBase(context, 'spike-test', 'production');

		await expect(promise).rejects.toBeInstanceOf(NodeOperationError);
		await expect(promise).rejects.toMatchObject({
			message: 'The branch has no read-write compute endpoint',
		});
		expect(apiMock(context)).toHaveBeenCalledTimes(1);
	});

	it.each(['evil.example/path', 'user@evil.example', 'ep.example:8443'])(
		'rejects an endpoint host that is not a bare host name (%s)',
		async (host) => {
			const context = createExecuteContext(defaultLocators());
			apiMock(context).mockResolvedValueOnce({
				endpoints: [{ status: { endpoint_type: 'READ_WRITE', hosts: { host } } }],
			});

			await expect(resolveLakebaseRestBase(context, 'spike-test', 'production')).rejects.toThrow(
				'Databricks returned an unexpected Lakebase endpoint host',
			);
			expect(apiMock(context)).toHaveBeenCalledTimes(1);
		},
	);

	it.each([
		['a missing header', { body: {}, statusCode: 200 }],
		['an empty header', { ...meResponse, headers: { 'x-databricks-org-id': '' } }],
		['letters', { ...meResponse, headers: { 'x-databricks-org-id': 'abc' } }],
		['a path', { ...meResponse, headers: { 'x-databricks-org-id': '123/x' } }],
	])('rejects a workspace id that is not numeric (%s)', async (_label, me) => {
		const context = createExecuteContext(defaultLocators());
		apiMock(context).mockResolvedValueOnce(endpointsPage).mockResolvedValueOnce(me);

		await expect(resolveLakebaseRestBase(context, 'spike-test', 'production')).rejects.toThrow(
			'Could not read the workspace ID from Databricks',
		);
		expect(apiMock(context)).toHaveBeenCalledTimes(2);
	});
});

describe('resolveLakebaseSchemaUrl', () => {
	it('reads the four locators of the item and returns the encoded schema URL', async () => {
		const context = createExecuteContext({ ...defaultLocators(), lakebaseSchema: 'my schema' });
		apiMock(context).mockResolvedValueOnce(endpointsPage).mockResolvedValueOnce(meResponse);

		await expect(resolveLakebaseSchemaUrl(context, ITEM)).resolves.toBe(
			`${REST_BASE}/databricks_postgres/my%20schema`,
		);

		for (const name of [
			'lakebaseProject',
			'lakebaseBranch',
			'lakebaseDatabase',
			'lakebaseSchema',
		]) {
			expect(context.getNodeParameter).toHaveBeenCalledWith(name, ITEM, '', {
				extractValue: true,
			});
		}
		expect(context.getNodeParameter).not.toHaveBeenCalledWith(
			'lakebaseTable',
			expect.anything(),
			expect.anything(),
			expect.anything(),
		);
		expect(apiMock(context)).toHaveBeenNthCalledWith(
			1,
			'databricksOAuth2Api',
			expect.objectContaining({
				url: `${HOST}/api/2.0/postgres/projects/spike-test/branches/production/endpoints`,
			}),
		);
	});

	it.each(['lakebaseProject', 'lakebaseBranch', 'lakebaseDatabase', 'lakebaseSchema'])(
		'rejects an empty %s before any request',
		async (name) => {
			const context = createExecuteContext({ ...defaultLocators(), [name]: '' });

			const promise = resolveLakebaseSchemaUrl(context, ITEM);

			await expect(promise).rejects.toBeInstanceOf(NodeOperationError);
			await expect(promise).rejects.toMatchObject({
				message: expect.stringMatching(/^Select a Lakebase/),
				context: { itemIndex: ITEM },
			});
			expect(apiMock(context)).not.toHaveBeenCalled();
		},
	);
});

describe('resolveLakebaseTableUrl', () => {
	it('appends the encoded table to the schema URL', async () => {
		const context = createExecuteContext(defaultLocators());
		apiMock(context).mockResolvedValueOnce(endpointsPage).mockResolvedValueOnce(meResponse);

		await expect(resolveLakebaseTableUrl(context, ITEM)).resolves.toBe(`${SCHEMA_URL}/my%20table`);

		expect(context.getNodeParameter).toHaveBeenCalledWith('lakebaseTable', ITEM, '', {
			extractValue: true,
		});
	});

	it('rejects an empty table before any request', async () => {
		const context = createExecuteContext({ ...defaultLocators(), lakebaseTable: '' });

		const promise = resolveLakebaseTableUrl(context, ITEM);

		await expect(promise).rejects.toBeInstanceOf(NodeOperationError);
		await expect(promise).rejects.toMatchObject({
			message: 'Select a Lakebase table',
			context: { itemIndex: ITEM },
		});
		expect(apiMock(context)).not.toHaveBeenCalled();
	});
});
