import type { Logger } from '@n8n/backend-common';
import { OutboundHttp, type SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { ExecuteContext, RoutingNode } from 'n8n-core';
import type {
	EngineResponse,
	ICredentialDataDecryptedObject,
	ICredentialsHelper,
	IExecuteFunctions,
	IExecuteData,
	IHttpRequestOptions,
	INode,
	INodeCredentials,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import {
	Node,
	NodeHelpers,
	NodeOperationError,
	Workflow,
	createEmptyRunExecutionData,
	isNodeClassInstance,
} from 'n8n-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import { shouldAssignExecuteMethod } from '@/utils';

import type { ServedActionVersions } from '../custom-node-type';
import type { ActionView } from '../node-description.generator';
import {
	CUSTOM_RESOURCE_VALUE,
	buildParentRuntimeDescription,
	extendParentDescription,
	parentPinValues,
	parentShape,
} from '../parent-action.generator';
import { createParentNodeType, type ParentExtension } from '../parent-node-type';
import { pinValues } from '../version-pin';
import {
	declarativeParent,
	listPayouts,
	operationParent,
	refundPayment,
	resourceParent,
} from './parent-node.fixture';

const HOST = 'https://api.acme.test';
const KEY_HEADER = 'X-Api-Key';
const PARENT_DEFAULT_HEADER = 'X-Parent-Default';

const actions = [refundPayment, listPayouts];

const refundV2 = parentPinValues('resource', {
	actionId: 'act_refund',
	actionName: 'Refund Payment',
	version: 2,
});
const refundV1 = parentPinValues('resource', {
	actionId: 'act_refund',
	actionName: 'Refund Payment',
	version: 1,
});

function servedOf(views: ActionView[]): ServedActionVersions {
	return new Map(views.map((view) => [view.id, new Set(view.versions.map((v) => v.version))]));
}

function extensionOf(description: INodeTypeDescription, views: ActionView[]): ParentExtension {
	const shape = parentShape(description);
	if (!shape) throw new Error(`"${description.name}" cannot be a parent`);
	return {
		shape,
		extendedDescription: extendParentDescription(description, shape, views),
		runtimeDescription:
			views.length > 0 ? buildParentRuntimeDescription(description, views) : undefined,
		served: servedOf(views),
	};
}

/** Adds the header from the credential data, as the generic header auth does. */
function credentialsHelper(dataByType: Record<string, ICredentialDataDecryptedObject>) {
	const helper = mock<ICredentialsHelper>();
	helper.getParentTypes.mockReturnValue([]);
	helper.preAuthentication.mockResolvedValue(undefined);
	helper.isCredentialUsableByNode.mockReturnValue(true);
	helper.getDecrypted.mockImplementation(async (_data, _credentials, type) => {
		const data = dataByType[type];
		if (!data) throw new Error(`No credential data for "${type}"`);
		return data;
	});
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

const keyOf = (type: string, extra: ICredentialDataDecryptedObject = {}) => ({
	[type]: { name: KEY_HEADER, value: `${type}-key`, ...extra },
});

/** An execute context whose workflow resolves the node type to `type`, as `NodeTypes` does. */
function createContext(
	type: INodeType,
	parameters: INodeParameters,
	credentials: INodeCredentials,
	dataByType: Record<string, ICredentialDataDecryptedObject>,
): ExecuteContext {
	const nodeTypes: INodeTypes = {
		getByName: () => type,
		getByNameAndVersion: () => type,
		getKnownTypes: () => ({}),
	};
	const node: INode = {
		id: 'node-1',
		name: 'Acme',
		type: `n8n-nodes-base.${type.description.name}`,
		typeVersion: 1,
		position: [0, 0],
		parameters,
		credentials,
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
		credentialsHelper: credentialsHelper(dataByType),
		evalLlmMockHandler: undefined,
		ssrfBridge: undefined,
		// A mock value here would hide the node parameters from the credential display check.
		currentNodeParameters: undefined,
	});
	const inputData = { main: [[{ json: {} }]] };
	const executeData: IExecuteData = { data: inputData, node: workflowNode, source: null };
	return new ExecuteContext(
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
}

/**
 * Calls `execute` as the engine does. First the engine checks the node parameters against the
 * description, then a `Node` subclass gets the context as an argument.
 */
async function execute(type: INodeType, context: ExecuteContext, response?: EngineResponse) {
	if (!type.execute) throw new Error('The node type has no execute');
	const issues = NodeHelpers.getNodeParametersIssues(
		type.description.properties,
		context.getNode(),
		type.description,
	);
	if (issues !== null) throw new Error(`The node has parameter issues: ${JSON.stringify(issues)}`);
	const data = isNodeClassInstance(type)
		? await type.execute(context, response)
		: await type.execute.call(context, response);
	return data as INodeExecutionData[][];
}

const builtInResult: INodeExecutionData[][] = [[{ json: { builtIn: true } }]];

/** A programmatic parent with an `execute` that records its calls. */
function programmaticParent(description: INodeTypeDescription) {
	const original = {
		description,
		execute: vi.fn(async function (this: unknown) {
			return builtInResult;
		}),
	};
	return original;
}

describe('parent node type', () => {
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
		Container.reset();
	});

	const billingCredentials: INodeCredentials = {
		acmeBillingApi: { id: 'cred-1', name: 'Billing Key' },
	};

	function runResourceParent(
		original: INodeType,
		parameters: INodeParameters,
		extra: ICredentialDataDecryptedObject = {},
	) {
		const type = createParentNodeType(original, extensionOf(resourceParent, actions));
		const context = createContext(
			type,
			parameters,
			billingCredentials,
			keyOf('acmeBillingApi', extra),
		);
		return { type, context, result: execute(type, context) };
	}

	describe('custom action in a programmatic parent', () => {
		it('sends the request of the action with the credential of the parent', async () => {
			let sentBody: unknown;
			const scope = nock(HOST)
				.post('/v2/payments/pay_1/refunds', (body: unknown) => {
					sentBody = body;
					return true;
				})
				.matchHeader(KEY_HEADER, 'acmeBillingApi-key')
				.reply(200, { id: 're_1' });
			const original = programmaticParent(resourceParent);

			const { result } = runResourceParent(original, {
				...refundV2,
				customAction_paymentId: 'pay_1',
				customAction_additionalFields: { reason: 'duplicate' },
			});

			expect((await result)[0][0].json).toEqual({ id: 're_1' });
			expect(scope.isDone()).toBe(true);
			expect(sentBody).toEqual({ source: 'n8n', reason: 'duplicate' });
			expect(original.execute).not.toHaveBeenCalled();
		});

		it('runs the original execute for a built-in operation, with the same context, and sends no request', async () => {
			const scope = nock(HOST).post(/.*/).reply(200, {});
			const original = programmaticParent(resourceParent);

			const { context, result } = runResourceParent(original, {
				resource: 'invoice',
				operation: 'get',
				invoiceId: 'inv_1',
			});

			expect(await result).toBe(builtInResult);
			expect(original.execute).toHaveBeenCalledTimes(1);
			expect(original.execute.mock.contexts[0]).toBe(context);
			expect(scope.isDone()).toBe(false);
		});

		it('keeps a node on version 1 after version 2 exists', async () => {
			expect(refundPayment.versions.map((v) => v.version)).toEqual([1, 2]);
			const scope = nock(HOST)
				.post('/v1/payments/pay_1/refund')
				.matchHeader(KEY_HEADER, 'acmeBillingApi-key')
				.reply(200, { id: 're_v1' });

			const { result } = runResourceParent(programmaticParent(resourceParent), {
				...refundV1,
				customAction_paymentId: 'pay_1',
			});

			expect((await result)[0][0].json).toEqual({ id: 're_v1' });
			expect(scope.isDone()).toBe(true);
		});

		it('fails with the name of the action when the action does not exist, and sends no request', async () => {
			const scope = nock(HOST).post(/.*/).reply(200, {});
			const original = programmaticParent(resourceParent);

			const { result } = runResourceParent(original, {
				...parentPinValues('resource', {
					actionId: 'act_gone',
					actionName: 'Old Action',
					version: 1,
				}),
			});

			const error = await result.catch((e: unknown) => e);
			expect(error).toBeInstanceOf(NodeOperationError);
			expect((error as Error).message).toMatch(
				/The action "Old Action" does not exist any more or is not available for this node/,
			);
			expect(scope.isDone()).toBe(false);
			expect(original.execute).not.toHaveBeenCalled();
		});

		it('fails when the Custom resource is selected and no action is selected', async () => {
			const scope = nock(HOST).post(/.*/).reply(200, {});
			const original = programmaticParent(resourceParent);

			const { result } = runResourceParent(original, { resource: CUSTOM_RESOURCE_VALUE });

			await expect(result).rejects.toThrow(/No action is selected\. Select an action/);
			expect(scope.isDone()).toBe(false);
			expect(original.execute).not.toHaveBeenCalled();
		});

		it('does not change the loaded node type', async () => {
			const scope = nock(HOST).post('/v1/payments/pay_1/refund').reply(200, { id: 're_1' });
			const original = programmaticParent(resourceParent);
			const originalExecute = original.execute;
			const ownKeys = Reflect.ownKeys(original);
			const descriptionBefore = structuredClone(resourceParent);
			const extension = extensionOf(resourceParent, actions);

			const type = createParentNodeType(original, extension);
			await execute(
				type,
				createContext(
					type,
					{ ...refundV1, customAction_paymentId: 'pay_1' },
					billingCredentials,
					keyOf('acmeBillingApi'),
				),
			);
			await execute(
				type,
				createContext(type, { resource: 'customer' }, billingCredentials, keyOf('acmeBillingApi')),
			);

			expect(scope.isDone()).toBe(true);
			expect(Object.getPrototypeOf(type)).toBe(original);
			expect(type.description).toBe(extension.extendedDescription);
			expect(Reflect.ownKeys(original)).toEqual(ownKeys);
			expect(original.description).toBe(resourceParent);
			expect(resourceParent).toEqual(descriptionBefore);
			expect(original.execute).toBe(originalExecute);

			// A node type without `execute` gets no own `execute` from the copy.
			const bare: INodeType = { description: resourceParent };
			createParentNodeType(bare, extension);
			expect(Reflect.ownKeys(bare)).toEqual(['description']);
		});
	});

	describe('custom action in a declarative parent', () => {
		// A default header shows whether a request uses the request defaults of the parent.
		const description: INodeTypeDescription = {
			...declarativeParent,
			requestDefaults: {
				...declarativeParent.requestDefaults,
				headers: { [PARENT_DEFAULT_HEADER]: 'parent' },
			},
		};
		const paymentsCredentials: INodeCredentials = {
			acmePaymentsApi: { id: 'cred-2', name: 'Payments Key' },
		};

		/** The copy reads `execute` at call time, so `NodeTypes` can add it before or after the copy exists. */
		function declarativeType() {
			const original: INodeType = { description };
			const type = createParentNodeType(original, extensionOf(description, actions));
			if (shouldAssignExecuteMethod(original)) {
				original.execute = async function (this: ExecuteContext) {
					return (await new RoutingNode(this, original).runNode()) ?? [];
				};
			}
			return type;
		}

		it('sends a built-in operation to the base URL of the parent', async () => {
			const scope = nock(HOST)
				.get('/v1/payments')
				.matchHeader(PARENT_DEFAULT_HEADER, 'parent')
				.matchHeader(KEY_HEADER, 'acmePaymentsApi-key')
				.reply(200, { data: [] });
			const type = declarativeType();

			const result = await execute(
				type,
				createContext(
					type,
					{ resource: 'payment', operation: 'getAll' },
					paymentsCredentials,
					keyOf('acmePaymentsApi'),
				),
			);

			expect(scope.isDone()).toBe(true);
			expect(result[0][0].json).toEqual({ data: [] });
		});

		it('sends a custom action to its own URL without the request defaults of the parent', async () => {
			const scope = nock(HOST, { badheaders: [PARENT_DEFAULT_HEADER] })
				.post('/v2/payments/pay_1/refunds')
				.matchHeader(KEY_HEADER, 'acmePaymentsApi-key')
				.reply(200, { id: 're_1' });
			const type = declarativeType();

			const result = await execute(
				type,
				createContext(
					type,
					{ ...refundV2, customAction_paymentId: 'pay_1' },
					paymentsCredentials,
					keyOf('acmePaymentsApi'),
				),
			);

			expect(scope.isDone()).toBe(true);
			expect(result[0][0].json).toEqual({ id: 're_1' });
		});
	});

	describe('custom action in a parent without resource', () => {
		const ledgerCredentials: INodeCredentials = {
			acmeLedgerApi: { id: 'cred-3', name: 'Ledger Key' },
			acmeLedgerOAuth2Api: { id: 'cred-4', name: 'Ledger OAuth2' },
		};
		const ledgerData = { ...keyOf('acmeLedgerApi'), ...keyOf('acmeLedgerOAuth2Api') };
		const payoutsPin = pinValues({
			actionId: 'act_payouts',
			actionName: 'List Payouts',
			version: 1,
		});

		it('uses the credential that the authentication parameter selects', async () => {
			const scope = nock(HOST)
				.get('/v1/payouts')
				.query({ limit: '5' })
				.matchHeader(KEY_HEADER, 'acmeLedgerOAuth2Api-key')
				.reply(200, { data: ['po_1'] });
			const original = programmaticParent(operationParent);
			const type = createParentNodeType(original, extensionOf(operationParent, actions));

			const result = await execute(
				type,
				createContext(
					type,
					{ authentication: 'oAuth2', ...payoutsPin, customAction_limit: 5, limit: 50 },
					ledgerCredentials,
					ledgerData,
				),
			);

			expect(scope.isDone()).toBe(true);
			expect(result[0][0].json).toEqual({ data: ['po_1'] });
			expect(original.execute).not.toHaveBeenCalled();
		});

		it('runs the original execute for a built-in operation value', async () => {
			const scope = nock(HOST).get(/.*/).query(true).reply(200, {});
			const original = programmaticParent(operationParent);
			const type = createParentNodeType(original, extensionOf(operationParent, actions));
			const context = createContext(
				type,
				{ authentication: 'apiKey', operation: 'export' },
				ledgerCredentials,
				ledgerData,
			);

			expect(await execute(type, context)).toBe(builtInResult);
			expect(original.execute).toHaveBeenCalledTimes(1);
			expect(original.execute.mock.contexts[0]).toBe(context);
			expect(scope.isDone()).toBe(false);
		});
	});

	describe('custom action in a class-style parent', () => {
		/** A `Node` subclass parent. It records the receiver and the arguments of each call. */
		class AcmeLedgerNode extends Node {
			description = operationParent;

			calls: Array<{ self: unknown; context: unknown; response: unknown }> = [];

			async execute(context: IExecuteFunctions, response?: EngineResponse) {
				this.calls.push({ self: this, context, response });
				return builtInResult;
			}
		}

		const ledgerCredentials: INodeCredentials = {
			acmeLedgerApi: { id: 'cred-3', name: 'Ledger Key' },
		};

		/** The node loader hands a `Node` subclass instance to `NodeTypes` as an `INodeType`. */
		const asLoaded = (instance: Node) => instance as unknown as INodeType;

		it('runs the original class execute on the original instance for a built-in operation, and sends no request', async () => {
			const scope = nock(HOST).get(/.*/).query(true).reply(200, {});
			const original = new AcmeLedgerNode();
			const type = createParentNodeType(asLoaded(original), extensionOf(operationParent, actions));
			const context = createContext(
				type,
				{ authentication: 'apiKey', operation: 'export' },
				ledgerCredentials,
				keyOf('acmeLedgerApi'),
			);
			const response = mock<EngineResponse>();

			expect(isNodeClassInstance(type)).toBe(true);
			expect(await execute(type, context, response)).toBe(builtInResult);
			expect(original.calls).toHaveLength(1);
			expect(original.calls[0].self).toBe(original);
			expect(original.calls[0].context).toBe(context);
			expect(original.calls[0].response).toBe(response);
			expect(scope.isDone()).toBe(false);
		});

		it('sends the request of the action with the credential of the parent', async () => {
			const scope = nock(HOST)
				.get('/v1/payouts')
				.query({ limit: '5' })
				.matchHeader(KEY_HEADER, 'acmeLedgerApi-key')
				.reply(200, { data: ['po_1'] });
			const original = new AcmeLedgerNode();
			const type = createParentNodeType(asLoaded(original), extensionOf(operationParent, actions));

			const result = await execute(
				type,
				createContext(
					type,
					{
						authentication: 'apiKey',
						...pinValues({ actionId: 'act_payouts', actionName: 'List Payouts', version: 1 }),
						customAction_limit: 5,
					},
					ledgerCredentials,
					keyOf('acmeLedgerApi'),
				),
			);

			expect(scope.isDone()).toBe(true);
			expect(result[0][0].json).toEqual({ data: ['po_1'] });
			expect(original.calls).toHaveLength(0);
		});
	});

	describe('a node that selects a custom action that does not exist', () => {
		const ledgerCredentials: INodeCredentials = {
			acmeLedgerApi: { id: 'cred-3', name: 'Ledger Key' },
		};
		const echoRef = { actionId: 'act_echo', actionName: 'Get Echo Item', version: 1 };
		const missingMessage =
			/The action "Get Echo Item" does not exist any more or is not available for this node/;

		/** Runs the node as the engine does: the `Workflow` constructor and the parameter check come first. */
		async function runParent(
			description: INodeTypeDescription,
			views: ActionView[],
			parameters: INodeParameters,
			credentials: INodeCredentials,
			dataByType: Record<string, ICredentialDataDecryptedObject>,
		) {
			const original = programmaticParent(description);
			const type = createParentNodeType(original, extensionOf(description, views));
			const context = createContext(type, parameters, credentials, dataByType);
			const result = await execute(type, context).catch((e: unknown) => e);
			return { original, result };
		}

		it.each<[string, INodeTypeDescription, INodeParameters, INodeCredentials, string]>([
			[
				'resource',
				resourceParent,
				parentPinValues('resource', echoRef),
				billingCredentials,
				'acmeBillingApi',
			],
			[
				'operation',
				operationParent,
				{ authentication: 'apiKey', ...parentPinValues('operation', echoRef) },
				ledgerCredentials,
				'acmeLedgerApi',
			],
		])(
			'fails with the name of the action in the %s shape when the parent has no actions',
			async (_shape, description, parameters, credentials, credentialType) => {
				const scope = nock(HOST).persist().get(/.*/).query(true).reply(200, {});
				scope.post(/.*/).query(true).reply(200, {});

				const { original, result } = await runParent(
					description,
					[],
					parameters,
					credentials,
					keyOf(credentialType),
				);

				expect(result).toBeInstanceOf(NodeOperationError);
				expect((result as Error).message).toMatch(missingMessage);
				expect(original.execute).not.toHaveBeenCalled();
				expect(scope.isDone()).toBe(false);
			},
		);

		it('fails with the name of the action when the parent has other actions only', async () => {
			const scope = nock(HOST).persist().get(/.*/).query(true).reply(200, {});

			const { original, result } = await runParent(
				operationParent,
				[listPayouts],
				{ authentication: 'apiKey', ...parentPinValues('operation', echoRef) },
				ledgerCredentials,
				keyOf('acmeLedgerApi'),
			);

			expect((result as Error).message).toMatch(missingMessage);
			expect(original.execute).not.toHaveBeenCalled();
			expect(scope.isDone()).toBe(false);
		});

		it('runs a served action for an operation-shape node that stores only the operation', async () => {
			const scope = nock(HOST)
				.get('/v1/payouts')
				.query({ limit: '5' })
				.matchHeader(KEY_HEADER, 'acmeLedgerApi-key')
				.reply(200, { data: ['po_1'] });
			const { operation } = pinValues({
				actionId: 'act_payouts',
				actionName: 'List Payouts',
				version: 1,
			});

			const { original, result } = await runParent(
				operationParent,
				[listPayouts],
				{ authentication: 'apiKey', operation, customAction_limit: 5 },
				ledgerCredentials,
				keyOf('acmeLedgerApi'),
			);

			expect((result as INodeExecutionData[][])[0][0].json).toEqual({ data: ['po_1'] });
			expect(scope.isDone()).toBe(true);
			expect(original.execute).not.toHaveBeenCalled();
		});

		it('fails with the action id for an operation-shape node that stores only the operation of a missing action', async () => {
			const scope = nock(HOST).persist().get(/.*/).query(true).reply(200, {});
			const { operation } = pinValues(echoRef);

			const { original, result } = await runParent(
				operationParent,
				[listPayouts],
				{ authentication: 'apiKey', operation },
				ledgerCredentials,
				keyOf('acmeLedgerApi'),
			);

			expect(result).toBeInstanceOf(NodeOperationError);
			expect((result as Error).message).toMatch(/The action "act_echo" does not exist any more/);
			expect(original.execute).not.toHaveBeenCalled();
			expect(scope.isDone()).toBe(false);
		});
	});

	describe('parameter check of the engine', () => {
		it.each<[string, INodeTypeDescription, INodeParameters]>([
			['resource', resourceParent, { ...refundV2, customAction_paymentId: 'pay_1' }],
			[
				'operation',
				operationParent,
				{
					authentication: 'apiKey',
					...parentPinValues('operation', {
						actionId: 'act_payouts',
						actionName: 'List Payouts',
						version: 1,
					}),
					customAction_limit: 5,
				},
			],
		])(
			'finds no issue for a valid custom selection in the %s shape',
			(_shape, description, params) => {
				const type = createParentNodeType(
					programmaticParent(description),
					extensionOf(description, actions),
				);
				const node = createContext(
					type,
					params,
					billingCredentials,
					keyOf('acmeBillingApi'),
				).getNode();

				expect(
					NodeHelpers.getNodeParametersIssues(type.description.properties, node, type.description),
				).toBeNull();
			},
		);

		it('finds the missing required input of a custom action', () => {
			const type = createParentNodeType(
				programmaticParent(resourceParent),
				extensionOf(resourceParent, actions),
			);
			const node = createContext(
				type,
				refundV2,
				billingCredentials,
				keyOf('acmeBillingApi'),
			).getNode();

			const issues = NodeHelpers.getNodeParametersIssues(
				type.description.properties,
				node,
				type.description,
			);
			expect(Object.keys(issues?.parameters ?? {})).toEqual(['customAction_paymentId']);
		});
	});

	describe('credential domain restrictions', () => {
		it.each([
			['all', undefined, 'sends'],
			['domains', 'api.acme.test', 'sends'],
			['domains', 'other.test', 'blocks'],
			['none', undefined, 'blocks'],
		])('mode %s with list %s %s the request', async (mode, allowedDomains, outcome) => {
			const scope = nock(HOST).post('/v1/payments/pay_1/refund').reply(200, { id: 're_1' });

			const { result } = runResourceParent(
				programmaticParent(resourceParent),
				{ ...refundV1, customAction_paymentId: 'pay_1' },
				{
					allowedHttpRequestDomains: mode,
					...(allowedDomains !== undefined && { allowedDomains }),
				},
			);

			if (outcome === 'sends') {
				expect((await result)[0][0].json).toEqual({ id: 're_1' });
				expect(scope.isDone()).toBe(true);
			} else {
				await expect(result).rejects.toThrow(
					mode === 'none'
						? /configured to prevent use within an admin-defined node/
						: /Domain not allowed.*api\.acme\.test/,
				);
				expect(scope.isDone()).toBe(false);
			}
		});
	});
});
