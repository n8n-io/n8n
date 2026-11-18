import type { SelfHealingAgentApplyProgress } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import type { TransactionRunner, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentContextService } from '@/modules/agents/agent-context.service';
import type { AgentProposalService } from '@/modules/agents/agent-proposal.service';
import type { AgentEvalProposalService } from '@/modules/agent-evals/agent-eval-proposal.service';

import type { SelfHealingAgentInvestigationRepository } from '../agents/database/self-healing-agent-investigation.repository';
import type { SelfHealingAgentResult } from '../agents/database/self-healing-agent-result.entity';
import type { SelfHealingAgentResultRepository } from '../agents/database/self-healing-agent-result.repository';
import type { SelfHealingAgentInvestigationService } from '../agents/self-healing-agent-investigation.service';
import { getAgentEvalProposals, getAgentServices } from '../agents/self-healing-agent-modules';
import {
	SELF_HEALING_AGENT_SWEEP_MAX_STARTS,
	SelfHealingAgentSweepTask,
} from '../agents/self-healing-agent-sweep.task';
import type { SelfHealingConfiguration } from '../database/self-healing-configuration.entity';
import type {
	SelfHealingAgentCoverage,
	SelfHealingConfigurationRepository,
} from '../database/self-healing-configuration.repository';
import type { SelfHealingConfigurationService } from '../self-healing-configuration.service';

vi.mock('../agents/self-healing-agent-modules', () => ({
	getAgentServices: vi.fn(),
	getAgentEvalProposals: vi.fn(),
}));
// The real service loads the Assistant runtime. The task needs only its two pure helpers.
vi.mock('../agents/self-healing-agent-investigation.service', () => ({
	SelfHealingAgentInvestigationService: class {},
	agentTraceWindowStart: (lastWindowEnd: Date | null, publishedAt: Date) =>
		lastWindowEnd && lastWindowEnd > publishedAt ? lastWindowEnd : publishedAt,
	isOutdatedAgentProposal: (
		open: { baseVersionId: string; applyProgress: SelfHealingAgentApplyProgress },
		versionId: string,
	) => !open.applyProgress.evalsApplied && open.baseVersionId !== versionId,
}));

const actor = mock<User>({ id: 'actor' });
const now = new Date('2026-06-01T12:00:00.000Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * Time.hours.toMilliseconds);
const emptyProgress: SelfHealingAgentApplyProgress = {
	evalsApplied: false,
	savedSkillIds: [],
	savedVersionId: null,
	agentPublished: false,
};

describe('SelfHealingAgentSweepTask', () => {
	const investigationService = mock<SelfHealingAgentInvestigationService>();
	const investigations = mock<SelfHealingAgentInvestigationRepository>();
	const results = mock<SelfHealingAgentResultRepository>();
	const configurations = mock<SelfHealingConfigurationRepository>();
	const configurationService = mock<SelfHealingConfigurationService>();
	const txRunner = mock<TransactionRunner>();
	const logger = mock<Logger>();
	const proposals = mock<AgentProposalService>();
	const context = mock<AgentContextService>();
	const evals = mock<AgentEvalProposalService>();
	const task = new SelfHealingAgentSweepTask(
		investigationService,
		investigations,
		results,
		configurations,
		configurationService,
		txRunner,
		logger,
	);
	const { signal } = new AbortController();
	let coverage: SelfHealingAgentCoverage;

	const expectStart = (agentId: string, trigger: string) =>
		expect(investigationService.start).toHaveBeenCalledWith({
			configurationId: 1,
			projectId: 'project',
			agentId,
			trigger,
		});

	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers({ now });
		coverage = {
			id: 1,
			projectId: 'project',
			agentScope: 'selected',
			agentIds: ['agent'],
			agentGoals: ['quality'],
			agentScheduleIntervalHours: 24,
			agentTraceThreshold: null,
			agentPublicationMode: 'approval',
			enabledById: actor.id,
			updatedAt: hoursAgo(48),
		};
		vi.mocked(getAgentServices).mockResolvedValue({ proposals, context });
		vi.mocked(getAgentEvalProposals).mockResolvedValue(evals);
		evals.availability.mockReturnValue('ok');
		txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
		configurations.listEnabledWithAgentCoverage.mockImplementation(async () => [coverage]);
		configurations.findForUpdate.mockResolvedValue(mock<SelfHealingConfiguration>({ id: 1 }));
		configurations.findForAgent.mockResolvedValue(mock<SelfHealingConfiguration>({ id: 1 }));
		configurationService.resolveAgentActorOrPause.mockResolvedValue(actor);
		context.getPublishedVersion.mockResolvedValue({
			versionId: 'version',
			publishedAt: hoursAgo(72),
			agentName: 'Support agent',
			clean: true,
		});
		context.countProductionTraces.mockResolvedValue(0);
		investigations.getUnfinishedForAgent.mockResolvedValue(null);
		investigations.getLastFailedAt.mockResolvedValue(null);
		investigations.getLastConsuming.mockResolvedValue(null);
		results.getOpenForAgent.mockResolvedValue(null);
		investigationService.start.mockResolvedValue({ status: 'started' });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('runs every 5 minutes on one main and does not retry a failed sweep', () => {
		expect(task.name).toBe('self-healing-agent-sweep');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 300 });
		expect(task.target).toEqual({
			scope: 'cluster',
			scheduler: { retryOnFailure: false },
			leaderTimer: { runOnTakeover: true, retryDelaySeconds: 30 },
		});
	});

	it('reconciles interrupted investigations before it starts new ones', async () => {
		await task.run(signal);

		expect(investigationService.reconcile).toHaveBeenCalledWith(signal);
		expect(investigationService.reconcile.mock.invocationCallOrder[0]).toBeLessThan(
			investigationService.start.mock.invocationCallOrder[0],
		);
	});

	it('does nothing after cancellation', async () => {
		await task.run(AbortSignal.abort());
		expect(investigationService.reconcile).not.toHaveBeenCalled();
	});

	it.each([
		['Agents are off', () => vi.mocked(getAgentServices).mockResolvedValue(null)],
		[
			'the eval modules are inactive',
			() => vi.mocked(getAgentEvalProposals).mockResolvedValue(null),
		],
		['the instance uses queue mode', () => evals.availability.mockReturnValue('queue_mode')],
	])('reconciles but reads no configuration when %s', async (_name, arrange) => {
		arrange();

		await task.run(signal);

		expect(investigationService.reconcile).toHaveBeenCalled();
		expect(configurations.listEnabledWithAgentCoverage).not.toHaveBeenCalled();
	});

	it('starts a schedule investigation when the interval has passed', async () => {
		await task.run(signal);
		expectStart('agent', 'schedule');
	});

	it.each([
		[
			'the last trace window',
			() =>
				investigations.getLastConsuming.mockResolvedValue({
					agentVersionId: 'old-version',
					traceWindowEnd: hoursAgo(2),
				}),
		],
		['the configuration change', () => (coverage.updatedAt = hoursAgo(2))],
		[
			'the publication',
			() =>
				context.getPublishedVersion.mockResolvedValue({
					versionId: 'version',
					publishedAt: hoursAgo(2),
					agentName: 'Support agent',
					clean: true,
				}),
		],
	])('counts the schedule interval from %s', async (_name, arrange) => {
		arrange();
		await task.run(signal);
		expect(investigationService.start).not.toHaveBeenCalled();
	});

	it('starts a traces investigation when the count reaches the threshold', async () => {
		coverage.agentScheduleIntervalHours = null;
		coverage.agentTraceThreshold = 10;
		investigations.getLastConsuming.mockResolvedValue({
			agentVersionId: 'version',
			traceWindowEnd: hoursAgo(2),
		});
		context.countProductionTraces.mockResolvedValue(10);

		await task.run(signal);

		expect(context.countProductionTraces).toHaveBeenCalledWith(actor, 'project', 'agent', {
			after: hoursAgo(2),
			until: now,
		});
		expectStart('agent', 'traces');
	});

	it('does not start when the trace count is below the threshold', async () => {
		coverage.agentScheduleIntervalHours = null;
		coverage.agentTraceThreshold = 10;
		context.countProductionTraces.mockResolvedValue(9);

		await task.run(signal);

		expect(investigationService.start).not.toHaveBeenCalled();
	});

	it('starts one investigation with the trigger both when the two triggers are due', async () => {
		coverage.agentTraceThreshold = 10;
		context.countProductionTraces.mockResolvedValue(12);

		await task.run(signal);

		expect(investigationService.start).toHaveBeenCalledOnce();
		expectStart('agent', 'both');
	});

	describe('a schedule for a version that an investigation already read', () => {
		beforeEach(() => {
			investigations.getLastConsuming.mockResolvedValue({
				agentVersionId: 'version',
				traceWindowEnd: hoursAgo(30),
			});
		});

		it('does not start when no production session is new', async () => {
			await task.run(signal);

			expect(context.countProductionTraces).toHaveBeenCalledWith(actor, 'project', 'agent', {
				after: hoursAgo(30),
				until: now,
			});
			expect(investigationService.start).not.toHaveBeenCalled();
		});

		it('starts when a production session is new', async () => {
			context.countProductionTraces.mockResolvedValue(1);
			await task.run(signal);
			expectStart('agent', 'schedule');
		});

		it('does not start for the session count when the count is below the threshold', async () => {
			coverage.agentTraceThreshold = 10;
			await task.run(signal);
			expect(investigationService.start).not.toHaveBeenCalled();
		});

		it('does not count sessions before the interval has passed', async () => {
			coverage.agentScheduleIntervalHours = 48;
			await task.run(signal);
			expect(context.countProductionTraces).not.toHaveBeenCalled();
			expect(investigationService.start).not.toHaveBeenCalled();
		});
	});

	it('starts on schedule for a new version that has no production session', async () => {
		investigations.getLastConsuming.mockResolvedValue({
			agentVersionId: 'old-version',
			traceWindowEnd: hoursAgo(30),
		});

		await task.run(signal);

		expect(context.countProductionTraces).not.toHaveBeenCalled();
		expectStart('agent', 'schedule');
	});

	it('skips a configuration that has no trigger', async () => {
		coverage.agentScheduleIntervalHours = null;

		await task.run(signal);

		expect(configurations.findForUpdate).not.toHaveBeenCalled();
		expect(investigationService.start).not.toHaveBeenCalled();
	});

	it('skips a configuration whose enabling user lost the access', async () => {
		configurationService.resolveAgentActorOrPause.mockResolvedValue(null);
		await task.run(signal);
		expect(investigationService.start).not.toHaveBeenCalled();
	});

	it('reads the published agents of the project for all-agent coverage', async () => {
		coverage.agentScope = 'all';
		coverage.agentIds = [];
		context.listProjectAgents.mockResolvedValue([
			{ id: 'published', name: 'A', published: true },
			{ id: 'draft', name: 'B', published: false },
		]);

		await task.run(signal);

		expect(investigationService.start).toHaveBeenCalledOnce();
		expectStart('published', 'schedule');
	});

	it.each([
		[
			'another configuration selects the agent',
			() =>
				configurations.findForAgent.mockResolvedValue(mock<SelfHealingConfiguration>({ id: 2 })),
		],
		['the agent is not published', () => context.getPublishedVersion.mockResolvedValue(null)],
		[
			'the draft has changes',
			() =>
				context.getPublishedVersion.mockResolvedValue({
					versionId: 'version',
					publishedAt: hoursAgo(72),
					agentName: 'Support agent',
					clean: false,
				}),
		],
		[
			'an investigation is not finished',
			() => investigations.getUnfinishedForAgent.mockResolvedValue({ id: 'other' }),
		],
		[
			'a proposal for the published version is open',
			() =>
				results.getOpenForAgent.mockResolvedValue(
					mock<SelfHealingAgentResult>({ baseVersionId: 'version', applyProgress: emptyProgress }),
				),
		],
		[
			'an investigation failed in the last hour',
			() => investigations.getLastFailedAt.mockResolvedValue(hoursAgo(0.5)),
		],
	])('does not start when %s', async (_name, arrange) => {
		arrange();
		await task.run(signal);
		expect(investigationService.start).not.toHaveBeenCalled();
	});

	it('starts when the open proposal is for an old version, so that start closes it', async () => {
		results.getOpenForAgent.mockResolvedValue(
			mock<SelfHealingAgentResult>({ baseVersionId: 'old-version', applyProgress: emptyProgress }),
		);
		await task.run(signal);
		expectStart('agent', 'schedule');
	});

	it('starts again when the last failure is older than one hour', async () => {
		investigations.getLastFailedAt.mockResolvedValue(hoursAgo(2));
		await task.run(signal);
		expectStart('agent', 'schedule');
	});

	it('continues with the next agent when one agent fails', async () => {
		coverage.agentIds = ['broken', 'agent'];
		context.getPublishedVersion.mockRejectedValueOnce(new Error('Query failed.'));

		await expect(task.run(signal)).resolves.toBeUndefined();

		expectStart('agent', 'schedule');
	});

	it('stops after the maximum number of started investigations', async () => {
		coverage.agentIds = Array.from({ length: 8 }, (_, index) => `agent-${index}`);
		// A refused start does not count.
		investigationService.start.mockResolvedValueOnce({ status: 'already_running' });

		await task.run(signal);

		expect(investigationService.start).toHaveBeenCalledTimes(
			SELF_HEALING_AGENT_SWEEP_MAX_STARTS + 1,
		);
	});
});
