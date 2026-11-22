import type { Logger } from '@n8n/backend-common';
import { OutboundHttp, type SsrfProtectionService } from '@n8n/backend-network';
import { SsrfProtectionConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { ExecuteContext } from 'n8n-core';
import type {
	ICredentialsHelper,
	IExecuteData,
	IHttpRequestOptions,
	INode,
	INodeCredentials,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
	IWorkflowExecuteAdditionalData,
	LoadedClass,
} from 'n8n-workflow';
import { Workflow, createEmptyRunExecutionData, isNodeClassInstance } from 'n8n-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

import { CUSTOM_RESOURCE_VALUE, parentPinValues } from '../parent-action.generator';
import { ParentActionsProvider } from '../parent-actions.provider';
import { refundPayment, resourceParent } from './parent-node.fixture';

const HOST = 'https://api.acme.test';
const KEY_HEADER = 'X-Api-Key';

const NAME = 'n8n-nodes-base.acmeBilling';
const TOOL_NAME = `${NAME}Tool`;
const HITL_TOOL_NAME = `${NAME}HitlTool`;

const builtInResult: INodeExecutionData[][] = [[{ json: { builtIn: true } }]];

const refundV1 = parentPinValues('resource', {
	actionId: 'act_refund',
	actionName: 'Refund Payment',
	version: 1,
});

/** Adds the header from the credential data, as the generic header auth does. */
function credentialsHelper() {
	const helper = mock<ICredentialsHelper>();
	helper.getParentTypes.mockReturnValue([]);
	helper.preAuthentication.mockResolvedValue(undefined);
	helper.isCredentialUsableByNode.mockReturnValue(true);
	helper.getDecrypted.mockResolvedValue({ name: KEY_HEADER, value: 'acmeBillingApi-key' });
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

function createContext(
	nodeTypes: NodeTypes,
	parameters: INodeParameters,
	credentials: INodeCredentials,
): ExecuteContext {
	const node: INode = {
		id: 'node-1',
		name: 'Acme',
		type: NAME,
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
	const workflowNode = workflow.getNode(node.name)!;
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		credentialsHelper: credentialsHelper(),
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

/** Calls `execute` as the engine does: a `Node` subclass gets the context as an argument. */
async function execute(type: INodeType, context: ExecuteContext) {
	if (!type.execute) throw new Error('The node type has no execute');
	const data = isNodeClassInstance(type)
		? await type.execute(context)
		: await type.execute.call(context);
	return data as INodeExecutionData[][];
}

const propertyNames = (description: INodeTypeDescription) =>
	description.properties.map((property) => property.name);

const hasCustomOption = (description: INodeTypeDescription) =>
	JSON.stringify(description.properties).includes(CUSTOM_RESOURCE_VALUE);

describe('NodeTypes with custom actions in a parent node', () => {
	const description: INodeTypeDescription = { ...resourceParent, usableAsTool: true };
	const originalExecute = vi.fn(async function () {
		return builtInResult;
	});
	const loaded: LoadedClass<INodeType> = {
		sourcePath: '/nodes/acmeBilling/AcmeBilling.node.js',
		type: { description, execute: originalExecute },
	};

	let nodeTypes: NodeTypes;
	let provider: ParentActionsProvider;

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

	afterAll(() => {
		nock.enableNetConnect();
		Container.reset();
	});

	beforeEach(() => {
		originalExecute.mockClear();
		const loadNodesAndCredentials = mock<LoadNodesAndCredentials>({
			excludeNodes: [],
			loadedNodes: {},
		});
		loadNodesAndCredentials.getNode.mockImplementation((name) => {
			if (name !== NAME) throw new Error(`Unrecognized node type: ${name}`);
			return loaded;
		});
		loadNodesAndCredentials.recognizesNode.mockImplementation((name) => name === NAME);
		loadNodesAndCredentials.resolveNodeSourcePath.mockImplementation(
			(_name, sourcePath) => sourcePath,
		);
		loadNodesAndCredentials.types = {
			nodes: [{ ...description, name: NAME }],
			credentials: [],
		};
		loadNodesAndCredentials.supportsProxyAuth.mockReturnValue(true);

		provider = new ParentActionsProvider(
			loadNodesAndCredentials,
			mock<Logger>({ scoped: vi.fn().mockReturnThis() }),
		);
		provider.setActions(new Map([[NAME, [refundPayment]]]));
		provider.transformTypes();

		nodeTypes = new NodeTypes(mock<Logger>(), loadNodesAndCredentials);
		nodeTypes.setExtensionProvider(provider);
	});

	afterEach(() => {
		nock.cleanAll();
	});

	it('executes a custom action of a node type that getByNameAndVersion returns', async () => {
		const scope = nock(HOST)
			.post('/v1/payments/pay_1/refund')
			.matchHeader(KEY_HEADER, 'acmeBillingApi-key')
			.reply(200, { id: 're_1' });
		const type = nodeTypes.getByNameAndVersion(NAME, 1);
		const context = createContext(
			nodeTypes,
			{ ...refundV1, customAction_paymentId: 'pay_1' },
			{ acmeBillingApi: { id: 'cred-1', name: 'Billing Key' } },
		);

		const result = await execute(type, context);

		expect(result[0][0].json).toEqual({ id: 're_1' });
		expect(scope.isDone()).toBe(true);
		expect(originalExecute).not.toHaveBeenCalled();
	});

	it('returns the custom action in the description of POST /node-types (getDescriptionWithTranslation)', async () => {
		const result = await nodeTypes.getDescriptionWithTranslation(NAME, 1, 'en');

		expect(hasCustomOption(result)).toBe(true);
		expect(JSON.stringify(result.properties)).toContain('act_refund');
		expect(hasCustomOption(description)).toBe(false);
	});

	it('returns the custom action in getNodeTypeDescriptions', () => {
		const [result] = nodeTypes.getNodeTypeDescriptions([{ name: NAME, version: 1 }]);

		expect(result.name).toBe(NAME);
		expect(hasCustomOption(result)).toBe(true);
		expect(JSON.stringify(result.properties)).toContain('act_refund');
	});

	it('returns no custom action in the Tool variant and in the HitlTool variant, served and at run time', () => {
		for (const name of [TOOL_NAME, HITL_TOOL_NAME]) {
			const [served] = nodeTypes.getNodeTypeDescriptions([{ name, version: 1 }]);
			const runTime = nodeTypes.getByNameAndVersion(name, 1);

			for (const candidate of [served, runTime.description]) {
				expect(hasCustomOption(candidate)).toBe(false);
				expect(propertyNames(candidate).some((n) => n.startsWith('customAction_'))).toBe(false);
				expect(JSON.stringify(candidate.properties)).not.toContain('act_refund');
			}
		}
	});

	it('returns the loaded node type when the provider is removed', () => {
		nodeTypes.setExtensionProvider(undefined);

		expect(nodeTypes.getByNameAndVersion(NAME, 1)).toBe(loaded.type);
		expect(nodeTypes.getByName(NAME)).toBe(loaded.type);
	});
});
