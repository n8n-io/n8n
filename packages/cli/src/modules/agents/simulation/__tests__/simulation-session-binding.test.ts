import type { AgentJsonConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { CredentialsFinderService } from '@n8n/backend-services';
import type { User, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentSkillRefsService } from '../../agent-skill-refs.service';
import type { ProjectAgent } from '../../entities/agent.entity';
import type { ChatIntegrationRegistry } from '../../integrations/agent-chat-integration';
import type { AgentExecutionThreadRepository } from '../../repositories/agent-execution-thread.repository';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { SafeTestingFlagGate } from '../safe-testing-flag-gate';
import { SimulationBackendRegistry } from '../simulation-backend-registry';
import { SimulationSessionService } from '../simulation-session.service';
import type {
	OpenWorldInput,
	SimulatedAgent,
	SimulationBackend,
	SimulationWorld,
} from '../tool-simulation.contracts';

vi.mock('../../json-config/agent-document', () => ({
	toAgentDocument: (schema: AgentJsonConfig) => schema,
}));

type McpServer = NonNullable<AgentJsonConfig['mcpServers']>[number];

const serverA = {
	name: 'tracker',
	url: 'https://mcp.example.com/mcp?key=url-key',
	authentication: 'bearerAuth',
	credential: 'credential-a',
} as McpServer;
const serverB = { ...serverA, credential: 'credential-b' };

function draftWith(mcpServers: McpServer[], rest: Partial<AgentJsonConfig> = {}) {
	return {
		name: 'Support bot',
		instructions: 'Help customers',
		model: 'anthropic/claude-sonnet-4-5',
		tools: [],
		mcpServers,
		...rest,
	} as AgentJsonConfig;
}

function deferred() {
	let resolve = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

/** Counts the worlds that it opens. `gate` holds each open until the test releases it. */
function fakeBackend(dependsOnConnections: boolean) {
	const opened: OpenWorldInput[] = [];
	const closed: string[] = [];
	const state: { gate?: Promise<void>; closeFails?: boolean } = {};
	const backend: SimulationBackend = {
		id: 'llm-mock',
		...(dependsOnConnections ? { worldDependsOnDraftConnections: true } : {}),
		describeTools: async (agent: SimulatedAgent) =>
			agent.tools.map((tool) => ({
				toolName: tool.toolName,
				kind: tool.kind,
				testability: 'simulated' as const,
			})),
		openWorld: async (input) => {
			opened.push(input);
			const world: SimulationWorld = {
				worldId: `world-${opened.length}`,
				backend: 'llm-mock',
				handleRequest: vi.fn(),
			};
			await state.gate;
			return world;
		},
		closeWorld: async (worldId) => {
			closed.push(worldId);
			if (state.closeFails) throw new Error('backend down');
		},
	};
	return { backend, opened, closed, state };
}

function setup({ dependsOnConnections = true }: { dependsOnConnections?: boolean } = {}) {
	const { backend, opened, closed, state } = fakeBackend(dependsOnConnections);
	// Tests may replace `closeWorld`; the service reads it from the registered backend.
	const registry = new SimulationBackendRegistry();
	registry.register(backend);

	// Fake repositories over in-memory state.
	const draft = { current: draftWith([serverA]) };
	const agentRepository = mock<AgentRepository>();
	agentRepository.findByIdAndProjectId.mockImplementation(
		async () =>
			({
				id: 'agent-1',
				schema: draft.current,
				tools: {},
				integrations: [],
			}) as never as ProjectAgent,
	);
	const threads = new Map<string, { testChat: boolean }>();
	const threadRepository = mock<AgentExecutionThreadRepository>();
	threadRepository.findTestChatState.mockImplementation(async (id) => threads.get(id));
	threadRepository.markTestChat.mockImplementation(async (id) => {
		const thread = threads.get(id);
		if (thread) thread.testChat = true;
		return thread !== undefined;
	});
	const executionRepository = mock<AgentExecutionRepository>();
	executionRepository.hasFinishedByThread.mockResolvedValue(false);
	const workflowRepository = mock<WorkflowRepository>();
	workflowRepository.findManyByAgentToolReferences.mockResolvedValue([]);
	const skillRefs = mock<AgentSkillRefsService>();
	skillRefs.refsForDraft.mockResolvedValue([] as never);
	const flagGate = mock<SafeTestingFlagGate>();
	flagGate.isEnabled.mockResolvedValue(true);
	const chatIntegrations = mock<ChatIntegrationRegistry>();
	chatIntegrations.get.mockReturnValue(undefined);
	// Credentials the owner can use, with the time each last changed. Absent: no access.
	const credentials = new Map<string, Date>([
		['credential-a', new Date('2026-11-01T00:00:00Z')],
		['credential-b', new Date('2026-11-01T00:00:00Z')],
	]);
	const credentialsFinder = mock<CredentialsFinderService>();
	credentialsFinder.findCredentialForUser.mockImplementation(async (id) => {
		const updatedAt = credentials.get(id);
		return (updatedAt ? { id, type: 'httpBearerAuth', updatedAt } : null) as never;
	});

	const service = new SimulationSessionService(
		mock<Logger>(),
		flagGate,
		registry,
		agentRepository,
		skillRefs,
		threadRepository,
		executionRepository,
		workflowRepository,
		chatIntegrations,
		credentialsFinder,
	);

	const owner = mock<User>({ id: 'user-1' });
	const input = (overrides: { user?: User; testRunRequested?: boolean } = {}) => ({
		user: owner,
		agentId: 'agent-1',
		projectId: 'project-1',
		testChatId: 'chat-1',
		message: 'hello',
		testRunRequested: true,
		...overrides,
	});
	/** One turn as the orchestrator runs it: the thread exists, the session opens, then marks it. */
	const turn = async (overrides?: Parameters<typeof input>[0]) => {
		if (!threads.has('chat-1')) threads.set('chat-1', { testChat: false });
		const session = await service.openForDraftRun(input(overrides));
		await session?.markTestChat();
		return session;
	};
	return {
		service,
		backend,
		agentRepository,
		opened,
		closed,
		state,
		draft,
		threads,
		threadRepository,
		credentials,
		credentialsFinder,
		input,
		turn,
	};
}

describe('SimulationSessionService connection binding', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('a backend whose world depends on the connections of the draft', () => {
		it('should reuse the world while the connections stay the same', async () => {
			const { turn, opened } = setup();

			const first = await turn();
			const second = await turn();

			expect(second).toBe(first);
			expect(opened).toHaveLength(1);
			expect(first?.worldId).toBe('world-1');
		});

		it('should pass the owner and no connection data to the backend', async () => {
			const { turn, opened } = setup();

			await turn();

			expect(opened[0].ownerId).toBe('user-1');
			expect(Object.keys(opened[0]).sort()).toEqual([
				'agent',
				'firstMessage',
				'ownerId',
				'testChatId',
			]);
			const sent = JSON.stringify(opened[0]);
			expect(sent).not.toContain('credential-a');
			expect(sent).not.toContain('url-key');
		});

		it('should open a new world for each change, also for a change back', async () => {
			const { turn, opened, draft } = setup();

			const first = await turn();
			draft.current = draftWith([serverB]);
			const second = await turn();
			draft.current = draftWith([serverA]);
			const third = await turn();

			expect(opened).toHaveLength(3);
			expect([first?.worldId, second?.worldId, third?.worldId]).toEqual([
				'world-1',
				'world-2',
				'world-3',
			]);
			expect(new Set([first, second, third]).size).toBe(3);
			expect(new Set([first, second, third].map((s) => s?.runtimeCacheKey)).size).toBe(3);
		});

		it.each([
			['name', { ...serverA, name: 'tracker-2' }],
			['url', { ...serverA, url: 'https://mcp.example.com/other' }],
			['authentication', { ...serverA, authentication: 'headerAuth' }],
			['credential reference', serverB],
		])('should open a new world when the %s of a server changes', async (_field, changed) => {
			const { turn, opened, draft } = setup();

			await turn();
			draft.current = draftWith([changed as McpServer]);
			await turn();

			expect(opened).toHaveLength(2);
		});

		it('should open a new world when a server is added or removed', async () => {
			const { turn, opened, draft } = setup();

			await turn();
			draft.current = draftWith([serverA, { ...serverB, name: 'docs' }]);
			await turn();
			draft.current = draftWith([]);
			await turn();

			expect(opened).toHaveLength(3);
		});

		it('should reuse the world when only instructions or other tools change', async () => {
			const { turn, opened, draft } = setup();

			const first = await turn();
			draft.current = draftWith([{ ...serverA, description: 'Issue tracker' } as McpServer], {
				instructions: 'Help customers quickly',
				tools: [
					{
						type: 'node',
						name: 'Send Slack',
						node: { nodeType: 'n8n-nodes-base.slack', nodeTypeVersion: 2, nodeParameters: {} },
					},
				],
			} as Partial<AgentJsonConfig>);
			const second = await turn();

			expect(second).toBe(first);
			expect(opened).toHaveLength(1);
		});

		it('should reuse the world when the servers change order', async () => {
			const { turn, opened, draft } = setup();
			const docs = { ...serverB, name: 'docs' };
			draft.current = draftWith([serverA, docs]);

			await turn();
			draft.current = draftWith([docs, serverA]);
			await turn();

			expect(opened).toHaveLength(1);
		});

		it('should share one open between overlapping turns of a new chat', async () => {
			const { service, opened, state, input } = setup();
			const gate = deferred();
			state.gate = gate.promise;

			const turns = [service.openForDraftRun(input()), service.openForDraftRun(input())];
			await vi.advanceTimersByTimeAsync(0);
			gate.resolve();
			const [first, second] = await Promise.all(turns);

			expect(first).toBeDefined();
			expect(second).toBe(first);
			expect(opened).toHaveLength(1);
		});

		it('should share one new world between overlapping turns after a change', async () => {
			const { service, turn, opened, draft, input } = setup();
			const old = await turn();
			draft.current = draftWith([serverB]);

			const [first, second, third] = await Promise.all([
				service.openForDraftRun(input()),
				service.openForDraftRun(input()),
				service.openForDraftRun(input({ testRunRequested: false })),
			]);

			expect(first).not.toBe(old);
			expect(second).toBe(first);
			expect(third).toBe(first);
			expect(opened).toHaveLength(2);
		});

		it('should check the binding again after a shared open', async () => {
			const { service, opened, state, draft, input } = setup();
			const gate = deferred();
			state.gate = gate.promise;

			const early = service.openForDraftRun(input());
			await vi.advanceTimersByTimeAsync(0);
			expect(opened).toHaveLength(1);
			// The draft changes while the first open is in flight.
			draft.current = draftWith([serverB]);
			const late = service.openForDraftRun(input());
			gate.resolve();
			const [first, second] = await Promise.all([early, late]);

			expect(first?.worldId).toBe('world-1');
			expect(second?.worldId).toBe('world-2');
			expect(opened).toHaveLength(2);
			expect(await service.openForDraftRun(input())).toBe(second);
		});

		it('should open a new world after the cached session expires', async () => {
			const { turn, opened } = setup();

			const first = await turn();
			vi.advanceTimersByTime(29 * 60 * 1000);
			expect(await turn()).toBe(first);
			vi.advanceTimersByTime(31 * 60 * 1000);
			const later = await turn({ testRunRequested: false });

			expect(later).not.toBe(first);
			expect(later?.worldId).toBe('world-2');
			expect(opened).toHaveLength(2);
		});

		it('should drop the cached session when the test chat marker is gone', async () => {
			const { service, turn, opened, threads, input } = setup();
			const first = await turn();

			threads.delete('chat-1');

			// Without the marker the chat is new, and a new chat runs live unless it asks for a test.
			expect(await service.openForDraftRun(input({ testRunRequested: false }))).toBeUndefined();
			const second = await turn();
			expect(second).not.toBe(first);
			expect(second?.worldId).toBe('world-2');
			expect(opened).toHaveLength(2);
		});

		it('should detect a removed thread after a replacement that did not mark again', async () => {
			const { service, turn, opened, draft, threads, input } = setup();
			await turn();

			// The connections change. This turn opens the replacement and does not store the marker.
			draft.current = draftWith([serverB]);
			const replaced = await service.openForDraftRun(input({ testRunRequested: false }));
			expect(replaced?.worldId).toBe('world-2');
			threads.delete('chat-1');

			expect(await service.openForDraftRun(input({ testRunRequested: false }))).toBeUndefined();
			expect(opened).toHaveLength(2);
		});

		it('should detect a removed thread after an expired cache without a new mark', async () => {
			const { service, turn, opened, threads, input } = setup();
			await turn();

			vi.advanceTimersByTime(31 * 60 * 1000);
			const later = await service.openForDraftRun(input({ testRunRequested: false }));
			expect(later?.worldId).toBe('world-2');
			threads.delete('chat-1');

			expect(await service.openForDraftRun(input({ testRunRequested: false }))).toBeUndefined();
			expect(opened).toHaveLength(2);
		});

		it('should keep a session that has not stored its marker yet', async () => {
			const { service, opened, threads, input } = setup();
			threads.set('chat-1', { testChat: false });

			const first = await service.openForDraftRun(input());
			const second = await service.openForDraftRun(input({ testRunRequested: false }));

			expect(second).toBe(first);
			expect(opened).toHaveLength(1);
		});

		it('should keep the world when the credential is updated in place', async () => {
			const { turn, opened, closed, credentials } = setup();
			const first = await turn();

			// A rename or an OAuth2 token refresh changes `updatedAt` only.
			credentials.set('credential-a', new Date('2026-11-23T10:00:00Z'));
			const second = await turn();

			expect(second).toBe(first);
			expect(opened).toHaveLength(1);
			expect(closed).toEqual([]);
		});

		it('should treat an empty credential ID as no credential', async () => {
			const { turn, opened, draft, credentialsFinder } = setup();
			draft.current = draftWith([{ ...serverA, credential: '' }]);

			await turn();

			expect(credentialsFinder.findCredentialForUser).not.toHaveBeenCalled();
			expect(opened[0].agent.tools.map((tool) => tool.toolName)).toContain('tracker');
		});

		it('should drop the world and leave the server out when the owner loses access', async () => {
			const { turn, opened, closed, credentials } = setup();
			const first = await turn();

			credentials.delete('credential-a');
			const second = await turn();

			expect(second).not.toBe(first);
			expect(closed).toEqual(['world-1']);
			expect(opened[1].agent.tools.map((tool) => tool.toolName)).not.toContain('tracker');
		});

		it('should check credential access as the owner, with the runtime scope', async () => {
			const { turn, credentialsFinder } = setup();
			await turn();

			expect(credentialsFinder.findCredentialForUser).toHaveBeenCalledWith(
				'credential-a',
				expect.objectContaining({ id: 'user-1' }),
				['credential:read'],
				// A see-only role cannot use the credential, so it does not keep the server.
				{ excludeSeeOnlyRoles: true },
			);
		});

		it('should close the world of a removed thread', async () => {
			const { turn, closed, threads } = setup();
			await turn();

			threads.delete('chat-1');
			await turn();

			expect(closed).toEqual(['world-1']);
		});

		it('should close a world whose cache entry expired', async () => {
			const { turn, closed } = setup();
			await turn();

			vi.advanceTimersByTime(31 * 60 * 1000);
			await turn();

			expect(closed).toEqual(['world-1']);
		});

		it('should close a world once when it expires during the binding check', async () => {
			const { turn, closed, agentRepository } = setup();
			await turn();

			const findAgent = agentRepository.findByIdAndProjectId.getMockImplementation();
			agentRepository.findByIdAndProjectId.mockImplementationOnce(async (...args) => {
				vi.setSystemTime(Date.now() + 31 * 60 * 1000);
				return await findAgent!(...args);
			});
			const second = await turn();

			expect(second?.worldId).toBe('world-2');
			expect(closed).toEqual(['world-1']);
		});

		it('should close an idle world soon after it expires, with no further turn', async () => {
			const { turn, closed } = setup();
			await turn();

			await vi.advanceTimersByTimeAsync(36 * 60 * 1000);

			expect(closed).toEqual(['world-1']);
		});

		it('should close the open worlds on shutdown', async () => {
			const { service, turn, closed } = setup();
			await turn();
			await turn({ user: mock<User>({ id: 'user-2' }) });

			await service.shutdown();

			expect(closed.sort()).toEqual(['world-1', 'world-2']);
		});

		it('should still run the turn when closing the old world throws synchronously', async () => {
			const { turn, opened, backend, draft } = setup();
			await turn();
			backend.closeWorld = () => {
				throw new Error('not a promise');
			};

			draft.current = draftWith([serverB]);
			const second = await turn();
			vi.runAllTicks();

			expect(second?.worldId).toBe('world-2');
			expect(opened).toHaveLength(2);
		});

		it('should still run the turn when closing the old world fails', async () => {
			const { turn, opened, closed, state, draft } = setup();
			await turn();
			state.closeFails = true;

			draft.current = draftWith([serverB]);
			const second = await turn();
			vi.runAllTicks();

			expect(second?.worldId).toBe('world-2');
			expect(opened).toHaveLength(2);
			expect(closed).toEqual(['world-1']);
		});

		it('should give a second owner their own world', async () => {
			const { turn, opened } = setup();
			const other = mock<User>({ id: 'user-2' });

			const first = await turn();
			const second = await turn({ user: other });

			expect(second).not.toBe(first);
			expect(opened.map((world) => world.ownerId)).toEqual(['user-1', 'user-2']);
			expect(await turn()).toBe(first);
			expect(await turn({ user: other })).toBe(second);
			expect(opened).toHaveLength(2);
		});
	});

	describe('a backend without the opt-in', () => {
		it('should keep the world when the connections change', async () => {
			const { turn, opened, draft } = setup({ dependsOnConnections: false });

			const first = await turn();
			draft.current = draftWith([serverB]);
			const second = await turn();

			expect(second).toBe(first);
			expect(opened).toHaveLength(1);
			expect(opened[0].ownerId).toBe('user-1');
		});

		it('should keep the cached session when the marker is gone', async () => {
			const { service, turn, opened, threads, threadRepository, input } = setup({
				dependsOnConnections: false,
			});
			const first = await turn();
			threads.delete('chat-1');
			threadRepository.findTestChatState.mockClear();

			const second = await service.openForDraftRun(input({ testRunRequested: false }));

			expect(second).toBe(first);
			expect(opened).toHaveLength(1);
			expect(threadRepository.findTestChatState).not.toHaveBeenCalled();
		});

		it('should share one open between overlapping turns', async () => {
			const { service, opened, input } = setup({ dependsOnConnections: false });

			const [first, second] = await Promise.all([
				service.openForDraftRun(input()),
				service.openForDraftRun(input()),
			]);

			expect(second).toBe(first);
			expect(opened).toHaveLength(1);
		});
	});
});
