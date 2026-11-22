import type { Logger } from '@n8n/backend-common';
import { OutboundHttp, type SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { ExecuteContext, RoutingNode } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialsHelper,
	IExecuteData,
	IHttpRequestOptions,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { Workflow, createEmptyRunExecutionData } from 'n8n-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import { generateCustomNodeDescription } from '../node-description.generator';
import { pinValues } from '../version-pin';
import { createInvoice, getInvoice, node as customNode } from './custom-node.fixture';

const HOST = 'https://billing.acme.test';
const API_KEY_HEADER = 'X-Api-Key';

const description = generateCustomNodeDescription(customNode, [getInvoice, createInvoice]);
const nodeType: INodeType = { description };

/** A credential for the generic header auth of the fixture. */
function headerCredential(extra: ICredentialDataDecryptedObject = {}): ICredentialsDecrypted {
	return {
		id: 'cred-1',
		name: 'Acme Key',
		type: 'httpHeaderAuth',
		data: { name: API_KEY_HEADER, value: 'k', ...extra },
	};
}

/** Adds the header the same way the generic `httpHeaderAuth` credential does. */
function credentialsHelper(): ICredentialsHelper {
	const helper = mock<ICredentialsHelper>();
	helper.getParentTypes.mockReturnValue([]);
	helper.preAuthentication.mockResolvedValue(undefined);
	helper.authenticate.mockImplementation(async (credentials, _type, requestOptions) => {
		const options = requestOptions as IHttpRequestOptions;
		options.headers = {
			...options.headers,
			[credentials.name as string]: credentials.value as string,
		};
		return options;
	});
	return helper;
}

async function run(
	parameters: INodeParameters,
	options: { credential?: ICredentialsDecrypted; continueOnFail?: boolean } = {},
): Promise<INodeExecutionData[][]> {
	const nodeTypes: INodeTypes = {
		getByName: () => nodeType,
		getByNameAndVersion: () => nodeType,
		getKnownTypes: () => ({}),
	};
	const node: INode = {
		id: 'node-1',
		name: 'Acme Billing',
		type: `n8n-custom.${description.name}`,
		typeVersion: 1,
		position: [0, 0],
		parameters,
		...(options.continueOnFail && { onError: 'continueRegularOutput' }),
	};
	const workflow = new Workflow({
		id: 'wf',
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes,
	});
	// The Workflow constructor adds the default values of the node parameters.
	const workflowNode = workflow.getNode(node.name)!;

	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		credentialsHelper: credentialsHelper(),
		evalLlmMockHandler: undefined,
		ssrfBridge: undefined,
	});
	const inputData = { main: [[{ json: {} }]] };
	const executeData: IExecuteData = { data: inputData, node: workflowNode, source: null };
	const context = new ExecuteContext(
		workflow,
		workflowNode,
		additionalData,
		'manual',
		createEmptyRunExecutionData(),
		0,
		[],
		inputData,
		executeData,
		[],
	);

	const routingNode = new RoutingNode(context, nodeType, options.credential ?? headerCredential());
	return (await routingNode.runNode()) ?? [];
}

const getInvoicePin = pinValues({ actionId: 'act_get', actionName: 'Get Invoice', version: 1 });

describe('custom node execution', () => {
	beforeAll(() => {
		nock.disableNetConnect();
		Container.set(
			OutboundHttp,
			new OutboundHttp(
				mock<SsrfProtectionService>(),
				Object.assign(new SsrfProtectionConfig(), { enabled: false }),
				mock<Logger>(),
			),
		);
	});

	afterEach(() => {
		nock.cleanAll();
	});

	afterAll(() => {
		nock.enableNetConnect();
	});

	it('sends GET /api/invoices/inv_1?expand=customer&include_lines=true with the header credential', async () => {
		const scope = nock(HOST)
			.get('/api/invoices/inv_1')
			.query({ expand: 'customer', include_lines: 'true' })
			.matchHeader(API_KEY_HEADER, 'k')
			.reply(200, { id: 'inv_1' });

		const result = await run({
			...getInvoicePin,
			invoiceId: 'inv_1',
			additionalFields: { includeLines: true },
		});

		expect(result[0][0].json).toEqual({ id: 'inv_1' });
		expect(scope.isDone()).toBe(true);
	});

	it('sends a JSON body with nested keys for Create Invoice version 2', async () => {
		let sentBody: unknown;
		const scope = nock(HOST)
			.post('/api/v2/invoices', (body: unknown) => {
				sentBody = body;
				return true;
			})
			.matchHeader('X-Api-Version', '2')
			.matchHeader('Idempotency-Key', 'key-1')
			.matchHeader(API_KEY_HEADER, 'k')
			.reply(201, { id: 'inv_2' });

		const result = await run({
			...pinValues({ actionId: 'act_create', actionName: 'Create Invoice', version: 2 }),
			amount: 100,
			additionalFields: {
				currency: 'usd',
				lineItems0Price: 5,
				metadata: '{"order":{"ref":"o-1"}}',
				idempotencyKey: 'key-1',
			},
		});

		expect(scope.isDone()).toBe(true);
		expect(sentBody).toEqual({
			amount: 100,
			currency: 'usd',
			line_items: [{ price: 5 }],
			metadata: { order: { ref: 'o-1' } },
		});
		expect(result[0][0].json).toEqual({ id: 'inv_2' });
	});

	it('runs version 1 for a node pinned to version 1 after version 2 exists', async () => {
		// The fixture action has version 1 and version 2.
		expect(createInvoice.versions.map((v) => v.version)).toEqual([1, 2]);

		let sentBody: unknown;
		const scope = nock(HOST)
			.post('/api/invoices', (body: unknown) => {
				sentBody = body;
				return true;
			})
			.matchHeader('X-Api-Version', '1')
			.matchHeader(API_KEY_HEADER, 'k')
			.reply(201, { id: 'inv_3' });

		const result = await run({
			...pinValues({ actionId: 'act_create', actionName: 'Create Invoice', version: 1 }),
			amount: 7,
			customerId: 'cus_1',
		});

		expect(scope.isDone()).toBe(true);
		expect(sentBody).toEqual({
			source: 'n8n',
			meta: { channel: 'api', tags: ['a', 'b'] },
			amount: 7,
			customer: { id: 'cus_1' },
		});
		expect(result[0][0].json).toEqual({ id: 'inv_3' });
	});

	it('sends a URL input value of ".." as an encoded path segment that keeps the path structure', async () => {
		const seenPaths: string[] = [];
		// Record the path in the reply: nock can call a path matcher more than once.
		const scope = nock(HOST)
			.get(() => true)
			.query(true)
			.reply((uri) => {
				seenPaths.push(uri);
				return [200, { ok: true }];
			});

		await run({ ...getInvoicePin, invoiceId: '..' });

		expect(scope.isDone()).toBe(true);
		expect(seenPaths).toHaveLength(1);
		const [path] = seenPaths;
		expect(path.split('?')[0]).toBe('/api/invoices/%252E%252E');
		// The URL parser does not resolve the segment, so the request stays below the action path.
		expect(new URL(path, HOST).pathname).toBe('/api/invoices/%252E%252E');
	});

	it('fails the item with an error for a JSON input that is not valid JSON', async () => {
		const scope = nock(HOST).post(/.*/).reply(201, {});

		const result = await run(
			{
				...pinValues({ actionId: 'act_create', actionName: 'Create Invoice', version: 2 }),
				amount: 100,
				additionalFields: { metadata: '{not json' },
			},
			{ continueOnFail: true },
		);

		expect(result[0]).toHaveLength(1);
		expect(result[0][0].error?.message).toMatch(/parsing failed/i);
		expect(scope.isDone()).toBe(false);
	});

	it('refuses a request to a host outside the credential allowed domains', async () => {
		const scope = nock(HOST).get(/.*/).query(true).reply(200, { id: 'inv_1' });

		const credential = headerCredential({
			allowedHttpRequestDomains: 'domains',
			allowedDomains: 'api.other.test',
		});

		await expect(run({ ...getInvoicePin, invoiceId: 'inv_1' }, { credential })).rejects.toThrow(
			/Domain not allowed.*billing\.acme\.test/,
		);
		expect(scope.isDone()).toBe(false);
	});
});
