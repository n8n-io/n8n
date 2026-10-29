import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceAiConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import {
	SharedWorkflowRepository,
	TransactionRunner,
	type OperationContext,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { selfHealingOutputSchema } from '@n8n/instance-ai';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { randomUUID } from 'node:crypto';

import { DurableEventLog } from '../event-bus/durable-event-log';
import { InterruptedRunSweeper } from '../event-bus/interrupted-run-sweeper';
import { InstanceAiService } from '../instance-ai.service';
import { InstanceAiEventLogRepository } from '../repositories/instance-ai-event-log.repository';
import { WorkflowSuggestionService } from '../workflow-suggestions/workflow-suggestion.service';
import type { SelfHealingInvestigation } from './database/self-healing-investigation.entity';
import { SelfHealingConfigurationRepository } from './database/self-healing-configuration.repository';
import { SelfHealingInvestigationRepository } from './database/self-healing-investigation.repository';
import { SelfHealingResultRepository } from './database/self-healing-result.repository';
import type { SelfHealingRunResult } from './self-healing-agent.service';
import { SelfHealingConfigurationService } from './self-healing-configuration.service';
import { SelfHealingExecutionReferenceService } from './self-healing-execution-reference.service';
import {
	SelfHealingResultService,
	type SelfHealingResultInput,
} from './self-healing-result.service';

export const SELF_HEALING_CANNOT_FIX_COOLDOWN_MS = Time.days.toMilliseconds;

type StartInvestigation = {
	workflowId: string;
	projectId: string;
	executionId: string;
};

type ExistingWork =
	| { kind: 'investigation'; investigationId: string }
	| { kind: 'result'; resultId: string };

@Service()
export class SelfHealingInvestigationService {
	constructor(
		private readonly investigations: SelfHealingInvestigationRepository,
		private readonly results: SelfHealingResultService,
		private readonly suggestions: WorkflowSuggestionService,
		private readonly resultRepository: SelfHealingResultRepository,
		private readonly ownership: SharedWorkflowRepository,
		private readonly executions: SelfHealingExecutionReferenceService,
		private readonly runtime: InstanceAiService,
		private readonly events: InstanceAiEventLogRepository,
		private readonly eventLog: DurableEventLog,
		private readonly sweeper: InterruptedRunSweeper,
		private readonly txRunner: TransactionRunner,
		private readonly config: InstanceAiConfig,
		private readonly logger: Logger,
		private readonly configurations: SelfHealingConfigurationRepository,
		private readonly configurationService: SelfHealingConfigurationService,
	) {}

	/** Admit an eligible failure. Automatic triggers belong to the caller. */
	async start(input: StartInvestigation): Promise<ExistingWork | null> {
		if (!this.config.workflowSuggestionsEnabled) {
			throw new BadRequestError('Self-healing investigations are disabled.');
		}

		const configuration = await this.configurations.findForWorkflow(
			input.projectId,
			input.workflowId,
		);
		if (!configuration) return null;

		const actor = await this.txRunner.run({}, async (ctx) => {
			const current = await this.configurations.findForUpdate(
				configuration.id,
				input.projectId,
				ctx,
			);
			if (!current) return null;

			return await this.configurationService.resolveActorOrPause(current, input.workflowId, ctx);
		});
		if (!actor) return null;

		await this.requireProject(input.workflowId, input.projectId);
		await this.suggestions.reconcileWorkflow(input.workflowId);

		const existing = await this.findExisting(input);
		if (existing) return existing;

		if (await this.resultRepository.isInCooldown(this.cooldownQuery(input))) return null;

		try {
			const baseline = await this.suggestions.captureBaseline(input.workflowId, actor.id);
			if (baseline.projectId !== input.projectId) {
				throw new NotFoundError('Workflow not found in this project.');
			}
			await this.executions.validateFailure(actor, baseline, input.executionId);

			const claimed = await this.claim(input, baseline, configuration.id);
			if (!claimed || 'kind' in claimed) return claimed;

			// Return the investigation ID without waiting for the agent to finish.
			void this.run(claimed, baseline, actor).catch((error: unknown) => {
				this.logger.error('Self-healing investigation failed.', {
					investigationId: claimed.id,
					error,
				});
			});
			return { kind: 'investigation', investigationId: claimed.id };
		} catch (error) {
			if (error instanceof ForbiddenError) {
				await this.configurationService.recheckAccess(
					configuration.id,
					input.projectId,
					input.workflowId,
				);
			}

			throw error;
		}
	}

	private async findExisting(
		input: StartInvestigation,
		ctx: OperationContext = {},
	): Promise<ExistingWork | null> {
		const executionInvestigation = await this.investigations.getForExecution(
			input.workflowId,
			input.executionId,
			ctx,
		);
		if (executionInvestigation) {
			return { kind: 'investigation', investigationId: executionInvestigation.id };
		}

		const unfinishedInvestigation = await this.investigations.getUnfinishedForWorkflow(
			input.workflowId,
			ctx,
		);
		if (unfinishedInvestigation) {
			return { kind: 'investigation', investigationId: unfinishedInvestigation.id };
		}

		const result = await this.resultRepository.getOpenForWorkflow(
			input.workflowId,
			input.projectId,
			ctx,
		);
		return result ? { kind: 'result', resultId: result.id } : null;
	}

	private async claim(
		input: StartInvestigation,
		baseline: WorkflowSuggestionBaseline,
		configurationId: number,
	) {
		return await this.txRunner.run({}, async (ctx) => {
			const configuration = await this.configurations.findForUpdate(
				configurationId,
				input.projectId,
				ctx,
			);
			if (!configuration) return null;

			const actor = await this.configurationService.resolveActorOrPause(
				configuration,
				input.workflowId,
				ctx,
			);
			if (!actor || actor.id !== baseline.backgroundUserId) return null;

			await this.suggestions.readWorkflowTargetForApply(input.workflowId, ctx);
			const existing = await this.findExisting(input, ctx);
			if (existing) return existing;

			await this.suggestions.requireCurrentBaseline(baseline, ctx);
			if (await this.resultRepository.isInCooldown(this.cooldownQuery(input), ctx)) return null;

			return await this.investigations.createInvestigation(
				{
					baseline,
					configurationId,
					executionId: input.executionId,
					threadId: randomUUID(),
					runId: randomUUID(),
				},
				ctx,
			);
		});
	}

	private cooldownQuery({ workflowId, projectId }: StartInvestigation) {
		const completedAfter = new Date(Date.now() - SELF_HEALING_CANNOT_FIX_COOLDOWN_MS);
		return { workflowId, projectId, completedAfter };
	}

	private async run(
		investigation: SelfHealingInvestigation,
		baseline: WorkflowSuggestionBaseline,
		user: User,
	) {
		try {
			await this.runtime.startSelfHealingRun(
				{
					user,
					baseline,
					executionId: investigation.executionId,
				},
				{
					threadId: investigation.threadId,
					runId: investigation.runId,
					onComplete: async (run, signal) =>
						await this.handleRunCompletion(investigation, baseline, run, signal),
				},
			);
		} catch (error) {
			if (error instanceof ForbiddenError) {
				await this.configurationService.recheckAccess(
					investigation.configurationId,
					investigation.projectId,
					investigation.workflowId,
				);
			}

			await this.investigations.finishWithoutResult(investigation.id);
			throw error;
		}
	}

	private async handleRunCompletion(
		investigation: SelfHealingInvestigation,
		baseline: WorkflowSuggestionBaseline,
		run: SelfHealingRunResult,
		signal: AbortSignal,
	) {
		if (run.status !== 'completed' || run.finishReason !== 'stop' || !run.output) {
			if (run.error instanceof ForbiddenError) throw run.error;
			await this.investigations.finishWithoutResult(investigation.id);
			return;
		}

		const output = run.output;
		const result: SelfHealingResultInput = {
			output,
			usage: run.usage,
			completedAt: new Date().toISOString(),
		};

		if (output.candidateFilePath) {
			if (!run.candidate || run.candidate.filePath !== output.candidateFilePath) {
				throw new BadRequestError('The candidate file is unavailable.');
			}

			const candidate = await run.candidate.compile();
			if (!candidate.success) throw new BadRequestError(candidate.errors.join('\n'));

			const placeholderWarnings = candidate.warnings.filter(
				({ code }) => code === 'unresolved_placeholders',
			);
			if (
				output.outcome === 'fix_ready' &&
				(candidate.credentialResolution.mockedCredentialTypes.length > 0 ||
					placeholderWarnings.length > 0)
			) {
				const missingSetup = [
					...Object.entries(candidate.credentialResolution.mockedCredentialsByNode).map(
						([node, types]) => `- Connect credentials for ${node}: ${types.join(', ')}`,
					),
					...placeholderWarnings.map(({ message }) => `- ${message}`),
				];
				result.output = {
					...output,
					outcome: 'needs_you',
					summary: 'Complete the missing setup to use this repair',
					report:
						'**What happened**\n\n' +
						`The proposed repair still needs setup:\n\n${missingSetup.join('\n')}\n\n` +
						'**What changed**\n\n' +
						'The proposed repair has not been applied. ' +
						'Simulated verification does not confirm that this setup works. ' +
						'Continue in chat to complete the setup and verify the repair.',
				};
			}

			result.candidate = {
				graph: { nodes: candidate.workflow.nodes, connections: candidate.workflow.connections },
			};
		}

		const outputFields = selfHealingOutputSchema.innerType().shape;
		result.output = {
			...result.output,
			summary: outputFields.summary.parse(scrubSecretsInText(result.output.summary)),
			report: scrubSecretsInText(result.output.report).slice(
				0,
				outputFields.report.maxLength ?? undefined,
			),
		};

		await this.suggestions.requireCurrentBaseline(baseline);
		signal.throwIfAborted();
		await this.results.complete({ investigationId: investigation.id, baseline, ...result, signal });
	}

	async reconcile(signal?: AbortSignal) {
		for (const investigation of await this.investigations.listUnfinished()) {
			if (signal?.aborted) return;
			try {
				await this.reconcileInvestigation(investigation);
			} catch (error) {
				this.logger.warn('Could not reconcile a self-healing investigation.', {
					investigationId: investigation.id,
					error,
				});
			}
		}
	}

	private async reconcileInvestigation(investigation: SelfHealingInvestigation) {
		const { threadId, runId } = investigation;
		if (this.runtime.isRunLive(threadId, runId)) return;
		// Allow another main to finish admission before its first run event is saved.
		if (Date.now() - investigation.createdAt.getTime() < InterruptedRunSweeper.LIVENESS_GRACE_MS) {
			return;
		}
		if (!(await this.events.lastFactAt(threadId, runId))) {
			await this.investigations.finishWithoutResult(investigation.id);
			return;
		}
		await this.sweeper.sweepRun(threadId, runId);
		await this.eventLog.flush(threadId);
		if (await this.events.getRunFinish(threadId, runId)) {
			await this.investigations.finishWithoutResult(investigation.id);
		}
	}

	private async requireProject(workflowId: string, projectId: string) {
		const owner = await this.ownership.getWorkflowOwningProject(workflowId);
		if (owner?.id !== projectId) throw new NotFoundError('Workflow not found in this project.');
	}
}
