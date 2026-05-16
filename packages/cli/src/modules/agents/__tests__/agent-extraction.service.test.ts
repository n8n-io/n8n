/* eslint-disable @typescript-eslint/require-await -- async mock stubs are acceptable test idioms */
import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';
import type { IConnections, INode } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AGENT_NODE_TYPE, AgentExtractionService } from '../services/agent-extraction.service';

const projectId = 'project-1';
const workflowId = 'workflow-1';

interface MockWorkflow {
	id: string;
	nodes: INode[];
	connections: IConnections;
	shared: Array<{ projectId: string }>;
}

function makeWorkflow(overrides: Partial<MockWorkflow> = {}): MockWorkflow {
	return {
		id: workflowId,
		nodes: [],
		connections: {},
		shared: [{ projectId }],
		...overrides,
	};
}

function makeAgentNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'agent-node-id',
		name: 'AI Agent',
		type: AGENT_NODE_TYPE,
		typeVersion: 3.1,
		position: [0, 0],
		parameters: {
			promptType: 'auto',
			options: { systemMessage: 'You are a helpful assistant.' },
		},
		...overrides,
	} as INode;
}

function makeLMNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'lm-node-id',
		name: 'Anthropic Chat Model',
		type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
		typeVersion: 1.5,
		position: [-100, 0],
		parameters: {
			model: { mode: 'list', value: 'claude-sonnet-4-6', cachedResultName: 'Claude Sonnet 4.6' },
		},
		credentials: { anthropicApi: { id: 'cred-anthropic-1', name: 'My Anthropic' } },
		...overrides,
	} as INode;
}

function makeToolNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'tool-node-id',
		name: 'Calculator',
		type: '@n8n/n8n-nodes-langchain.toolCalculator',
		typeVersion: 1,
		position: [-100, 100],
		parameters: {},
		...overrides,
	} as INode;
}

function makeMemoryNode(overrides: Partial<INode> = {}): INode {
	return {
		id: 'memory-node-id',
		name: 'Window Buffer Memory',
		type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
		typeVersion: 1,
		position: [-100, 200],
		parameters: { contextWindowLength: 10 },
		...overrides,
	} as INode;
}

/**
 * Build a forward-direction `IConnections` object that links each parent to
 * the agent via the given input type. The service inverts it internally.
 */
function connectionsFromParents(
	agentName: string,
	parents: Array<{ name: string; type: string }>,
): IConnections {
	const connections: IConnections = {};
	for (const parent of parents) {
		connections[parent.name] = {
			[parent.type]: [[{ node: agentName, type: parent.type, index: 0 }]],
		};
	}
	return connections;
}

describe('AgentExtractionService', () => {
	let service: AgentExtractionService;
	let workflowRepository: jest.Mocked<WorkflowRepository>;

	beforeEach(() => {
		jest.clearAllMocks();
		workflowRepository = mock<WorkflowRepository>();
		service = new AgentExtractionService(mockLogger(), workflowRepository);
	});

	describe('error cases', () => {
		it('throws NotFoundError when the workflow does not exist', async () => {
			workflowRepository.findById.mockResolvedValue(null);

			await expect(
				service.buildConfig({ workflowId, nodeName: 'AI Agent', projectId }),
			).rejects.toThrow(NotFoundError);
		});

		it('throws NotFoundError when the workflow is not in the project', async () => {
			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({ shared: [{ projectId: 'other-project' }] }) as never,
			);

			await expect(
				service.buildConfig({ workflowId, nodeName: 'AI Agent', projectId }),
			).rejects.toThrow(/not found in project/);
		});

		it('throws NotFoundError when the node does not exist', async () => {
			workflowRepository.findById.mockResolvedValue(makeWorkflow() as never);

			await expect(
				service.buildConfig({ workflowId, nodeName: 'Missing', projectId }),
			).rejects.toThrow(/Node "Missing" not found/);
		});

		it('throws UserError when the node is not an Agent node', async () => {
			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({
					nodes: [{ ...makeAgentNode(), type: '@n8n/n8n-nodes-base.set' }],
				}) as never,
			);

			await expect(
				service.buildConfig({ workflowId, nodeName: 'AI Agent', projectId }),
			).rejects.toThrow(UserError);
		});

		it('refuses nested agents (Agent connected via ai_tool)', async () => {
			const agentNode = makeAgentNode();
			const nestedAgent: INode = {
				...makeAgentNode(),
				id: 'nested-agent',
				name: 'Inner Agent',
				type: '@n8n/n8n-nodes-langchain.agentTool',
			};
			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({
					nodes: [agentNode, nestedAgent],
					connections: connectionsFromParents('AI Agent', [
						{ name: 'Inner Agent', type: 'ai_tool' },
					]),
				}) as never,
			);

			await expect(
				service.buildConfig({ workflowId, nodeName: 'AI Agent', projectId }),
			).rejects.toThrow(/Nested agents are not supported/);
		});
	});

	describe('happy path', () => {
		it('maps a full Agent subgraph (LM + memory + tools) into AgentJsonConfig', async () => {
			const agentNode = makeAgentNode();
			const lmNode = makeLMNode();
			const memoryNode = makeMemoryNode();
			const calc = makeToolNode();

			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({
					nodes: [agentNode, lmNode, memoryNode, calc],
					connections: connectionsFromParents('AI Agent', [
						{ name: 'Anthropic Chat Model', type: 'ai_languageModel' },
						{ name: 'Window Buffer Memory', type: 'ai_memory' },
						{ name: 'Calculator', type: 'ai_tool' },
					]),
				}) as never,
			);

			const result = await service.buildConfig({
				workflowId,
				nodeName: 'AI Agent',
				projectId,
			});

			expect(result.warnings).toEqual([]);
			expect(result.provider).toBe('anthropic');
			expect(result.model).toBe('claude-sonnet-4-6');
			expect(result.credentialId).toBe('cred-anthropic-1');
			expect(result.config.name).toBe('AI Agent');
			expect(result.config.model).toBe('anthropic/claude-sonnet-4-6');
			expect(result.config.credential).toBe('cred-anthropic-1');
			expect(result.config.instructions).toBe('You are a helpful assistant.');
			expect(result.config.memory).toEqual({ enabled: true, storage: 'n8n', lastMessages: 10 });
			expect(result.config.tools).toHaveLength(1);
			expect(result.config.tools?.[0]).toMatchObject({
				type: 'node',
				name: 'Calculator',
				node: {
					nodeType: '@n8n/n8n-nodes-langchain.toolCalculator',
					nodeTypeVersion: 1,
				},
			});
		});

		it('uses the provided name and description over the node name', async () => {
			const agentNode = makeAgentNode();
			const lmNode = makeLMNode();
			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({
					nodes: [agentNode, lmNode],
					connections: connectionsFromParents('AI Agent', [
						{ name: 'Anthropic Chat Model', type: 'ai_languageModel' },
					]),
				}) as never,
			);

			const result = await service.buildConfig({
				workflowId,
				nodeName: 'AI Agent',
				projectId,
				name: 'Sales Copilot',
				description: 'Helps with sales emails',
			});

			expect(result.config.name).toBe('Sales Copilot');
			expect(result.config.description).toBe('Helps with sales emails');
		});

		it('serializes ToolWorkflow tools as workflow references when workflowId is set', async () => {
			const agentNode = makeAgentNode();
			const lmNode = makeLMNode();
			const wfTool: INode = {
				id: 'wf-tool',
				name: 'Send Email',
				type: '@n8n/n8n-nodes-langchain.toolWorkflow',
				typeVersion: 2,
				position: [-100, 100],
				parameters: {
					name: 'send_email',
					description: 'Sends an email to a contact',
					workflowId: { mode: 'list', value: 'wf-target-1', cachedResultName: 'Send Email WF' },
				},
			};

			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({
					nodes: [agentNode, lmNode, wfTool],
					connections: connectionsFromParents('AI Agent', [
						{ name: 'Anthropic Chat Model', type: 'ai_languageModel' },
						{ name: 'Send Email', type: 'ai_tool' },
					]),
				}) as never,
			);

			const result = await service.buildConfig({
				workflowId,
				nodeName: 'AI Agent',
				projectId,
			});

			expect(result.config.tools).toEqual([
				{
					type: 'workflow',
					workflow: 'wf-target-1',
					name: 'send_email',
					description: 'Sends an email to a contact',
				},
			]);
		});
	});

	describe('warnings', () => {
		it('warns and drops a fallback model when two LMs are connected', async () => {
			const agentNode = makeAgentNode();
			const lmPrimary = makeLMNode();
			const lmFallback: INode = {
				...makeLMNode(),
				id: 'lm-fallback',
				name: 'Fallback Model',
			};

			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({
					nodes: [agentNode, lmPrimary, lmFallback],
					connections: connectionsFromParents('AI Agent', [
						{ name: 'Anthropic Chat Model', type: 'ai_languageModel' },
						{ name: 'Fallback Model', type: 'ai_languageModel' },
					]),
				}) as never,
			);

			const result = await service.buildConfig({
				workflowId,
				nodeName: 'AI Agent',
				projectId,
			});

			expect(result.warnings.map((w) => w.code)).toContain('fallback_model_dropped');
			expect(result.provider).toBe('anthropic');
		});

		it('warns when an output parser is attached', async () => {
			const agentNode = makeAgentNode();
			const lmNode = makeLMNode();
			const parser: INode = {
				id: 'parser-1',
				name: 'Structured Output Parser',
				type: '@n8n/n8n-nodes-langchain.outputParserStructured',
				typeVersion: 1,
				position: [-100, 300],
				parameters: {},
			};

			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({
					nodes: [agentNode, lmNode, parser],
					connections: connectionsFromParents('AI Agent', [
						{ name: 'Anthropic Chat Model', type: 'ai_languageModel' },
						{ name: 'Structured Output Parser', type: 'ai_outputParser' },
					]),
				}) as never,
			);

			const result = await service.buildConfig({
				workflowId,
				nodeName: 'AI Agent',
				projectId,
			});

			expect(result.warnings.map((w) => w.code)).toContain('output_parser_dropped');
		});

		it('warns when no language model is connected and returns null provider/model', async () => {
			const agentNode = makeAgentNode();
			workflowRepository.findById.mockResolvedValue(makeWorkflow({ nodes: [agentNode] }) as never);

			const result = await service.buildConfig({
				workflowId,
				nodeName: 'AI Agent',
				projectId,
			});

			expect(result.warnings.map((w) => w.code)).toContain('lm_missing');
			expect(result.provider).toBeNull();
			expect(result.model).toBeNull();
			expect(result.config.model).toBe('');
		});

		it('warns for an unknown LM provider node type', async () => {
			const agentNode = makeAgentNode();
			const customLM: INode = {
				...makeLMNode(),
				type: '@some/custom.lmNode',
			};

			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({
					nodes: [agentNode, customLM],
					connections: connectionsFromParents('AI Agent', [
						{ name: 'Anthropic Chat Model', type: 'ai_languageModel' },
					]),
				}) as never,
			);

			const result = await service.buildConfig({
				workflowId,
				nodeName: 'AI Agent',
				projectId,
			});

			expect(result.warnings.map((w) => w.code)).toContain('unknown_lm_provider');
			expect(result.provider).toBeNull();
		});

		it('warns when a memory backend other than the built-in ones is used', async () => {
			const agentNode = makeAgentNode();
			const lmNode = makeLMNode();
			const redisMemory: INode = {
				id: 'redis-mem',
				name: 'Redis Chat Memory',
				type: '@n8n/n8n-nodes-langchain.memoryRedisChat',
				typeVersion: 1,
				position: [-100, 200],
				parameters: {},
			};

			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({
					nodes: [agentNode, lmNode, redisMemory],
					connections: connectionsFromParents('AI Agent', [
						{ name: 'Anthropic Chat Model', type: 'ai_languageModel' },
						{ name: 'Redis Chat Memory', type: 'ai_memory' },
					]),
				}) as never,
			);

			const result = await service.buildConfig({
				workflowId,
				nodeName: 'AI Agent',
				projectId,
			});

			expect(result.warnings.map((w) => w.code)).toContain('memory_type_unsupported');
			expect(result.config.memory).toEqual({ enabled: true, storage: 'n8n' });
		});
	});

	describe('instructions extraction', () => {
		it('falls back to the `text` parameter when promptType is "define" and no systemMessage', async () => {
			const agentNode = makeAgentNode({
				parameters: {
					promptType: 'define',
					text: 'Respond in haiku.',
					options: {},
				},
			});
			const lmNode = makeLMNode();

			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({
					nodes: [agentNode, lmNode],
					connections: connectionsFromParents('AI Agent', [
						{ name: 'Anthropic Chat Model', type: 'ai_languageModel' },
					]),
				}) as never,
			);

			const result = await service.buildConfig({
				workflowId,
				nodeName: 'AI Agent',
				projectId,
			});

			expect(result.config.instructions).toBe('Respond in haiku.');
		});

		it('returns an empty string when neither systemMessage nor define-text is set', async () => {
			const agentNode = makeAgentNode({
				parameters: { promptType: 'auto', options: {} },
			});
			const lmNode = makeLMNode();

			workflowRepository.findById.mockResolvedValue(
				makeWorkflow({
					nodes: [agentNode, lmNode],
					connections: connectionsFromParents('AI Agent', [
						{ name: 'Anthropic Chat Model', type: 'ai_languageModel' },
					]),
				}) as never,
			);

			const result = await service.buildConfig({
				workflowId,
				nodeName: 'AI Agent',
				projectId,
			});

			expect(result.config.instructions).toBe('');
		});
	});
});
