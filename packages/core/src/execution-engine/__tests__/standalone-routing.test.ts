import type {
	ICredentialsHelper,
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INode,
	INodePropertyRouting,
	INodeType,
	INodeTypes,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { runStandaloneRouting } from '../standalone-routing';

const httpRequest = vi.fn<(options: IHttpRequestOptions) => Promise<unknown>>();
const httpRequestWithAuthentication = async function (
	this: IExecuteSingleFunctions,
	credentialType: string,
	options: IHttpRequestOptions,
) {
	await this.getCredentials(credentialType);
	return await httpRequest(options);
};

vi.mock('../node-execution-context/utils/request-helper-functions', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getRequestHelperFunctions: () => ({ httpRequest, httpRequestWithAuthentication }),
}));

const nodeType: INodeType = {
	description: {
		displayName: 'Test Trigger',
		name: 'testTrigger',
		group: ['trigger'],
		version: 1,
		description: '',
		defaults: {},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		requestDefaults: { baseURL: 'https://api.example.com' },
	},
};

const node: INode = {
	id: 'n1',
	name: 'Trigger',
	type: 'testTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const additionalDataFields = {
	executionId: 'e1',
	webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
	formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
};

const context = {
	workflow: new Workflow({
		id: 'w1',
		nodes: [node],
		connections: {},
		active: true,
		nodeTypes: mock<INodeTypes>({ getByNameAndVersion: () => nodeType }),
	}),
	node,
	additionalData: mock<IWorkflowExecuteAdditionalData>(additionalDataFields),
	mode: 'trigger' as const,
	getExecutionContext: () => undefined,
};

const run = async (routing: INodePropertyRouting, extraKeys?: IWorkflowDataProxyAdditionalKeys) =>
	await runStandaloneRouting(context, nodeType, routing, extraKeys);

/** The position of the options argument of `ICredentialsHelper.getDecrypted`. */
const CREDENTIAL_OPTIONS_ARG = 7;

const respond = (body: IDataObject) =>
	httpRequest.mockResolvedValueOnce({ body, headers: {}, statusCode: 200 });

beforeEach(() => httpRequest.mockReset());

describe('runStandaloneRouting', () => {
	test('sends one request from the routing block and returns the shaped items', async () => {
		respond({ items: [{ id: 1 }, { id: 2 }] });

		const items = await run({
			request: { url: '/items' },
			output: { postReceive: [{ type: 'rootProperty', properties: { property: 'items' } }] },
		});

		expect(httpRequest).toHaveBeenCalledTimes(1);
		expect(httpRequest.mock.lastCall?.[0]).toMatchObject({
			baseURL: 'https://api.example.com',
			url: '/items',
		});
		expect(items).toEqual([
			{ json: { id: 1 }, pairedItem: { item: 0 } },
			{ json: { id: 2 }, pairedItem: { item: 0 } },
		]);
	});

	test('throws a failed request also when the node continues on error', async () => {
		httpRequest.mockRejectedValueOnce(new Error('Service unavailable'));

		await expect(
			runStandaloneRouting(
				{ ...context, node: { ...node, onError: 'continueRegularOutput' } },
				nodeType,
				{ request: { url: '/items' } },
			),
		).rejects.toThrow('Service unavailable');
	});

	describe('extra keys', () => {
		test('are available when the request is built', async () => {
			respond({});

			await run(
				{ request: { url: '/items', qs: { since: '={{ $cursor.value }}' } } },
				{
					$cursor: { value: 7 },
				},
			);

			expect(httpRequest.mock.lastCall?.[0].qs).toEqual({ since: 7 });
		});

		test('are available in postReceive actions', async () => {
			respond({ items: [{ id: 1 }, { id: 5 }, { id: 9 }] });

			const items = await run(
				{
					request: { url: '/items' },
					output: {
						postReceive: [
							{ type: 'rootProperty', properties: { property: 'items' } },
							{ type: 'filter', properties: { pass: '={{ $responseItem.id > $cursor.value }}' } },
						],
					},
				},
				{ $cursor: { value: 4 } },
			);

			expect(items.map((item) => item.json)).toEqual([{ id: 5 }, { id: 9 }]);
		});

		test('are available during pagination', async () => {
			respond({ page: 1 });
			respond({ page: 2 });

			await run(
				{
					request: { url: '/items' },
					send: { paginate: true },
					operations: {
						pagination: {
							type: 'generic',
							properties: {
								continue: '={{ $response.body.page < $maxPages }}',
								request: { qs: { page: '={{ $response.body.page + 1 }}' } },
							},
						},
					},
				},
				{ $maxPages: 2 },
			);

			expect(httpRequest).toHaveBeenCalledTimes(2);
			expect(httpRequest.mock.lastCall?.[0].qs).toEqual({ page: 2 });
		});

		test('do not replace a built-in key with the same name', async () => {
			respond({});

			await run({ request: { url: '=/v{{ $version }}/items' } }, { $version: 99 });

			expect(httpRequest.mock.lastCall?.[0].url).toBe('/v1/items');
		});
	});

	describe('credentials', () => {
		const credentialNodeType: INodeType = {
			description: { ...nodeType.description, credentials: [{ name: 'testApi', required: true }] },
		};
		const credentialNode: INode = { ...node, credentials: { testApi: { id: 'c1', name: 'Test' } } };
		const credentialsHelper = mock<ICredentialsHelper>();
		const credentialContext = {
			...context,
			node: credentialNode,
			workflow: new Workflow({
				id: 'w1',
				nodes: [credentialNode],
				connections: {},
				active: true,
				nodeTypes: mock<INodeTypes>({ getByNameAndVersion: () => credentialNodeType }),
			}),
			additionalData: mock<IWorkflowExecuteAdditionalData>({
				...additionalDataFields,
				credentialsHelper,
			}),
		};

		beforeEach(() => {
			credentialsHelper.getDecrypted.mockReset();
			credentialsHelper.getDecrypted.mockResolvedValue({ apiKey: 'k' });
			credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);
		});

		test('passes the credential options to every credential load', async () => {
			respond({ id: 1 });

			await runStandaloneRouting(
				credentialContext,
				credentialNodeType,
				{ request: { url: '/items' } },
				{},
				{ credentialUsage: 'trigger' },
			);

			// Once in RoutingNode.prepareCredentials and once in the request helper.
			expect(credentialsHelper.getDecrypted).toHaveBeenCalledTimes(2);
			for (const call of credentialsHelper.getDecrypted.mock.calls) {
				expect(call[CREDENTIAL_OPTIONS_ARG]).toEqual({ credentialUsage: 'trigger' });
			}
		});

		test('loads credentials without options by default', async () => {
			respond({ id: 1 });

			await runStandaloneRouting(credentialContext, credentialNodeType, {
				request: { url: '/items' },
			});

			expect(credentialsHelper.getDecrypted).toHaveBeenCalled();
			for (const call of credentialsHelper.getDecrypted.mock.calls) {
				expect(call[CREDENTIAL_OPTIONS_ARG]).toBeUndefined();
			}
		});
	});
});
