import { DynamicTool } from '@langchain/core/tools';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { NodesConfig } from '@n8n/config';
import { CredentialAccessRepository, CredentialsRepository } from '@n8n/db';
import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { DeprecatedNodesValidationService } from '@/workflows/deprecated-nodes-validation.service';

import { EphemeralNodeExecutor } from '../ephemeral-node-executor';

const mockGetBase = vi.fn();

vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: (...args: unknown[]) => mockGetBase(...args),
}));

const describeNode = (overrides: Partial<INodeTypeDescription>): INodeTypeDescription => ({
	displayName: 'Node',
	name: 'node',
	group: ['transform'],
	version: 1,
	description: '',
	defaults: {},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [],
	...overrides,
});

describe('EphemeralNodeExecutor with deprecated node types', () => {
	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);
	const credentialAccessRepository = mockInstance(CredentialAccessRepository);
	const nodesConfig = mock<NodesConfig>();

	const runFunction = vi.fn();
	const runFunctionItem = vi.fn();
	const runApproval = vi.fn();
	const supplyLangChainCode = vi.fn();

	const nodesByType: Record<string, INodeType> = {
		'n8n-nodes-base.function': {
			description: describeNode({
				displayName: 'Function',
				name: 'function',
				deprecated: true,
				replacedByNodeType: 'n8n-nodes-base.code',
			}),
			execute: runFunction,
		},
		'n8n-nodes-base.functionItem': {
			description: describeNode({
				displayName: 'Function Item',
				name: 'functionItem',
				deprecated: true,
				replacedByNodeType: 'n8n-nodes-base.code',
			}),
			execute: runFunctionItem,
		},
		'n8n-nodes-base.code': { description: describeNode({ displayName: 'Code', name: 'code' }) },
		'@n8n/n8n-nodes-langchain.code': {
			description: describeNode({ displayName: 'LangChain Code', name: 'code', deprecated: true }),
			supplyData: supplyLangChainCode,
		},
		'n8n-nodes-base.approval': {
			description: describeNode({ displayName: 'Approval', name: 'approval' }),
			execute: runApproval,
		},
	};

	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>({ excludeNodes: [] });
	loadNodesAndCredentials.recognizesNode.mockImplementation((type) => type in nodesByType);
	loadNodesAndCredentials.getNode.mockImplementation((type) => {
		const node = nodesByType[type];
		if (!node) throw new Error(`Unknown node type "${type}"`);
		return { sourcePath: '', type: node };
	});

	const nodeTypes = new NodeTypes(logger, loadNodesAndCredentials);
	const executor = new EphemeralNodeExecutor(
		nodeTypes,
		mockInstance(CredentialsRepository),
		logger,
		mockInstance(PolicyEnforcementService),
		credentialAccessRepository,
		new DeprecatedNodesValidationService(logger, nodesConfig, nodeTypes),
	);

	const runAsTool = async (nodeType: string) =>
		await executor.executeInline({
			nodeType,
			nodeTypeVersion: 1,
			nodeParameters: {},
			inputData: [{ json: {} }],
			projectId: 'p-1',
		});

	beforeEach(() => {
		vi.clearAllMocks();
		nodesConfig.blockDeprecated = true;
		runFunction.mockResolvedValue([[{ json: { ran: true } }]]);
		runFunctionItem.mockResolvedValue([[{ json: { ran: true } }]]);
		runApproval.mockResolvedValue([[{ json: { approved: true } }]]);
		supplyLangChainCode.mockResolvedValue({
			response: new DynamicTool({ name: 'code', description: 'code', func: async () => 'ran' }),
		});
		mockGetBase.mockResolvedValue({});
		credentialAccessRepository.findCredentialNames.mockResolvedValue([]);
	});

	it.each([
		['n8n-nodes-base.functionHitlTool', 'Function', runFunction],
		['n8n-nodes-base.functionItemHitlTool', 'Function Item', runFunctionItem],
	])('refuses "%s" and never runs the node', async (nodeType, displayName, run) => {
		const result = await runAsTool(nodeType);

		expect(result).toEqual({
			status: 'error',
			data: [],
			error: `The "${displayName}" node is deprecated, so agents cannot run it. Use the "Code" node instead.`,
		});
		expect(run).not.toHaveBeenCalled();
	});

	it('refuses a deprecated node when the agent reads its tool schema, and never runs supplyData', async () => {
		const schema = await executor.introspectSupplyDataToolSchema({
			projectId: 'p-1',
			nodeType: '@n8n/n8n-nodes-langchain.code',
			nodeTypeVersion: 1,
			nodeParameters: {},
		});

		expect(schema).toBeNull();
		expect(supplyLangChainCode).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith('supplyData tool introspection failed', {
			nodeType: '@n8n/n8n-nodes-langchain.code',
			error:
				'The "LangChain Code" node is deprecated, so agents cannot run it. Remove this tool from the agent.',
		});
	});

	it('runs a deprecated node when the deprecated-node block is off', async () => {
		nodesConfig.blockDeprecated = false;

		const result = await runAsTool('n8n-nodes-base.functionHitlTool');

		expect(result).toEqual({ status: 'success', data: [{ json: { ran: true } }] });
	});

	it('runs a HitlTool built from a node that is not deprecated', async () => {
		const result = await runAsTool('n8n-nodes-base.approvalHitlTool');

		expect(result).toEqual({ status: 'success', data: [{ json: { approved: true } }] });
	});
});
