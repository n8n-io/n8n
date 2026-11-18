import type { SelfHealingAgentApplyProgress } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { InstanceAiConfig } from '@n8n/config';
import type { TransactionRunner, User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import { QueryFailedError } from '@n8n/typeorm';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { AgentContextService } from '@/modules/agents/agent-context.service';
import type { AgentProposalBase } from '@/modules/agents/agent-proposal.contracts';
import type { AgentProposalService } from '@/modules/agents/agent-proposal.service';
import type { AgentEvalProposalService } from '@/modules/agent-evals/agent-eval-proposal.service';

import type { DurableEventLog } from '../../event-bus/durable-event-log';
import type { InterruptedRunSweeper } from '../../event-bus/interrupted-run-sweeper';
import { InstanceAiRunLimitError } from '../../instance-ai-run-limit.error';
import type { InstanceAiService } from '../../instance-ai.service';
import type { InstanceAiEventLogRepository } from '../../repositories/instance-ai-event-log.repository';
import type { SelfHealingAgentInvestigation } from '../agents/database/self-healing-agent-investigation.entity';
import type { SelfHealingAgentInvestigationRepository } from '../agents/database/self-healing-agent-investigation.repository';
import type { SelfHealingAgentResult } from '../agents/database/self-healing-agent-result.entity';
import type { SelfHealingAgentResultRepository } from '../agents/database/self-healing-agent-result.repository';
import {
	agentTraceWindowStart,
	SELF_HEALING_AGENT_MAX_TRACE_WINDOW_MS,
	SelfHealingAgentInvestigationService,
} from '../agents/self-healing-agent-investigation.service';
import type {
	AgentImprovementRunLifecycle,
	AgentImprovementRunResult,
} from '../agents/self-healing-agent-investigator.service';
import { getAgentEvalProposals, getAgentServices } from '../agents/self-healing-agent-modules';
import type { SelfHealingAgentResultService } from '../agents/self-healing-agent-result.service';
import type { SelfHealingConfiguration } from '../database/self-healing-configuration.entity';
import type { SelfHealingConfigurationRepository } from '../database/self-healing-configuration.repository';
import type { SelfHealingConfigurationService } from '../self-healing-configuration.service';

vi.mock('../agents/self-healing-agent-modules', () => ({
	getAgentServices: vi.fn(),
	getAgentEvalProposals: vi.fn(),
}));

const actor = mock<User>({ id: 'actor' });
const input = {
	configurationId: 1,
	projectId: 'project',
	agentId: 'agent',
	trigger: 'manual',
} as const;
const emptyProgress: SelfHealingAgentApplyProgress = {
	evalsApplied: false,
	savedSkillIds: [],
	savedVersionId: null,
	agentPublished: false,
};
const usage = { credits: 2, turns: 3, durationSeconds: 10 };
const now = new Date('2026-06-01T12:00:00.000Z');
const publishedAt = new Date('2026-05-30T12:00:00.000Z');

describe('SelfHealingAgentInvestigationService', () => {
	const investigations = mock<SelfHealingAgentInvestigationRepository>();
	const results = mock<SelfHealingAgentResultService>();
	const resultRepository = mock<SelfHealingAgentResultRepository>();
	const configurations = mock<SelfHealingConfigurationRepository>();
	const configurationService = mock<SelfHealingConfigurationService>();
	const runtime = mock<InstanceAiService>();
	const events = mock<InstanceAiEventLogRepository>();
	const eventLog = mock<DurableEventLog>();
	const sweeper = mock<InterruptedRunSweeper>();
	const txRunner = mock<TransactionRunner>();
	const config = mock<InstanceAiConfig>({ workflowSuggestionsEnabled: true });
	const logger = mock<Logger>();
	const proposals = mock<AgentProposalService>();
	const context = mock<AgentContextService>();
	const evals = mock<AgentEvalProposalService>();
	const service = new SelfHealingAgentInvestigationService(
		investigations,
		results,
		resultRepository,
		configurations,
		configurationService,
		runtime,
		events,
		eventLog,
		sweeper,
		txRunner,
		config,
		logger,
	);
	const base = mock<AgentProposalBase>({
		agentId: input.agentId,
		agentName: 'Support agent',
		versionId: 'version',
		publishedAt,
	});
	let configuration: SelfHealingConfiguration;
	let investigation: SelfHealingAgentInvestigation;
	let run: AgentImprovementRunResult;
	let lifecycle: AgentImprovementRunLifecycle | undefined;

	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers({ now });
		config.workflowSuggestionsEnabled = true;
		// A plain object, because the mock library does not return an array field unchanged.
		configuration = {
			id: input.configurationId,
			enabled: true,
			agentScope: 'all',
			agentGoals: ['quality'],
		} as SelfHealingConfiguration;
		investigation = mock<SelfHealingAgentInvestigation>({
			...input,
			id: 'investigation',
			threadId: 'thread',
			runId: 'run',
			createdAt: new Date(now.getTime() - 300_000),
		});
		run = {
			status: 'completed',
			finishReason: 'stop',
			output: { outcome: 'no_change', summary: 'Nothing to change', report: 'No finding.' },
			usage,
			lastTested: null,
		};
		lifecycle = undefined;

		vi.mocked(getAgentServices).mockResolvedValue({ proposals, context });
		vi.mocked(getAgentEvalProposals).mockResolvedValue(evals);
		evals.availability.mockReturnValue('ok');
		txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
		configurations.findForAgent.mockResolvedValue(configuration);
		configurations.findForUpdate.mockResolvedValue(configuration);
		configurationService.resolveAgentActorOrPause.mockResolvedValue(actor);
		investigations.getUnfinishedForAgent.mockResolvedValue(null);
		investigations.getLastConsumingWindowEnd.mockResolvedValue(null);
		investigations.createInvestigation.mockResolvedValue(investigation);
		investigations.finish.mockResolvedValue(true);
		resultRepository.getOpenForAgent.mockResolvedValue(null);
		proposals.readBase.mockResolvedValue({ base });
		context.countProductionTraces.mockResolvedValue(7);
		runtime.startAgentImprovementRun.mockImplementation(async (_input, runLifecycle) => {
			lifecycle = runLifecycle;
			await runLifecycle.onComplete(run, new AbortController().signal);
			return run;
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('start', () => {
		it('claims the agent and starts the run with the base and the trace window', async () => {
			await expect(service.start(input)).resolves.toEqual({ status: 'started' });

			expect(investigations.createInvestigation).toHaveBeenCalledWith(
				expect.objectContaining({
					...input,
					backgroundUserId: actor.id,
					agentVersionId: 'version',
					traceWindowStart: publishedAt,
					traceWindowEnd: now,
					traceCount: 7,
				}),
				expect.anything(),
			);
			expect(runtime.startAgentImprovementRun).toHaveBeenCalledWith(
				{
					user: actor,
					threadId: 'thread',
					investigationId: 'investigation',
					projectId: input.projectId,
					agentId: input.agentId,
					goals: ['quality'],
					base,
					traceWindow: { after: publishedAt, until: now },
					traceCount: 7,
				},
				expect.objectContaining({ runId: 'run' }),
			);
		});

		it('does not wait for the run', async () => {
			const execution = createDeferredPromise<AgentImprovementRunResult>();
			runtime.startAgentImprovementRun.mockReturnValue(execution.promise);

			await expect(service.start(input)).resolves.toEqual({ status: 'started' });

			expect(investigations.finish).not.toHaveBeenCalled();
			execution.resolve(run);
		});

		it('rejects a start when self-healing is disabled', async () => {
			config.workflowSuggestionsEnabled = false;
			await expect(service.start(input)).rejects.toThrow('disabled');
		});

		it('returns testing_unavailable when Agents are off', async () => {
			vi.mocked(getAgentServices).mockResolvedValue(null);
			await expect(service.start(input)).resolves.toEqual({
				status: 'not_eligible',
				reason: 'testing_unavailable',
			});
		});

		it.each([
			['another configuration covers the agent', { id: 2, enabled: true }],
			['the configuration is paused', { id: 1, enabled: false }],
		])('returns not_covered when %s', async (_name, found) => {
			configurations.findForAgent.mockResolvedValue(mock<SelfHealingConfiguration>(found));
			await expect(service.start(input)).resolves.toEqual({
				status: 'not_eligible',
				reason: 'not_covered',
			});
			expect(configurationService.resolveAgentActorOrPause).not.toHaveBeenCalled();
		});

		it('returns no_access when the enabling user lost the access', async () => {
			configurationService.resolveAgentActorOrPause.mockResolvedValue(null);
			await expect(service.start(input)).resolves.toEqual({
				status: 'not_eligible',
				reason: 'no_access',
			});
			expect(proposals.readBase).not.toHaveBeenCalled();
		});

		it.each([
			['the eval modules are inactive', null],
			['the instance uses queue mode', 'queue_mode'],
		] as const)('returns testing_unavailable when %s', async (_name, availability) => {
			if (availability) evals.availability.mockReturnValue(availability);
			else vi.mocked(getAgentEvalProposals).mockResolvedValue(null);

			await expect(service.start(input)).resolves.toEqual({
				status: 'not_eligible',
				reason: 'testing_unavailable',
			});
			expect(investigations.createInvestigation).not.toHaveBeenCalled();
		});

		it('returns already_running before it reads the open proposal', async () => {
			investigations.getUnfinishedForAgent.mockResolvedValue({ id: 'other' });

			await expect(service.start(input)).resolves.toEqual({ status: 'already_running' });
			expect(resultRepository.getOpenForAgent).not.toHaveBeenCalled();
		});

		it('returns the open proposal before it reads the agent state', async () => {
			resultRepository.getOpenForAgent.mockResolvedValue(
				mock<SelfHealingAgentResult>({
					id: 'result',
					baseVersionId: 'version',
					applyProgress: emptyProgress,
				}),
			);
			context.getPublishedVersion.mockResolvedValue({
				versionId: 'version',
				publishedAt,
				agentName: 'Support agent',
				clean: false,
			});

			await expect(service.start(input)).resolves.toEqual({
				status: 'open_proposal',
				resultId: 'result',
			});
			expect(proposals.readBase).not.toHaveBeenCalled();
			expect(resultRepository.close).not.toHaveBeenCalled();
		});

		it('closes an open proposal for an old version as outdated and continues', async () => {
			resultRepository.getOpenForAgent.mockResolvedValueOnce(
				mock<SelfHealingAgentResult>({
					id: 'result',
					baseVersionId: 'old-version',
					applyProgress: emptyProgress,
				}),
			);
			context.getPublishedVersion.mockResolvedValue({
				versionId: 'version',
				publishedAt,
				agentName: 'Support agent',
				clean: true,
			});
			resultRepository.close.mockResolvedValue(true);

			await expect(service.start(input)).resolves.toEqual({ status: 'started' });
			expect(resultRepository.close).toHaveBeenCalledWith(
				'result',
				'outdated',
				{ closedById: null, claimStaleBefore: expect.any(Date) },
				expect.anything(),
			);
		});

		it('keeps a partly applied proposal for an old version open', async () => {
			resultRepository.getOpenForAgent.mockResolvedValue(
				mock<SelfHealingAgentResult>({
					id: 'result',
					baseVersionId: 'old-version',
					applyProgress: { ...emptyProgress, evalsApplied: true },
				}),
			);
			context.getPublishedVersion.mockResolvedValue(null);

			await expect(service.start(input)).resolves.toEqual({
				status: 'open_proposal',
				resultId: 'result',
			});
			expect(resultRepository.close).not.toHaveBeenCalled();
		});

		it.each([
			['not_found', 'not_published'],
			['archived', 'not_published'],
			['not_published', 'not_published'],
			['unpublished_changes', 'unpublished_changes'],
		] as const)('maps the agent state %s to %s', async (unavailable, reason) => {
			proposals.readBase.mockResolvedValue({ unavailable });
			await expect(service.start(input)).resolves.toEqual({ status: 'not_eligible', reason });
			expect(investigations.createInvestigation).not.toHaveBeenCalled();
		});

		it('returns no_access when the trace count is forbidden', async () => {
			context.countProductionTraces.mockRejectedValue(new ForbiddenError('No access.'));
			await expect(service.start(input)).resolves.toEqual({
				status: 'not_eligible',
				reason: 'no_access',
			});
		});

		it('checks the existing work again in the claim transaction', async () => {
			investigations.getUnfinishedForAgent
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce({ id: 'other' });

			await expect(service.start(input)).resolves.toEqual({ status: 'already_running' });
			expect(investigations.createInvestigation).not.toHaveBeenCalled();
		});

		it('returns already_running when the claim index rejects the insert', async () => {
			investigations.createInvestigation.mockRejectedValue(
				new QueryFailedError(
					'insert',
					[],
					Object.assign(new Error('duplicate'), { code: '23505' }),
				),
			);

			await expect(service.start(input)).resolves.toEqual({ status: 'already_running' });
			expect(runtime.startAgentImprovementRun).not.toHaveBeenCalled();
		});

		it('finishes the claim and returns busy when the Assistant refuses the run', async () => {
			runtime.startAgentImprovementRun.mockImplementation(() => {
				throw new InstanceAiRunLimitError('Busy.', { reason: 'instance_run_limit', limit: 1 });
			});

			await expect(service.start(input)).resolves.toEqual({
				status: 'not_eligible',
				reason: 'busy',
			});
			expect(investigations.finish).toHaveBeenCalledWith('investigation', {
				outcome: 'failed',
				failureReason: 'not_started',
				usage: null,
			});
		});

		it('finishes the claim as failed when the run rejects', async () => {
			runtime.startAgentImprovementRun.mockRejectedValue(new Error('Model error.'));

			await expect(service.start(input)).resolves.toEqual({ status: 'started' });
			await vi.waitFor(() =>
				expect(investigations.finish).toHaveBeenCalledWith('investigation', {
					outcome: 'failed',
					failureReason: 'not_started',
					usage: null,
				}),
			);
		});

		it('finishes the claim with save_failed when the save of a valid answer rejects', async () => {
			run.output = { outcome: 'proposal', summary: 'Fix the lookup tool', report: 'Report.' };
			run.lastTested = { edits: [], evalCases: [], evidence: { ranAt: '', cases: [] } };
			results.complete.mockRejectedValue(new Error('Database error.'));

			await service.start(input);

			await vi.waitFor(() =>
				expect(investigations.finish).toHaveBeenCalledWith('investigation', {
					outcome: 'failed',
					failureReason: 'save_failed',
					usage,
				}),
			);
		});
	});

	describe('run completion', () => {
		it('finishes a no_change answer without a proposal', async () => {
			await service.start(input);

			expect(investigations.finish).toHaveBeenCalledWith('investigation', {
				outcome: 'no_change',
				failureReason: null,
				usage,
			});
			expect(results.complete).not.toHaveBeenCalled();
		});

		it.each([
			['cancelled', { status: 'cancelled' }],
			['errored', { status: 'errored' }],
			['length', { finishReason: 'length' }],
			['invalid_output', { output: null }],
		] as const)('finishes as failed with the reason %s', async (reason, change) => {
			Object.assign(run, change);

			await service.start(input);

			expect(investigations.finish).toHaveBeenCalledWith('investigation', {
				outcome: 'failed',
				failureReason: reason,
				usage,
			});
			expect(results.complete).not.toHaveBeenCalled();
		});

		it('rejects a proposal that has no successful test', async () => {
			run.output = { outcome: 'proposal', summary: 'Fix the lookup tool', report: 'Report.' };

			await service.start(input);

			expect(investigations.finish).toHaveBeenCalledWith('investigation', {
				outcome: 'failed',
				failureReason: 'untested_proposal',
				usage,
			});
			expect(results.complete).not.toHaveBeenCalled();
		});

		describe('with a tested proposal', () => {
			const lastTested = { edits: [], evalCases: [], evidence: { ranAt: '', cases: [] } };
			const result = mock<SelfHealingAgentResult>({ id: 'result' });

			beforeEach(() => {
				run.output = { outcome: 'proposal', summary: 'Fix the lookup tool', report: 'Report.' };
				run.lastTested = lastTested;
			});

			it('saves the proposal and waits for a reviewer in approval mode', async () => {
				results.complete.mockResolvedValue({ result, actor, publicationMode: 'approval' });

				await service.start(input);

				expect(results.complete).toHaveBeenCalledWith({
					investigationId: 'investigation',
					agentName: 'Support agent',
					goals: ['quality'],
					output: run.output,
					lastTested,
					usage,
					signal: expect.any(AbortSignal),
				});
				expect(results.applyAutomatically).not.toHaveBeenCalled();
				expect(lifecycle?.runId).toBe('run');
			});

			it('applies the saved proposal in auto mode', async () => {
				results.complete.mockResolvedValue({ result, actor, publicationMode: 'auto' });

				await service.start(input);

				expect(results.applyAutomatically).toHaveBeenCalledWith(actor, result);
			});

			it('keeps the investigation finished when the automatic apply rejects', async () => {
				results.complete.mockResolvedValue({ result, actor, publicationMode: 'auto' });
				results.applyAutomatically.mockRejectedValue(new Error('Publish failed.'));

				await expect(service.start(input)).resolves.toEqual({ status: 'started' });
				expect(investigations.finish).not.toHaveBeenCalled();
			});

			it('does not apply when the configuration was paused during the run', async () => {
				results.complete.mockResolvedValue(null);

				await service.start(input);

				expect(results.applyAutomatically).not.toHaveBeenCalled();
			});
		});
	});

	describe('reconcile', () => {
		beforeEach(() => {
			investigations.listUnfinished.mockResolvedValue([investigation]);
			runtime.isRunLive.mockReturnValue(false);
		});

		it('does not change an investigation whose run is live', async () => {
			runtime.isRunLive.mockReturnValue(true);
			await service.reconcile();
			expect(investigations.finish).not.toHaveBeenCalled();
		});

		it('does not change a new investigation', async () => {
			investigation.createdAt = new Date(now.getTime() - 1000);
			await service.reconcile();
			expect(events.lastFactAt).not.toHaveBeenCalled();
		});

		it('closes a claim whose run saved no event', async () => {
			events.lastFactAt.mockResolvedValue(null);

			await service.reconcile();

			expect(investigations.finish).toHaveBeenCalledWith('investigation', {
				outcome: 'failed',
				failureReason: 'crash_interrupted',
				usage: null,
			});
		});

		it('closes a claim after the interrupted run is swept', async () => {
			events.lastFactAt.mockResolvedValue(new Date());
			events.getRunFinish.mockResolvedValue(mock());

			await service.reconcile();

			expect(sweeper.sweepRun).toHaveBeenCalledWith('thread', 'run');
			expect(investigations.finish).toHaveBeenCalledWith(
				'investigation',
				expect.objectContaining({ failureReason: 'crash_interrupted' }),
			);
		});

		it('stops when the signal is aborted', async () => {
			await service.reconcile(AbortSignal.abort());
			expect(runtime.isRunLive).not.toHaveBeenCalled();
		});
	});

	describe('agentTraceWindowStart', () => {
		it('uses the end of the last window when it is the newest time', () => {
			const lastWindowEnd = new Date('2026-05-31T12:00:00.000Z');
			expect(agentTraceWindowStart(lastWindowEnd, publishedAt, now)).toEqual(lastWindowEnd);
		});

		it('does not start before the publication of the current version', () => {
			const lastWindowEnd = new Date('2026-05-29T12:00:00.000Z');
			expect(agentTraceWindowStart(lastWindowEnd, publishedAt, now)).toEqual(publishedAt);
		});

		it('limits the window for an old version without an earlier investigation', () => {
			expect(agentTraceWindowStart(null, new Date('2025-01-01T00:00:00.000Z'), now)).toEqual(
				new Date(now.getTime() - SELF_HEALING_AGENT_MAX_TRACE_WINDOW_MS),
			);
		});
	});
});
