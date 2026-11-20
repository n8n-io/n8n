import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';
import type { User } from '@n8n/db';

import type { ProjectAgent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { AgentExecutionThreadRepository } from '../../repositories/agent-execution-thread.repository';
import { SimulationBackendRegistry } from '../simulation-backend-registry';
import { SimulationSessionService } from '../simulation-session.service';

vi.mock('@/modules/skills', () => ({ getSkillHash: vi.fn() }));
vi.mock('../../agent-skill-refs.service', () => ({ AgentSkillRefsService: class {} }));
vi.mock('../safe-testing-flag-gate', () => ({ SafeTestingFlagGate: class {} }));
vi.mock('../../json-config/agent-config-composition', () => ({
	sanitizeToolName: (s: string) => s,
}));
vi.mock('../../tools/instrumented-run-guard', () => ({}));
vi.mock('../../tools/workflow-tool-workflow-resolver', () => ({}));
vi.mock('../../integrations/integration-tool-factory', () => ({
	getIntegrationToolConnectionDescriptors: () => [],
}));
vi.mock('../test-run-credentials-helper', () => ({}));

afterEach(() => {
	vi.unstubAllEnvs();
	vi.useRealTimers();
});

it('reuses only the current saved connection and draft until reset or expiry', async () => {
	vi.stubEnv('N8N_SAFE_TESTING_BACKEND', 'linear-gym');
	vi.useFakeTimers();
	const registry = new SimulationBackendRegistry();
	const backend = registry.get()!;
	let count = 0;
	const opens = vi.spyOn(backend, 'openWorld').mockImplementation(async () => ({
		worldId: String(++count),
		backend: backend.id,
		handleRequest: vi.fn(),
	}));
	const repo = mock<AgentRepository>();
	const threads = mock<AgentExecutionThreadRepository>();
	threads.findTestChatState.mockResolvedValue({ testChat: true });
	const server = {
		name: 'linear',
		url: 'https://mcp.linear.app/mcp',
		authentication: 'bearerAuth',
		credential: 'fixture-a',
	};
	const schema = { name: 'Fixture', instructions: 'Test', mcpServers: [server] };
	repo.findByIdAndProjectId.mockResolvedValue({ schema } as unknown as ProjectAgent);
	const service = new SimulationSessionService(
		mock(),
		mock(),
		registry,
		repo,
		mock(),
		threads,
		mock(),
		mock(),
		mock(),
	);
	const input = {
		user: mock<User>({ id: 'owner' }),
		agentId: 'agent',
		projectId: 'project',
		testChatId: 'chat',
		message: 'test',
	};
	const open = async () => await service.openForDraftRun(input);
	const first = await open();
	expect(first?.worldId).toBe('1');
	expect(await Promise.all([open(), open()])).toEqual([first, first]);
	server.credential = 'fixture-b';
	expect((await open())?.runtimeCacheKey).not.toBe(first?.runtimeCacheKey);
	server.credential = 'fixture-a';
	expect((await open())?.worldId).toBe('3');
	schema.instructions = 'New instructions';
	expect((await open())?.worldId).toBe('4');
	vi.advanceTimersByTime(30 * 60_000 + 1);
	expect((await open())?.worldId).toBe('5');
	for (const credential of ['', AI_GATEWAY_MANAGED_TAG]) {
		server.credential = credential;
		const blocked = await open();
		expect(blocked).toBeDefined();
		expect(blocked?.worldId).toBeUndefined();
	}
	expect(opens).toHaveBeenCalledTimes(5);
	threads.findTestChatState.mockResolvedValue(undefined);
	expect(await open()).toBeUndefined();
	threads.findTestChatState.mockResolvedValue({ testChat: true });
	server.credential = 'fixture-a';
	expect((await open())?.worldId).toBe('6');
	threads.findTestChatState.mockResolvedValue(undefined);
	expect(await open()).toBeUndefined();
	threads.findTestChatState.mockResolvedValue({ testChat: true });
	expect((await open())?.worldId).toBe('7');
	const other = await service.openForDraftRun({ ...input, user: mock<User>({ id: 'second' }) });
	expect(other?.worldId).toBe('8');
	expect((await open())?.worldId).toBe('7');
	expect(JSON.stringify(opens.mock.calls)).not.toContain('fixture-a');
});
