import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentContextService } from '@/modules/agents/agent-context.service';
import type { FinishedAgentExecution } from '@/modules/agents/agent-execution.service';
import type { AgentHistory } from '@/modules/agents/entities/agent-history.entity';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import type { AgentLiveCheckFailureRepository } from '@/modules/agents/repositories/agent-live-check-failure.repository';
import type { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { AgentLiveChecksService, LIVE_WINDOW_DAYS } from '../agent-live-checks.service';

vi.mock('@/modules/agents/repositories/agent.repository', () => ({
	AgentRepository: class AgentRepository {},
}));
vi.mock('@/modules/agents/repositories/agent-history.repository', () => ({
	AgentHistoryRepository: class AgentHistoryRepository {},
}));
vi.mock('@/modules/agents/agent-context.service', () => ({
	AgentContextService: class AgentContextService {},
}));
vi.mock('@/modules/agents/repositories/agent-live-check-failure.repository', () => ({
	AgentLiveCheckFailureRepository: class AgentLiveCheckFailureRepository {},
}));

const schema = {
	name: 'Order desk',
	tools: [{ type: 'workflow', workflow: 'w-lookup', name: 'lookup_order' }],
};

const failedLookup = {
	type: 'tool-call',
	kind: 'workflow',
	name: 'lookup_order',
	toolCallId: 'c1',
	input: {},
	output: { status: 'error', error: 'Timeout' },
	startTime: 0,
	endTime: 1,
	success: false,
} as const;

function finished(overrides: Partial<FinishedAgentExecution> = {}): FinishedAgentExecution {
	return {
		executionId: 'exec-1',
		agentId: 'agent-1',
		threadId: 'thread-1',
		status: 'success',
		runType: 'production',
		userMessage: 'Where is my order?',
		timeline: [failedLookup, { type: 'text', content: 'Sorry, I could not look it up.' }],
		...overrides,
	} as FinishedAgentExecution;
}

function setup() {
	const agents = mock<AgentRepository>();
	agents.findOne.mockResolvedValue({ id: 'agent-1', activeVersionId: 'v-2' } as Agent);
	agents.findByIdAndProjectId.mockResolvedValue({ id: 'agent-1', activeVersionId: 'v-2' } as never);
	const history = mock<AgentHistoryRepository>();
	history.findOneBy.mockResolvedValue({ versionId: 'v-2', schema } as unknown as AgentHistory);
	const failures = mock<AgentLiveCheckFailureRepository>();
	const context = mock<AgentContextService>();
	const service = new AgentLiveChecksService(mock(), agents, history, failures, context);
	return { service, agents, history, failures, context };
}

describe('AgentLiveChecksService.checkFinishedExecution', () => {
	it('stamps the published version and saves the checks that failed', async () => {
		const { service, failures } = setup();

		await service.checkFinishedExecution(finished());

		expect(failures.stampVersion).toHaveBeenCalledWith('exec-1', 'v-2');
		expect(failures.saveFailures).toHaveBeenCalledWith([
			expect.objectContaining({
				executionId: 'exec-1',
				checkId: 'tool:tool_failed',
				agentId: 'agent-1',
				agentVersionId: 'v-2',
			}),
		]);
	});

	it('saves no failure for a run where every check passed', async () => {
		const { service, failures } = setup();

		await service.checkFinishedExecution(
			finished({ timeline: [{ type: 'text', content: 'Shipped.' }] as never }),
		);

		expect(failures.stampVersion).toHaveBeenCalledWith('exec-1', 'v-2');
		expect(failures.saveFailures).toHaveBeenCalledWith([]);
	});

	it.each([
		['a test-chat run', { runType: 'test' as const }],
		['a run with no run type', { runType: undefined }],
		['a run paused for approval', { hitlStatus: 'suspended' as const }],
		['a cancelled run', { status: 'cancelled' as const }],
	])('ignores %s', async (_name, overrides) => {
		const { service, agents, failures } = setup();

		await service.checkFinishedExecution(finished(overrides));

		expect(agents.findOne).not.toHaveBeenCalled();
		expect(failures.saveFailures).not.toHaveBeenCalled();
	});

	it('ignores a run of an agent with no published version', async () => {
		const { service, agents, failures } = setup();
		agents.findOne.mockResolvedValue({ id: 'agent-1', activeVersionId: null } as Agent);

		await service.checkFinishedExecution(finished());

		expect(failures.stampVersion).not.toHaveBeenCalled();
	});
});

describe('AgentLiveChecksService.report', () => {
	const now = new Date('2026-11-09T12:00:00Z');

	it('counts failed sessions per check for this version and the last one', async () => {
		const { service, failures } = setup();
		failures.sessionsPerVersion.mockResolvedValue([
			{
				versionId: 'v-2',
				sessions: 15,
				firstAt: new Date('2026-11-01T00:00:00Z'),
				lastAt: new Date('2026-11-09T00:00:00Z'),
			},
			{
				versionId: 'v-1',
				sessions: 15,
				firstAt: new Date('2026-10-20T00:00:00Z'),
				lastAt: new Date('2026-10-31T00:00:00Z'),
			},
		]);
		failures.failedSessions.mockResolvedValue([
			{ versionId: 'v-2', checkId: 'tool:tool_failed', sessions: 6 },
			{ versionId: 'v-2', checkId: 'tool:repeated_call', sessions: 1 },
			{ versionId: 'v-1', checkId: 'tool:repeated_call', sessions: 1 },
		]);

		const report = await service.report('project-1', 'agent-1', now);

		const since = new Date(now.getTime() - LIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
		expect(failures.sessionsPerVersion).toHaveBeenCalledWith('agent-1', since);
		expect(failures.failedSessions).toHaveBeenCalledWith('agent-1', ['v-2', 'v-1'], since);
		expect(report.current).toEqual({
			versionId: 'v-2',
			sessions: 15,
			since: '2026-11-01T00:00:00.000Z',
		});
		expect(report.previous).toEqual({ versionId: 'v-1', sessions: 15 });
		expect(report.checks.find((c) => c.checkId === 'tool:tool_failed')).toMatchObject({
			failed: 6,
			prevFailed: 0,
			moreOften: true,
		});
		expect(report.checks.find((c) => c.checkId === 'tool:repeated_call')).toMatchObject({
			failed: 1,
			prevFailed: 1,
			moreOften: false,
		});
		// Every check of the published version is listed, failures or not.
		expect(report.checks.find((c) => c.checkId === 'tool:empty_reply')).toMatchObject({
			failed: 0,
		});
	});

	it('has no previous count when only one version ran', async () => {
		const { service, failures } = setup();
		failures.sessionsPerVersion.mockResolvedValue([
			{ versionId: 'v-2', sessions: 4, firstAt: now, lastAt: now },
		]);
		failures.failedSessions.mockResolvedValue([]);

		const report = await service.report('project-1', 'agent-1', now);

		expect(report.previous).toBeNull();
		expect(report.checks.every((c) => c.prevFailed === null && !c.moreOften)).toBe(true);
	});

	it('404s for an agent outside the project', async () => {
		const { service, agents } = setup();
		agents.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.report('project-1', 'agent-1', now)).rejects.toThrow(NotFoundError);
	});
});

describe('AgentLiveChecksService.failuresForSession', () => {
	const user = { id: 'user-1' } as never;

	it("returns each execution's failed checks, for a session the user can read", async () => {
		const { service, context, failures } = setup();
		context.readSession.mockResolvedValue({
			thread: {},
			executions: [{ id: 'exec-1' }, { id: 'exec-2' }],
		} as never);
		failures.forExecutions.mockResolvedValue([
			{ executionId: 'exec-2', checkId: 'tool:tool_failed', reason: 'lookup_order failed.' },
		] as never);

		const result = await service.failuresForSession(user, 'project-1', 'agent-1', 'thread-1');

		expect(context.readSession).toHaveBeenCalledWith(user, 'project-1', 'agent-1', 'thread-1');
		expect(failures.forExecutions).toHaveBeenCalledWith(['exec-1', 'exec-2']);
		expect(result).toEqual({
			executions: { 'exec-2': [{ checkId: 'tool:tool_failed', reason: 'lookup_order failed.' }] },
		});
	});

	it('404s for a session the user cannot read', async () => {
		const { service, context, failures } = setup();
		context.readSession.mockResolvedValue(null as never);

		await expect(
			service.failuresForSession(user, 'project-1', 'agent-1', 'thread-1'),
		).rejects.toThrow(NotFoundError);
		expect(failures.forExecutions).not.toHaveBeenCalled();
	});
});
