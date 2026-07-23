import type { BuiltTelemetry, BuiltTool, CredentialProvider, StreamChunk } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { NodeCatalogService } from '@/node-catalog';

import type { InstanceAiCreditService } from '../../../instance-ai/instance-ai-credit.service';
import type { AgentsService } from '../../agents.service';
import type { Agent as AgentEntity } from '../../entities/agent.entity';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { N8nMemory, N8nMemoryImpl } from '../../integrations/n8n-memory';
import type { AgentCheckpointRepository } from '../../repositories/agent-checkpoint.repository';
import type { AgentsBuilderToolsService } from '../agents-builder-tools.service';
import { AgentsBuilderService } from '../agents-builder.service';

// The `Agent`/`Memory` SDK classes and observational-memory factories are
// imported inside `agents-builder.service.ts` from `@n8n/agents`. Stubbing
// them here lets us capture the persistence/memory options passed to the
// runtime without standing up a real model/tool/telemetry stack.
const agentsSdkMocks = vi.hoisted(() => {
	const streamCalls: Array<{
		message: string;
		options: { persistence: { threadId: string; resourceId: string } };
	}> = [];
	const instructionsCalls: string[] = [];
	const registeredToolNames: string[] = [];
	const modelCalls: unknown[] = [];
	const promptCachingCalls: unknown[] = [];
	const thinkingCalls: Array<{ provider: string; config: unknown }> = [];
	const skillsCalls: unknown[] = [];
	const telemetryCalls: unknown[] = [];
	const memoryTaskObserverCalls: unknown[] = [];
	const observationalMemoryCalls: Array<{
		observe: { model: unknown; options: { onUsage: (report: unknown) => Promise<void> } };
		reflect: { model: unknown; options: { onUsage: (report: unknown) => Promise<void> } };
	}> = [];

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
		promptCaching(config?: unknown) {
			promptCachingCalls.push(config);
			return this;
		}
		thinking(provider: string, config?: unknown) {
			thinkingCalls.push({ provider, config });
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
		telemetry(t: unknown) {
			telemetryCalls.push(t);
			return this;
		}
		memoryTaskObserver(observer: unknown) {
			memoryTaskObserverCalls.push(observer);
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
		observationalMemory(options: unknown) {
			observationalMemoryCalls.push(options as (typeof observationalMemoryCalls)[number]);
			return this;
		}
	}

	function createObservationLogObserveFn(model: unknown, options: unknown) {
		return { model, options, kind: 'observe' };
	}
	function createObservationLogReflectFn(model: unknown, options: unknown) {
		return { model, options, kind: 'reflect' };
	}

	function createPlannerTodosTool(): BuiltTool {
		return { name: 'write_todos', description: 'planner todos tool' } as BuiltTool;
	}

	return {
		streamCalls,
		instructionsCalls,
		registeredToolNames,
		modelCalls,
		promptCachingCalls,
		thinkingCalls,
		skillsCalls,
		telemetryCalls,
		memoryTaskObserverCalls,
		observationalMemoryCalls,
		MockAgent,
		MockMemory,
		createObservationLogObserveFn,
		createObservationLogReflectFn,
		createPlannerTodosTool,
	};
});

vi.mock('@n8n/agents', () => ({
	Agent: agentsSdkMocks.MockAgent,
	Memory: agentsSdkMocks.MockMemory,
	createObservationLogObserveFn: agentsSdkMocks.createObservationLogObserveFn,
	createObservationLogReflectFn: agentsSdkMocks.createObservationLogReflectFn,
	createPlannerTodosTool: agentsSdkMocks.createPlannerTodosTool,
}));

// Avoid a real `models.dev` catalog fetch — irrelevant to thread isolation and
// would otherwise hit the network (or a 5s timeout) on every test run.
vi.mock('../agents-builder-model-recommendations', () => ({
	getModelRecommendationsSection: vi.fn(async () => null),
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
	const logger = mock<Logger>();
	const agentsService = mock<AgentsService>();
	const nodeCatalogService = mock<NodeCatalogService>();
	const agentsBuilderToolsService = mock<AgentsBuilderToolsService>();
	const n8nMemory = mock<N8nMemory>();
	const instanceAiCreditService = mock<InstanceAiCreditService>();
	const n8nCheckpointStorage = mock<N8NCheckpointStorage>();
	const agentCheckpointRepository = mock<AgentCheckpointRepository>();

	nodeCatalogService.initialize.mockResolvedValue(undefined);
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
		logger,
		agentsService,
		nodeCatalogService,
		agentsBuilderToolsService,
		n8nMemory,
		instanceAiCreditService,
		n8nCheckpointStorage,
		agentCheckpointRepository,
	);

	const user = mock<User>({ id: 'user-1' });
	const credentialProvider = mock<CredentialProvider>();

	return {
		service,
		logger,
		memoryImplementation,
		user,
		credentialProvider,
		agentsBuilderToolsService,
		instanceAiCreditService,
		n8nCheckpointStorage,
	};
}

const baseSession = {
	threadId: 'ia-builder:t:agent-1',
	hostThreadId: 'instance-thread-1',
	runId: 'run-1',
	modelConfig: 'anthropic/claude-sonnet-host-resolved',
};

describe('AgentsBuilderService session isolation', () => {
	beforeEach(() => {
		agentsSdkMocks.streamCalls.length = 0;
		agentsSdkMocks.instructionsCalls.length = 0;
		agentsSdkMocks.registeredToolNames.length = 0;
		agentsSdkMocks.modelCalls.length = 0;
		agentsSdkMocks.promptCachingCalls.length = 0;
		agentsSdkMocks.thinkingCalls.length = 0;
		agentsSdkMocks.skillsCalls.length = 0;
		agentsSdkMocks.telemetryCalls.length = 0;
		agentsSdkMocks.memoryTaskObserverCalls.length = 0;
		agentsSdkMocks.observationalMemoryCalls.length = 0;
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

	it('includes the external services skill', async () => {
		const { service, user, credentialProvider } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);

		const skills = agentsSdkMocks.skillsCalls[0] as Array<{ id: string }>;
		expect(skills.some((skill) => skill.id === 'agent-builder-external-services')).toBe(true);
	});

	it('uses session.modelConfig directly for the builder model', async () => {
		const { service, user, credentialProvider } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);

		expect(agentsSdkMocks.modelCalls).toEqual(['anthropic/claude-sonnet-host-resolved']);
	});

	it('enables prompt caching with a 5m Anthropic TTL for the builder agent', async () => {
		const { service, user, credentialProvider } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);

		expect(agentsSdkMocks.promptCachingCalls).toEqual([{ anthropic: { ttl: '5m' } }]);
	});

	it('enables adaptive thinking for an Anthropic builder model', async () => {
		const { service, user, credentialProvider } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);

		expect(agentsSdkMocks.thinkingCalls).toEqual([
			{ provider: 'anthropic', config: { mode: 'adaptive' } },
		]);
	});

	it('enables high-effort reasoning for an OpenAI builder model', async () => {
		const { service, user, credentialProvider } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, {
				...baseSession,
				modelConfig: 'openai/gpt-5.5',
			}),
		);

		expect(agentsSdkMocks.thinkingCalls).toEqual([
			{ provider: 'openai', config: { reasoningEffort: 'high' } },
		]);
	});

	it('does not configure thinking for a provider without reasoning support', async () => {
		const { service, user, credentialProvider } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, {
				...baseSession,
				modelConfig: 'google/gemini-2.5-pro',
			}),
		);

		expect(agentsSdkMocks.thinkingCalls).toEqual([]);
	});

	it('attaches session.telemetry when provided, and omits it otherwise', async () => {
		const { service, user, credentialProvider } = setup();
		const sentinel = { functionId: 'host' } as unknown as BuiltTelemetry;

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, {
				...baseSession,
				telemetry: sentinel,
			}),
		);
		expect(agentsSdkMocks.telemetryCalls).toEqual([sentinel]);

		agentsSdkMocks.telemetryCalls.length = 0;
		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);
		expect(agentsSdkMocks.telemetryCalls).toEqual([]);
	});

	it('registers session.memoryTaskObserver on the builder agent when provided, and omits it otherwise', async () => {
		const { service, user, credentialProvider } = setup();
		const memoryTaskObserver = vi.fn();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, {
				...baseSession,
				memoryTaskObserver,
			}),
		);
		expect(agentsSdkMocks.memoryTaskObserverCalls).toEqual([memoryTaskObserver]);

		agentsSdkMocks.memoryTaskObserverCalls.length = 0;
		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);
		expect(agentsSdkMocks.memoryTaskObserverCalls).toEqual([]);
	});

	it('constructs observer/reflector callbacks on the builder model and claims usage under the host thread/run/target-agent dedupe key', async () => {
		const { service, user, credentialProvider, instanceAiCreditService } = setup();

		await drain(
			service.buildAgent('agent-1', 'project-1', 'hi', credentialProvider, user, baseSession),
		);

		expect(agentsSdkMocks.observationalMemoryCalls).toHaveLength(1);
		const { observe, reflect } = agentsSdkMocks.observationalMemoryCalls[0];
		expect(observe.model).toBe(baseSession.modelConfig);
		expect(reflect.model).toBe(baseSession.modelConfig);

		await observe.options.onUsage({
			task: 'observer',
			model: baseSession.modelConfig,
			usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
			reportId: 'report-1',
		});

		expect(instanceAiCreditService.claimRunUsage).toHaveBeenCalledWith(
			user,
			'instance-thread-1',
			'run-1:agent-builder:agent-1:memory:observer:report-1',
			expect.arrayContaining([expect.objectContaining({ type: 'llmTokens' })]),
			'completed',
		);
	});
});
