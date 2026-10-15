import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { InstanceAiConfig } from '@n8n/config';
import type { Project, SharedWorkflowRepository, TransactionRunner, User } from '@n8n/db';
import { ConflictError, ForbiddenError } from '@n8n/errors';
import { selfHealingOutputSchema, type CredentialResolutionResult } from '@n8n/instance-ai';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { DurableEventLog } from '../../event-bus/durable-event-log';
import type { InterruptedRunSweeper } from '../../event-bus/interrupted-run-sweeper';
import type { InstanceAiService } from '../../instance-ai.service';
import type { InstanceAiEventLogRepository } from '../../repositories/instance-ai-event-log.repository';
import type { WorkflowSuggestion } from '../../workflow-suggestions/database/workflow-suggestion.entity';
import type { WorkflowSuggestionRepository } from '../../workflow-suggestions/database/workflow-suggestion.repository';
import type { WorkflowSuggestionService } from '../../workflow-suggestions/workflow-suggestion.service';
import type { SelfHealingInvestigation } from '../database/self-healing-investigation.entity';
import type { SelfHealingInvestigationRepository } from '../database/self-healing-investigation.repository';
import type { SelfHealingResult } from '../database/self-healing-result.entity';
import type { SelfHealingRunResult } from '../self-healing-agent.service';
import type { SelfHealingExecutionReferenceService } from '../self-healing-execution-reference.service';
import { SelfHealingInvestigationService } from '../self-healing-investigation.service';
import type { SelfHealingResultService } from '../self-healing-result.service';

const user = mock<User>({ id: 'actor' });
const input = {
	workflowId: 'workflow',
	projectId: 'project',
	backgroundUserId: user.id,
	executionId: '123',
};
const baseline = mock<WorkflowSuggestionBaseline>({ ...input });

describe('SelfHealingInvestigationService', () => {
	const investigations = mock<SelfHealingInvestigationRepository>();
	const results = mock<SelfHealingResultService>();
	const suggestions = mock<WorkflowSuggestionService>();
	const suggestionRepository = mock<WorkflowSuggestionRepository>();
	const ownership = mock<SharedWorkflowRepository>();
	const executions = mock<SelfHealingExecutionReferenceService>();
	const runtime = mock<InstanceAiService>();
	const events = mock<InstanceAiEventLogRepository>();
	const eventLog = mock<DurableEventLog>();
	const sweeper = mock<InterruptedRunSweeper>();
	const txRunner = mock<TransactionRunner>();
	const config = mock<InstanceAiConfig>({ workflowSuggestionsEnabled: true });
	const logger = mock<Logger>();
	const service = new SelfHealingInvestigationService(
		investigations,
		results,
		suggestions,
		suggestionRepository,
		ownership,
		executions,
		runtime,
		events,
		eventLog,
		sweeper,
		txRunner,
		config,
		logger,
	);
	let investigation: SelfHealingInvestigation;
	let run: SelfHealingRunResult;
	let execution: Promise<SelfHealingRunResult> | undefined;
	let controller: AbortController;

	beforeEach(() => {
		vi.resetAllMocks();
		config.workflowSuggestionsEnabled = true;
		execution = undefined;
		controller = new AbortController();
		investigation = mock<SelfHealingInvestigation>({
			...input,
			id: 'investigation',
			baseline,
			threadId: 'private-thread',
			runId: 'run',
			acceptedOutput: null,
			resultId: null,
			finishedAt: null,
			createdAt: new Date(Date.now() - 300_000),
		});
		run = {
			threadId: investigation.threadId,
			runId: investigation.runId,
			status: 'completed',
			finishReason: 'stop',
			output: {
				outcome: 'could_not_fix',
				summary: 'No fix found.',
				report: 'The cause could not be determined.',
			},
			usage: { credits: 2, turns: 3, durationSeconds: 10 },
		};
		suggestions.requireEditor.mockResolvedValue(user);
		suggestions.requireCurrentBaseline.mockResolvedValue(user);
		suggestions.captureBaseline.mockResolvedValue(baseline);
		ownership.getWorkflowOwningProject.mockResolvedValue(mock<Project>({ id: input.projectId }));
		investigations.getForExecution.mockResolvedValue(null);
		investigations.getUnfinishedForWorkflow.mockResolvedValue(null);
		investigations.createInvestigation.mockResolvedValue(investigation);
		investigations.storeAcceptedOutput.mockImplementation(async (_id, output) => {
			investigation.acceptedOutput = output;
		});
		suggestionRepository.getPendingForWorkflow.mockResolvedValue(null);
		txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
		runtime.startSelfHealingRun.mockImplementation(async (_input, lifecycle) => {
			execution = (async () => {
				await lifecycle.onComplete(run, controller.signal);
				return run;
			})();
			return await execution;
		});
		results.complete.mockResolvedValue(mock<SelfHealingResult>({ id: 'result' }));
		events.getRunFinish.mockResolvedValue(null);
		events.lastFactAt.mockResolvedValue(investigation.createdAt);
	});

	async function startAndFinish() {
		const response = await service.start(input);
		await vi.waitFor(() => expect(execution).toBeDefined());
		await execution;
		return response;
	}

	it('does not admit an investigation when workflow suggestions are disabled', async () => {
		config.workflowSuggestionsEnabled = false;

		await expect(service.start(input)).rejects.toThrow('Self-healing investigations are disabled.');
		expect(investigations.createInvestigation).not.toHaveBeenCalled();
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
	});

	it('uses server references and persists accepted output before completion', async () => {
		expect(await startAndFinish()).toEqual({
			kind: 'investigation',
			investigationId: investigation.id,
		});
		expect(runtime.startSelfHealingRun).toHaveBeenCalledWith(
			{
				user,
				baseline,
				executionId: input.executionId,
			},
			expect.objectContaining({ threadId: investigation.threadId, runId: investigation.runId }),
		);
		expect(investigations.storeAcceptedOutput).toHaveBeenCalledWith(
			investigation.id,
			expect.objectContaining({ output: run.output, usage: run.usage }),
		);
		expect(results.complete).toHaveBeenCalledWith({ investigationId: investigation.id });
		expect(investigations.storeAcceptedOutput.mock.invocationCallOrder[0]).toBeLessThan(
			results.complete.mock.invocationCallOrder[0],
		);
	});

	it('normalizes final report text before storage', async () => {
		const value = ['xoxb', '1234567890', 'abcdefghij'].join('-');
		const output = {
			outcome: 'needs_you' as const,
			summary: `The response contained ${value}.`,
			report: `Check the HTTP Request node. Authorization: Bearer ${value}`,
		};
		run.output = output;

		await startAndFinish();

		expect(investigation.acceptedOutput?.output).toEqual({
			outcome: 'needs_you',
			summary: 'The response contained [REDACTED].',
			report: 'Check the HTTP Request node. Authorization: [REDACTED]',
		});
		expect(output.report).toContain(value);
	});

	it.each([
		['summary', 500],
		['report', 50_000],
	] as const)('keeps %s within its limit after text replacement', async (field, limit) => {
		const output = selfHealingOutputSchema.parse({
			...run.output,
			[field]: 'token=x '.repeat(Math.floor(limit / 8)).padEnd(limit, '.'),
		});
		run.output = output;

		await startAndFinish();

		expect(investigation.acceptedOutput?.output[field]).toHaveLength(limit);
		expect(investigation.acceptedOutput?.output[field]).not.toContain('token=x');
		expect(selfHealingOutputSchema.safeParse(investigation.acceptedOutput?.output).success).toBe(
			true,
		);
	});

	it.each(['fix_ready', 'needs_you'] as const)(
		'keeps a useful candidate for %s',
		async (outcome) => {
			run.output = {
				outcome,
				summary: 'Update the node.',
				report: 'The node now uses the correct field.',
				candidateFilePath: 'candidate.ts',
			};
			run.candidate = {
				filePath: 'candidate.ts',
				compile: vi.fn().mockResolvedValue({
					success: true,
					workflow: { nodes: [], connections: {} },
					credentialResolution: mock<CredentialResolutionResult>({ mockedCredentialTypes: [] }),
				}),
			};
			await startAndFinish();
			expect(investigation.acceptedOutput?.candidate).toEqual({
				graph: { nodes: [], connections: {} },
			});
		},
	);

	it.each([
		{ missing: true, outcome: 'needs_you' },
		{ missing: false, outcome: 'fix_ready' },
	])(
		'saves $outcome when simulated credentials are missing=$missing',
		async ({ missing, outcome }) => {
			const value = ['xoxb', '1234567890', 'abcdefghij'].join('-');
			const output = {
				outcome: 'fix_ready' as const,
				summary: 'The workflow is fixed.',
				report: 'The credential was created and verification passed.',
				candidateFilePath: 'candidate.ts',
			};
			const graph = { nodes: [], connections: {} };
			run.output = output;
			run.candidate = {
				filePath: output.candidateFilePath,
				compile: vi.fn().mockResolvedValue({
					success: true,
					workflow: graph,
					credentialResolution: mock<CredentialResolutionResult>({
						mockedNodeNames: ['Fetch Order'],
						mockedCredentialTypes: missing ? ['httpHeaderAuth'] : [],
						mockedCredentialsByNode: missing
							? { [`Fetch Order ${value}`]: ['httpHeaderAuth'] }
							: {},
						resolvedCredentialsByNode: missing
							? {}
							: { 'Fetch Order': [{ type: 'openAiApi', id: null, name: 'Gateway credits' }] },
					}),
				}),
			};

			await startAndFinish();

			const accepted = investigation.acceptedOutput;
			expect(accepted?.output.outcome).toBe(outcome);
			expect(accepted?.candidate?.graph).toEqual(graph);
			if (missing) {
				expect(accepted?.output.summary).toContain('credentials');
				expect(accepted?.output.summary).not.toBe(output.summary);
				expect(accepted?.output.report).toContain('Fetch Order');
				expect(accepted?.output.report).toContain('[REDACTED]');
				expect(accepted?.output.report).not.toContain(value);
				expect(accepted?.output.report).toContain('httpHeaderAuth');
				expect(accepted?.output.report).not.toContain('credential was created');
			} else {
				expect(accepted?.output).toEqual(output);
			}
			expect(results.complete).toHaveBeenCalledWith({ investigationId: investigation.id });
		},
	);

	it('keeps a needs-attention report without changes', async () => {
		run.output = {
			outcome: 'needs_you',
			summary: 'Reconnect the credential.',
			report: 'The credential needs to be reconnected.',
		};
		await startAndFinish();
		expect(investigation.acceptedOutput?.output.outcome).toBe('needs_you');
		expect(investigation.acceptedOutput?.candidate).toBeUndefined();
	});

	it.each(['cancelled', 'errored', 'suspended'] as const)(
		'creates no result for a %s run',
		async (status) => {
			run.status = status;
			run.output = {
				outcome: 'fix_ready',
				summary: 'Candidate checked.',
				report: 'Verification passed.',
				candidateFilePath: 'candidate.workflow.ts',
			};
			run.candidate = { filePath: 'candidate.workflow.ts', compile: vi.fn() };
			await startAndFinish();
			expect(investigations.finishIfNoAcceptedOutput).toHaveBeenCalledWith(investigation.id);
			expect(investigations.storeAcceptedOutput).not.toHaveBeenCalled();
			expect(run.candidate?.compile).not.toHaveBeenCalled();
			expect(results.complete).not.toHaveBeenCalled();
		},
	);

	it.each(['max-iterations', 'other'] as const)(
		'creates no result for termination reason %s',
		async (finishReason) => {
			run.finishReason = finishReason;
			await startAndFinish();
			expect(investigations.storeAcceptedOutput).not.toHaveBeenCalled();
			expect(results.complete).not.toHaveBeenCalled();
		},
	);

	it('creates no result when final output is missing', async () => {
		run.output = undefined;
		await startAndFinish();
		expect(results.complete).not.toHaveBeenCalled();
	});

	it('does not run the model again for the same failed execution', async () => {
		investigations.getForExecution.mockResolvedValue(investigation);
		expect(await service.start(input)).toEqual({
			kind: 'investigation',
			investigationId: investigation.id,
		});
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
		expect(executions.validateFailure).not.toHaveBeenCalled();
	});

	it('returns a pending suggestion instead of starting another investigation', async () => {
		suggestionRepository.getPendingForWorkflow.mockResolvedValue(
			mock<WorkflowSuggestion>({ id: 'pending' }),
		);
		expect(await service.start(input)).toEqual({ kind: 'suggestion', suggestionId: 'pending' });
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
	});

	it('does not accept output when cancellation arrives during the final baseline check', async () => {
		const checking = createDeferredPromise();
		const checked = createDeferredPromise();
		suggestions.requireCurrentBaseline
			.mockResolvedValueOnce(user)
			.mockImplementationOnce(async () => {
				checking.resolve();
				await checked.promise;
				return user;
			});
		await service.start(input);
		await checking.promise;
		controller.abort(new Error('Run cancelled'));
		checked.resolve();
		await expect(execution).rejects.toThrow('Run cancelled');
		expect(investigations.storeAcceptedOutput).not.toHaveBeenCalled();
		expect(results.complete).not.toHaveBeenCalled();
		await vi.waitFor(() =>
			expect(investigations.finishIfNoAcceptedOutput).toHaveBeenCalledWith(investigation.id),
		);
	});

	it('rechecks claims after admission waits', async () => {
		investigations.getUnfinishedForWorkflow
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(investigation);
		await service.start(input);
		expect(investigations.createInvestigation).not.toHaveBeenCalled();
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
	});

	it('checks current access before returning existing work', async () => {
		investigations.getForExecution.mockResolvedValue(investigation);
		suggestions.requireEditor.mockRejectedValue(new ForbiddenError('No access.'));
		await expect(service.start(input)).rejects.toBeInstanceOf(ForbiddenError);
		expect(investigations.getForExecution).not.toHaveBeenCalled();
	});

	it('rejects a changed baseline before claiming or using a model', async () => {
		suggestions.requireCurrentBaseline.mockRejectedValue(new ConflictError('Changed.'));
		await expect(service.start(input)).rejects.toBeInstanceOf(ConflictError);
		expect(investigations.createInvestigation).not.toHaveBeenCalled();
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
	});

	it('retries accepted output without a model or workspace', async () => {
		investigation.acceptedOutput = {
			output: run.output!,
			usage: run.usage,
			completedAt: new Date().toISOString(),
		};
		investigations.listUnfinished.mockResolvedValue([investigation]);
		await service.reconcile();
		expect(results.complete).toHaveBeenCalledWith({ investigationId: investigation.id });
		expect(runtime.startSelfHealingRun).not.toHaveBeenCalled();
	});

	it('keeps accepted output when the completion transaction fails', async () => {
		results.complete.mockRejectedValue(new Error('Database unavailable.'));
		await expect(service.finalize(investigation.id)).rejects.toThrow('Database unavailable.');
		expect(investigations.rejectAcceptedOutput).not.toHaveBeenCalled();
	});

	it.each([new ConflictError('Changed.'), new ForbiddenError('No access.')])(
		'releases work that cannot be finalized: %s',
		async (error) => {
			results.complete.mockRejectedValue(error);
			await expect(service.finalize(investigation.id)).rejects.toBe(error);
			expect(investigations.rejectAcceptedOutput).toHaveBeenCalledWith(investigation.id);
		},
	);

	it('reconciles interrupted work through the Assistant lifecycle', async () => {
		investigations.listUnfinished.mockResolvedValue([investigation]);
		events.getRunFinish.mockResolvedValue({ status: 'interrupted', reason: 'crash_interrupted' });
		await service.reconcile();
		expect(sweeper.sweepRun).toHaveBeenCalledWith(investigation.threadId, investigation.runId);
		expect(investigations.finishIfNoAcceptedOutput).toHaveBeenCalledWith(investigation.id);
		expect(results.complete).not.toHaveBeenCalled();
	});

	it('leaves a live run claimed', async () => {
		investigations.listUnfinished.mockResolvedValue([investigation]);
		runtime.isRunLive.mockReturnValue(true);
		await service.reconcile();
		expect(sweeper.sweepRun).not.toHaveBeenCalled();
		expect(investigations.finishIfNoAcceptedOutput).not.toHaveBeenCalled();
	});

	it('releases a claim when the process stopped before creating the private thread', async () => {
		investigations.listUnfinished.mockResolvedValue([investigation]);
		events.lastFactAt.mockResolvedValue(null);
		await service.reconcile();
		expect(investigations.finishIfNoAcceptedOutput).toHaveBeenCalledWith(investigation.id);
		expect(sweeper.sweepRun).not.toHaveBeenCalled();
	});

	it('does not reap a claim while another main can still be starting it', async () => {
		investigation.createdAt = new Date();
		investigations.listUnfinished.mockResolvedValue([investigation]);
		await service.reconcile();
		expect(sweeper.sweepRun).not.toHaveBeenCalled();
	});
});
