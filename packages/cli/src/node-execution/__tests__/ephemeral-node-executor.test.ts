import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import {
	CredentialsRepository,
	SharedCredentialsRepository,
	type CredentialsEntity,
	type SharedCredentials,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';
import {
	NodeConnectionTypes,
	UserError,
	type INodeCredentialsDetails,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

import { EphemeralNodeExecutor, isUsableAsAgentTool } from '../ephemeral-node-executor';

const mockGetBase = jest.fn();

jest.mock('@/workflow-execute-additional-data', () => ({
	getBase: (...args: unknown[]) => mockGetBase(...args),
}));

describe('isUsableAsAgentTool', () => {
	it('accepts a standard node with usableAsTool: true', () => {
		expect(isUsableAsAgentTool({ usableAsTool: true, outputs: ['main'] })).toBe(true);
	});

	it('accepts a native tool node that outputs AiTool (string form)', () => {
		expect(isUsableAsAgentTool({ outputs: [NodeConnectionTypes.AiTool] })).toBe(true);
	});

	it('accepts a native tool node that outputs AiTool (object form)', () => {
		expect(isUsableAsAgentTool({ outputs: [{ type: NodeConnectionTypes.AiTool }] })).toBe(true);
	});

	it('rejects a non-tool node with only main outputs and no flag', () => {
		expect(isUsableAsAgentTool({ outputs: ['main'] })).toBe(false);
	});

	it('rejects a description without outputs or flag', () => {
		expect(isUsableAsAgentTool({})).toBe(false);
	});

	it('ignores outputs that are not an array (e.g. expression form)', () => {
		expect(isUsableAsAgentTool({ outputs: '={{$json.out}}' })).toBe(false);
	});
});

describe('EphemeralNodeExecutor', () => {
	const nodeTypes = mockInstance(NodeTypes);
	const credentialsRepository = mockInstance(CredentialsRepository);
	const sharedCredentialsRepository = mockInstance(SharedCredentialsRepository);
	const logger = mockInstance(Logger);

	const executor = new EphemeralNodeExecutor(
		nodeTypes,
		credentialsRepository,
		sharedCredentialsRepository,
		logger,
	);

	const toolDescription: INodeTypeDescription = {
		displayName: 'Tool',
		name: 'testTool',
		group: ['output'],
		version: 1,
		description: 'Test tool',
		defaults: { name: 'Test' },
		inputs: [],
		outputs: [NodeConnectionTypes.AiTool],
		properties: [],
		usableAsTool: true,
	};

	beforeEach(() => {
		jest.clearAllMocks();
		mockGetBase.mockResolvedValue({});
	});

	describe('validateNodeForExecution (via executeInline)', () => {
		it('throws when the node is not usable as a tool', async () => {
			const nonToolDescription: INodeTypeDescription = {
				...toolDescription,
				usableAsTool: undefined,
				outputs: ['main'],
			};
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({ description: nonToolDescription }),
			);

			await expect(
				executor.executeInline({
					nodeType: 'n8n-nodes-base.notATool',
					nodeTypeVersion: 1,
					nodeParameters: {},
					inputData: [],
					projectId: 'p-1',
				}),
			).rejects.toThrow(UserError);
		});

		it('throws when the node is a trigger', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({ description: { ...toolDescription, group: ['trigger'] } }),
			);

			await expect(
				executor.executeInline({
					nodeType: 'n8n-nodes-base.triggerNode',
					nodeTypeVersion: 1,
					nodeParameters: {},
					inputData: [],
					projectId: 'p-1',
				}),
			).rejects.toThrow('Trigger nodes cannot be executed standalone');
		});

		it('throws when the operation is on the blacklist (sendAndWait)', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({ description: toolDescription }),
			);

			await expect(
				executor.executeInline({
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: 1,
					nodeParameters: { operation: 'sendAndWait' },
					inputData: [],
					projectId: 'p-1',
				}),
			).rejects.toThrow(/not supported for agent tool execution/);
		});
	});

	describe('resolveInlineCredentials (via executeInline)', () => {
		function mockToolNodeWithSupplyData() {
			// Short-circuit past the execute path — we only want to assert credential resolution.
			const supplyData = jest.fn().mockResolvedValue({
				response: { invoke: jest.fn().mockResolvedValue('ok') },
			});
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: toolDescription,
					supplyData,
				}),
			);
			return supplyData;
		}

		it('throws when no matching credential is found for the project', async () => {
			mockToolNodeWithSupplyData();
			credentialsRepository.findAllCredentialsForProject.mockResolvedValue([]);

			await expect(
				executor.executeInline({
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: 1,
					nodeParameters: {},
					credentials: { slackApi: 'Prod Slack' },
					inputData: [],
					projectId: 'p-1',
				}),
			).rejects.toThrow(/No accessible credential found/);
		});

		it('throws when multiple credentials match the same type + name (case-insensitive)', async () => {
			mockToolNodeWithSupplyData();
			credentialsRepository.findAllCredentialsForProject.mockResolvedValue([
				mock<CredentialsEntity>({ id: 'c1', name: 'Prod Slack', type: 'slackApi' }),
				mock<CredentialsEntity>({ id: 'c2', name: 'prod slack', type: 'slackApi' }),
			]);

			await expect(
				executor.executeInline({
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: 1,
					nodeParameters: {},
					credentials: { slackApi: 'Prod Slack' },
					inputData: [],
					projectId: 'p-1',
				}),
			).rejects.toThrow(/Multiple credentials match/);
		});

		it('skips resolution when no credentials are requested', async () => {
			mockToolNodeWithSupplyData();

			await executor.executeInline({
				nodeType: 'n8n-nodes-base.slack',
				nodeTypeVersion: 1,
				nodeParameters: {},
				inputData: [],
				projectId: 'p-1',
			});

			expect(credentialsRepository.findAllCredentialsForProject).not.toHaveBeenCalled();
		});
	});

	describe('verifyCredentialDetailsForProject (via executeInline)', () => {
		function mockToolNodeWithSupplyData() {
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: toolDescription,
					supplyData: jest.fn().mockResolvedValue({
						response: { invoke: jest.fn().mockResolvedValue('ok') },
					}),
				}),
			);
		}

		it('throws when credentialDetails are missing an id', async () => {
			mockToolNodeWithSupplyData();

			await expect(
				executor.executeInline({
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: 1,
					nodeParameters: {},
					// Intentionally missing `id` to exercise the validation path.
					credentialDetails: { slackApi: { name: 'Prod Slack' } as INodeCredentialsDetails },
					inputData: [],
					projectId: 'p-1',
				}),
			).rejects.toThrow(/missing an id/);
		});

		it('throws when the credential is not shared with the project', async () => {
			mockToolNodeWithSupplyData();
			sharedCredentialsRepository.findOne.mockResolvedValue(null);

			await expect(
				executor.executeInline({
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: 1,
					nodeParameters: {},
					credentialDetails: { slackApi: { id: 'c1', name: 'Prod Slack' } },
					inputData: [],
					projectId: 'p-1',
				}),
			).rejects.toThrow(/not accessible or does not exist/);
		});

		it('throws when the resolved credential has a different type than the slot', async () => {
			mockToolNodeWithSupplyData();
			sharedCredentialsRepository.findOne.mockResolvedValue(
				mock<SharedCredentials>({
					credentials: mock<CredentialsEntity>({
						id: 'c1',
						name: 'Prod Slack',
						type: 'gmailOAuth2', // wrong type for slackApi slot
					}),
				}),
			);

			await expect(
				executor.executeInline({
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: 1,
					nodeParameters: {},
					credentialDetails: { slackApi: { id: 'c1', name: 'Prod Slack' } },
					inputData: [],
					projectId: 'p-1',
				}),
			).rejects.toThrow(/has type .* but the node expects credential slot/);
		});
	});

	describe('executeInline routing', () => {
		it('invokes the LangChain tool when the node implements supplyData', async () => {
			const invoke = jest.fn().mockResolvedValue('wiki-result');
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: toolDescription,
					supplyData: jest.fn().mockResolvedValue({ response: { invoke } }),
				}),
			);

			const result = await executor.executeInline({
				nodeType: '@n8n/n8n-nodes-langchain.toolWikipedia',
				nodeTypeVersion: 1,
				nodeParameters: {},
				inputData: [{ json: { query: 'n8n' } }],
				projectId: 'p-1',
			});

			expect(invoke).toHaveBeenCalledWith({ query: 'n8n' });
			expect(result).toEqual({
				status: 'success',
				data: [{ json: { response: 'wiki-result' } }],
			});
		});

		it('returns an error result when the supplyData tool invocation throws', async () => {
			const invoke = jest.fn().mockRejectedValue(new Error('upstream 500'));
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: toolDescription,
					supplyData: jest.fn().mockResolvedValue({ response: { invoke } }),
				}),
			);

			const result = await executor.executeInline({
				nodeType: '@n8n/n8n-nodes-langchain.toolWikipedia',
				nodeTypeVersion: 1,
				nodeParameters: {},
				inputData: [{ json: {} }],
				projectId: 'p-1',
			});

			expect(result.status).toBe('error');
			expect(result.error).toBe('upstream 500');
		});

		it('returns an error result when the node does not expose a valid LangChain tool', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: toolDescription,
					supplyData: jest.fn().mockResolvedValue({ response: undefined }),
				}),
			);

			const result = await executor.executeInline({
				nodeType: '@n8n/n8n-nodes-langchain.brokenTool',
				nodeTypeVersion: 1,
				nodeParameters: {},
				inputData: [],
				projectId: 'p-1',
			});

			expect(result.status).toBe('error');
			expect(result.error).toMatch(/did not return a valid LangChain tool/);
		});

		it('returns an error result when a direct-execute node has no execute method', async () => {
			// Plain object (not mock<>) — jest-mock-extended auto-proxies *every*
			// property access as a callable, which would make the supplyData
			// routing check match and send us down the wrong path.
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: toolDescription,
			} as unknown as INodeType);

			const result = await executor.executeInline({
				nodeType: 'n8n-nodes-base.slack',
				nodeTypeVersion: 1,
				nodeParameters: {},
				inputData: [],
				projectId: 'p-1',
			});

			expect(result.status).toBe('error');
			expect(result.error).toMatch(/does not have an execute method/);
		});
	});

	describe('introspectSupplyDataToolSchema', () => {
		it('returns the schema a structured tool exposes', async () => {
			const schema = { type: 'object', properties: { query: { type: 'string' } } };
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: toolDescription,
					supplyData: jest.fn().mockResolvedValue({
						response: { invoke: jest.fn(), schema },
					}),
				}),
			);

			const result = await executor.introspectSupplyDataToolSchema({
				projectId: 'p-1',
				nodeType: '@n8n/n8n-nodes-langchain.toolWikipedia',
				nodeTypeVersion: 1,
				nodeParameters: {},
			});

			expect(result).toBe(schema);
		});

		it('returns null when the tool has no structured schema (base Tool/DynamicTool)', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: toolDescription,
					supplyData: jest.fn().mockResolvedValue({
						response: { invoke: jest.fn() },
					}),
				}),
			);

			const result = await executor.introspectSupplyDataToolSchema({
				projectId: 'p-1',
				nodeType: '@n8n/n8n-nodes-langchain.toolBasic',
				nodeTypeVersion: 1,
				nodeParameters: {},
			});

			expect(result).toBeNull();
		});

		it('swallows introspection errors and returns null (keeps tool registration robust)', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: toolDescription,
					supplyData: jest.fn().mockRejectedValue(new Error('MCP server unreachable')),
				}),
			);

			const result = await executor.introspectSupplyDataToolSchema({
				projectId: 'p-1',
				nodeType: '@n8n/n8n-nodes-langchain.mcpClientTool',
				nodeTypeVersion: 1,
				nodeParameters: {},
			});

			expect(result).toBeNull();
			expect(logger.debug).toHaveBeenCalledWith(
				'supplyData tool introspection failed',
				expect.objectContaining({ error: 'MCP server unreachable' }),
			);
		});
	});
});
