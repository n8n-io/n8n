import type {
	Agent as RuntimeAgent,
	BuiltAgent,
	BuiltTool,
	CredentialProvider,
	StreamChunk,
} from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig, GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { CredentialsService } from '@/credentials/credentials.service';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { Telemetry } from '@/telemetry';

import type { AgentExecutionService } from '../agent-execution.service';
import { AgentSkillsService } from '../agent-skills.service';
import type { AgentsToolsService } from '../agents-tools.service';
import { AgentsService } from '../agents.service';
import type { AgentPublishedVersion } from '../entities/agent-published-version.entity';
import type { Agent } from '../entities/agent.entity';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import { buildFromJson } from '../json-config/from-json-config';
import type { AgentPublishedVersionRepository } from '../repositories/agent-published-version.repository';
import type { AgentRepository } from '../repositories/agent.repository';

jest.mock('../json-config/from-json-config', () => ({
	buildFromJson: jest.fn(),
}));

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';

type MockRuntimeAgent = RuntimeAgent & {
	tool: jest.Mock;
	stream: jest.Mock;
};

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		projectId,
		versionId: 'version-1',
		schema: null,
		model: 'claude-3',
		provider: 'anthropic',
		credentialId: 'cred-1',
		publishedVersion: null,
		integrations: [],
		tools: {},
		skills: {},
		updatedAt: new Date('2026-05-20T10:00:00.000Z'),
		...overrides,
	} as unknown as Agent;
}

function makePublishedVersion(
	overrides: Partial<AgentPublishedVersion> = {},
): AgentPublishedVersion {
	return {
		agentId,
		publishedFromVersionId: 'version-1',
		schema: null,
		model: null,
		provider: null,
		credentialId: null,
		tools: null,
		skills: null,
		publishedById: userId,
		...overrides,
	} as unknown as AgentPublishedVersion;
}

function streamFromChunks(chunks: StreamChunk[]) {
	return {
		runId: 'run-1',
		stream: new ReadableStream<StreamChunk>({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(chunk);
				controller.close();
			},
		}),
	};
}

function makeRuntimeAgent(chunks: StreamChunk[]): MockRuntimeAgent {
	return {
		name: 'Test Agent',
		tool: jest.fn().mockReturnThis(),
		stream: jest.fn().mockResolvedValue(streamFromChunks(chunks)),
	} as unknown as MockRuntimeAgent;
}

function makeTool(name: string): BuiltTool {
	return {
		name,
		description: `Replay ${name}`,
		handler: async () => undefined,
		editable: false,
	};
}

describe('AgentsService evaluation and workflow execution', () => {
	const buildFromJsonMock = jest.mocked(buildFromJson);
	let service: AgentsService;
	let agentRepository: jest.Mocked<AgentRepository>;
	let agentExecutionService: jest.Mocked<AgentExecutionService>;
	let agentsToolsService: jest.Mocked<AgentsToolsService>;

	beforeEach(() => {
		jest.clearAllMocks();
		Container.set(CredentialsService, mock<CredentialsService>());

		agentRepository = mock<AgentRepository>();
		agentExecutionService = mock<AgentExecutionService>();
		agentExecutionService.recordMessage.mockResolvedValue('exec-id');
		agentsToolsService = mock<AgentsToolsService>();

		const logger = mockLogger();
		service = new AgentsService(
			logger,
			agentRepository,
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock<N8NCheckpointStorage>(),
			mock(),
			mock(),
			agentsToolsService,
			mock<N8nMemory>(),
			agentExecutionService,
			mock<AgentPublishedVersionRepository>(),
			new AgentSkillsService(logger, agentRepository),
			mock<Publisher>(),
			{ modules: ['node-tools-searcher'] } as unknown as AgentsConfig,
			mock<GlobalConfig>({
				multiMainSetup: { enabled: false },
			} as Partial<GlobalConfig>),
			mock<Telemetry>(),
			mock(),
		);
	});

	afterEach(() => {
		Container.reset();
	});

	it('attaches evaluation mocks for runtime-injected environment and node tools', async () => {
		const schema: AgentJsonConfig = {
			name: 'Test Agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Be helpful',
			config: { nodeTools: { enabled: true } },
		};
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ schema }));
		agentsToolsService.getRuntimeTools.mockReturnValue([
			makeTool('search_nodes'),
			makeTool('get_node_types'),
			makeTool('list_credentials'),
			makeTool('run_node_tool'),
		]);
		const credentialProvider = mock<CredentialProvider>();
		jest
			.spyOn(service as never, 'createCredentialProvider')
			.mockReturnValue(credentialProvider as never);
		const runtimeAgent = makeRuntimeAgent([{ type: 'finish', finishReason: 'stop' }]);
		buildFromJsonMock.mockResolvedValue(runtimeAgent);

		await service.executeEvaluationCase({
			agentId,
			projectId,
			userId,
			message: 'What day is it?',
			toolMocks: [
				{ toolName: 'get_environment', outputs: [{ timezone: 'UTC' }] },
				{ toolName: 'run_node_tool', outputs: [{ ok: true }] },
			],
		});

		expect(agentsToolsService.getRuntimeTools).toHaveBeenCalledWith(credentialProvider, projectId);

		const runtimeTools = runtimeAgent.tool.mock.calls.flatMap(([tools]) =>
			Array.isArray(tools) ? tools : [tools],
		) as BuiltTool[];
		expect(runtimeTools.map((tool) => tool.name)).toEqual([
			'get_environment',
			'search_nodes',
			'get_node_types',
			'list_credentials',
			'run_node_tool',
		]);

		await expect(
			runtimeTools.find((tool) => tool.name === 'get_environment')?.handler?.({}, {}),
		).resolves.toEqual({ timezone: 'UTC' });
		await expect(
			runtimeTools
				.find((tool) => tool.name === 'run_node_tool')
				?.handler?.({ nodeType: 'n8n-nodes-base.httpRequestTool' }, {}),
		).resolves.toEqual({ ok: true });
	});

	it('records workflow executions against the version that was compiled', async () => {
		const schema: AgentJsonConfig = {
			name: 'Draft Agent',
			model: 'anthropic/claude-sonnet-4-5',
			instructions: 'Be helpful',
		};
		const agent = makeAgent({
			versionId: 'draft-version-id',
			schema,
			publishedVersion: makePublishedVersion({
				publishedFromVersionId: 'published-version-id',
				schema,
			}),
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const runtimeAgent = makeRuntimeAgent([
			{ type: 'text-delta', id: 'text-1', delta: 'Done' },
			{ type: 'finish', finishReason: 'stop' },
		]);
		jest
			.spyOn(service as never, 'compileIsolated')
			.mockResolvedValue({ ok: true, agent: runtimeAgent as BuiltAgent } as never);

		await service.executeForWorkflow(
			agentId,
			'Run this',
			'execution-1',
			'thread-1',
			userId,
			projectId,
		);

		expect(agentExecutionService.recordMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				agentId,
				agentVersionId: 'draft-version-id',
				source: 'workflow',
			}),
		);
	});
});
