import type { BuiltTool, CredentialProvider, StreamChunk } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentsService } from '../../agents.service';
import type { Agent as AgentEntity } from '../../entities/agent.entity';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { N8nMemory, N8nMemoryImpl } from '../../integrations/n8n-memory';
import type { AgentCheckpointRepository } from '../../repositories/agent-checkpoint.repository';
import type { NodeCatalogService } from '@/node-catalog';

import { AgentsBuilderService } from '../agents-builder.service';
import type { AgentsBuilderSettingsService } from '../agents-builder-settings.service';
import type { AgentsBuilderToolsService } from '../agents-builder-tools.service';

// The `Agent`/`Memory` SDK classes are dynamically imported inside
// `createBuilderAgent` (`await import('@n8n/agents')`). Stubbing them here lets
// us capture the persistence options passed to `builder.stream(...)` without
// standing up a real model/tool/telemetry stack.
const agentsSdkMocks = vi.hoisted(() => {
	const streamCalls: Array<{
		message: string;
		options: { persistence: { threadId: string; resourceId: string } };
	}> = [];
	const instructionsCalls: string[] = [];
	const registeredToolNames: string[] = [];
	const modelCalls: unknown[] = [];
	const skillsCalls: unknown[] = [];

	function emptyStream() {
		return new ReadableStream<StreamChunk>({
			start(controller) {
				controller.close();
			},
		});
	}

	class MockAgent {
		constructor(_name: string) {}
		model(config: unknown) {
			modelCalls.push(config);
			return this;
		}
		instructions(text: string) {
			instructionsCalls.push(text);
			return this;
		}
		skills(skills: unknown) {
			skillsCalls.push(skills);
			return this;
		}
		memory() {
			return this;
		}
		checkpoint() {
			return this;
		}
		configuration() {
			return this;
		}
		telemetry() {
			return this;
		}
		tool(tool: BuiltTool) {
			registeredToolNames.push(tool.name);
			return this;
		}
		async stream(
			message: string,
			options: { persistence: { threadId: string; resourceId: string } },
		) {
			streamCalls.push({ message, options });
			return { stream: emptyStream() };
		}
		async resume() {
			return { stream: emptyStream() };
		}
	}

	class MockMemory {
		storage() {
			return this;
		}
		observationalMemory() {
			return this;
		}
	}

	return {
		streamCalls,
		instructionsCalls,
		registeredToolNames,
		modelCalls,
		skillsCalls,
		MockAgent,
		MockMemory,
	};
});

vi.mock('@n8n/agents', () => ({
	Agent: agentsSdkMocks.MockAgent,
	Memory: agentsSdkMocks.MockMemory,
}));

// Avoid a real `models.dev` catalog fetch — irrelevant to thread isolation and
// would otherwise hit the network (or a 5s timeout) on every test run.
vi.mock('../agents-builder-model-recommendations', () => ({
	getModelRecommendationsSection: vi.fn(async () => null),
}));

// Tracing wiring isn't part of the thread-isolation contract under test, and
// depends on a developer's local env (e.g. LANGSMITH_API_KEY); stub it out so
// the test is deterministic regardless of the runner's environment.
vi.mock('../../tracing/builder-telemetry', () => ({
	buildBuilderTelemetry: vi.fn(async () => undefined),
}));

async function drain<T>(generator: AsyncGenerator<T>): Promise<T[]> {
	const values: T[] = [];
	for await (const value of generator) values.push(value);
	return values;
}

/** Minimal `BuiltTool` stand-in — only `name` is read by the code under test. */
function fakeTool(name: string): BuiltTool {
	return { name, description: `${name} description` } as BuiltTool;
}

function setup(
	standardTools: { json: BuiltTool[]; shared: BuiltTool[] } = { json: [], shared: [] },
) {
	const agentsService = mock<AgentsService>();
	const nodeCatalogService = mock<NodeCatalogService>();
	const agentsBuilderToolsService = mock<AgentsBuilderToolsService>();
	const n8nMemory = mock<N8nMemory>();
	const builderSettings = mock<AgentsBuilderSettingsService>();
	const n8nCheckpointStorage = mock<N8NCheckpointStorage>();
	const agentCheckpointRepository = mock<AgentCheckpointRepository>();
	const agentsConfig = mock<AgentsConfig>();

	nodeCatalogService.initialize.mockResolvedValue(undefined);
	builderSettings.resolveModelConfig.mockResolvedValue({
		config: 'anthropic/claude-3-5-haiku',
		isProxied: false,
	});
	agentsBuilderToolsService.getTools.mockReturnValue(standardTools);

	const memoryImplementation = mock<N8nMemoryImpl>();
	memoryImplementation.getMessages.mockResolvedValue([]);
	n8nMemory.getImplementation.mockReturnValue(memoryImplementation);

	const agent = mock<AgentEntity>({
		id: 'agent-1',
		schema: null,
		integrations: [],
		tools: {},
		updatedAt: new Date('2024-01-01T00:00:00.000Z'),
	});
	agentsService.findById.mockResolvedValue(agent);

	const service = new AgentsBuilderService(
		mock<Logger>(),
		agentsService,
		nodeCatalogService,
		agentsBuilderToolsService,
		n8nMemory,
		builderSettings,
		n8nCheckpointStorage,
		agentCheckpointRepository,
		agentsConfig,
	);

	const user = mock<User>({ id: 'user-1' });
	const credentialProvider = mock<CredentialProvider>();

	return {
		service,
		memoryImplementation,
		user,
		credentialProvider,
		agentsBuilderToolsService,
		builderSettings,
		n8nCheckpointStorage,
	};
}

const baseSession = { threadId: 'ia-builder:t:agent-1' };

describe('AgentsBuilderService session isolation', () => {
	beforeEach(() => {
		agentsSdkMocks.streamCalls.length = 0;
		agentsSdkMocks.instructionsCalls.length = 0;
		agentsSdkMocks.registeredToolNames.length = 0;
		agentsSdkMocks.modelCalls.length = 0;
		agentsSdkMocks.skillsCalls.length = 0;
	});

	it('uses the session threadId for stream persistence', async () => {
		const { service, user, credentialProvider } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);

		expect(agentsSdkMocks.streamCalls).toHaveLength(1);
		expect(agentsSdkMocks.streamCalls[0]?.options.persistence.threadId).toBe(
			'ia-builder:t:agent-1',
		);
	});

	it('appends the session instructionsAddendum to the built prompt when provided', async () => {
		const { service, user, credentialProvider } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, {
				...baseSession,
				instructionsAddendum: 'Extra sub-agent rules go here.',
			}),
		);

		expect(agentsSdkMocks.instructionsCalls).toHaveLength(1);
		const instructions = agentsSdkMocks.instructionsCalls[0] ?? '';
		expect(instructions.endsWith('\n\nExtra sub-agent rules go here.')).toBe(true);
	});

	it('does not append anything to the prompt when instructionsAddendum is absent', async () => {
		const { service, user, credentialProvider } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);

		expect(agentsSdkMocks.instructionsCalls).toHaveLength(1);
		expect(agentsSdkMocks.instructionsCalls[0]).not.toContain('Extra sub-agent rules');
	});

	it('registers all standard tools returned by the tools service', async () => {
		const { service, user, credentialProvider } = setup({
			json: [fakeTool('resolve_llm'), fakeTool('read_config')],
			shared: [fakeTool('ask_credential')],
		});

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);

		expect(agentsSdkMocks.registeredToolNames).toEqual(
			expect.arrayContaining(['resolve_llm', 'read_config', 'ask_credential']),
		);
	});

	it('cancelCheckpoint expires the checkpoint scoped to the agent', async () => {
		const { service, n8nCheckpointStorage } = setup();

		await service.cancelCheckpoint('agent-1', 'run-1');

		expect(n8nCheckpointStorage.delete).toHaveBeenCalledWith('run-1', 'agent-1');
	});

	it('includes the integrations skill', async () => {
		const { service, user, credentialProvider } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);

		const skills = agentsSdkMocks.skillsCalls[0] as Array<{ id: string }>;
		expect(skills.some((skill) => skill.id === 'agent-builder-integrations')).toBe(true);
	});

	it('uses session.modelConfig directly and skips resolveModelConfig when provided', async () => {
		const { service, user, credentialProvider, builderSettings } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, {
				...baseSession,
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
			}),
		);

		expect(agentsSdkMocks.modelCalls).toEqual(['anthropic/claude-sonnet-host-resolved']);
		expect(builderSettings.resolveModelConfig).not.toHaveBeenCalled();
	});

	it('falls back to resolveModelConfig when session.modelConfig is absent', async () => {
		const { service, user, credentialProvider, builderSettings } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);

		expect(agentsSdkMocks.modelCalls).toEqual(['anthropic/claude-3-5-haiku']);
		expect(builderSettings.resolveModelConfig).toHaveBeenCalledWith(user);
	});
});
