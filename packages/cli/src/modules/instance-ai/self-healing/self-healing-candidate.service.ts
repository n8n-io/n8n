import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import {
	buildNodePreviews,
	checkToolSimulationSupport,
	collectResolvedParameterWarnings,
	planVerificationSimulation,
	prepareVerificationRun,
	runWorkflowVerification,
	type WorkflowBuildOutcome,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { STICKY_NODE_TYPE, UnexpectedError } from 'n8n-workflow';

import { WorkflowSuggestionService } from '../workflow-suggestions/workflow-suggestion.service';
import { toWorkflowJSON } from '../workflow-json';
import { compileCandidateWorkflow, type CandidateWorkflowResult } from './candidate-workflow';
import type { SelfHealingVerifier } from './self-healing-agent.service';
import { SelfHealingExecutionReferenceService } from './self-healing-execution-reference.service';
import { SelfHealingTemporaryWorkflowService } from './self-healing-temporary-workflow.service';

type CandidateInput = Parameters<SelfHealingVerifier>[0];
type CompiledCandidate = Extract<CandidateWorkflowResult, { success: true }>;

@Service()
export class SelfHealingCandidateService {
	constructor(
		private readonly suggestions: WorkflowSuggestionService,
		private readonly executions: SelfHealingExecutionReferenceService,
		private readonly temporaryWorkflows: SelfHealingTemporaryWorkflowService,
		private readonly logger: Logger,
	) {}

	async verify(input: CandidateInput) {
		const { baseline, context, filePath, abortSignal } = input;
		abortSignal.throwIfAborted();
		if (input.user.id !== baseline.backgroundUserId) {
			throw new ForbiddenError('The self-healing actor must match the workflow baseline.');
		}
		const user = await this.suggestions.requireCurrentBaseline(baseline);
		const execution = await this.executions.getReference(
			user,
			baseline.workflowId,
			input.executionId,
		);
		if (execution.status !== 'available') {
			throw new ForbiddenError('The failed execution is unavailable for this workflow.');
		}
		const candidate = await compileCandidateWorkflow({
			baseline,
			context,
			filePath,
			shareParameters: context.allowSendingParameterValues !== false,
			abortSignal,
		});
		if (!candidate.success) {
			return { filePath, validation: candidate, verification: { status: 'not_run' } };
		}
		const validated = {
			filePath,
			candidateChecksum: candidate.candidateChecksum,
			validation: { success: true, warnings: candidate.warnings },
		};
		if (input.validationOnly) return { ...validated, verification: { status: 'not_run' } };

		try {
			const verification = await this.verifyExecution({ ...input, user }, candidate);
			return { ...validated, verification };
		} catch (error) {
			return {
				...validated,
				verification: {
					status: abortSignal.aborted ? 'cancelled' : 'error',
					success: false,
					error: getErrorMessage(error),
				},
			};
		}
	}

	private async verifyExecution(input: CandidateInput, candidate: CompiledCandidate) {
		const { baseline, context, abortSignal, user } = input;
		const { runId } = context;
		if (!runId) throw new UnexpectedError('The investigation context is missing.');

		const workflow = toWorkflowJSON({ ...candidate.workflow, id: baseline.workflowId });
		const plan = await planVerificationSimulation({
			workflow,
			workflowId: baseline.workflowId,
			declaredOutputFixtures: candidate.declaredOutputFixtures,
			outputSchemaLookup: context.outputSchemaLookup,
			fallbackModelConfig: context.modelId,
			logger: this.logger,
		});
		abortSignal.throwIfAborted();
		if (!plan.nodeSimulationPlan) {
			return {
				status: 'not_run',
				error: 'The verification simulation plan is unavailable.',
			};
		}
		const buildOutcome: WorkflowBuildOutcome = {
			...plan,
			workItemId: candidate.candidateChecksum,
			taskId: candidate.candidateChecksum,
			submitted: false,
			triggerType: 'manual_or_testable',
			needsUserInput: false,
			summary: 'Verify the self-healing candidate.',
		};
		const preparation = prepareVerificationRun(buildOutcome, {});
		if (preparation.kind === 'blocked') {
			return { ...preparation.result, status: 'not_run' };
		}
		const blocker = checkToolSimulationSupport({
			workflow,
			workflowPinnedNodeNames: Object.keys(candidate.workflow.pinData ?? {}),
			plan: plan.nodeSimulationPlan,
			prepared: preparation.prepared,
		});
		if (blocker) {
			return { ...blocker, status: 'not_run' };
		}

		// Planning can take time. Recheck access and the baseline before creating a snapshot.
		await this.suggestions.requireCurrentBaseline(baseline);
		abortSignal.throwIfAborted();
		return await this.temporaryWorkflows.withTemporaryWorkflow(
			{ user, baseline, graph: candidate.workflow },
			async (workflowId) => {
				const verification = await runWorkflowVerification({
					executionService: context.executionService,
					workflowId,
					buildOutcome,
					prepared: preparation.prepared,
					stateBefore: undefined,
					runId,
					abortSignal,
				});
				return await this.summarizeVerification(input, candidate, verification);
			},
		);
	}

	private async summarizeVerification(
		{ context, abortSignal }: CandidateInput,
		candidate: CompiledCandidate,
		{ result, analysis, parameterCheckRuns }: Awaited<ReturnType<typeof runWorkflowVerification>>,
	) {
		const parameterChecks = await collectResolvedParameterWarnings({
			executionService: context.executionService,
			runs: parameterCheckRuns,
			logger: this.logger,
		});
		// The simulation plan omits triggers and disconnected nodes. Report their coverage too.
		const nodesNotReached = candidate.workflow.nodes
			.filter((node) => !node.disabled && node.type !== STICKY_NODE_TYPE)
			.filter((node) => !analysis.reachedNames.has(node.name))
			.map((node) => node.name);
		return {
			status: abortSignal.aborted ? 'cancelled' : result.status,
			success: !abortSignal.aborted && analysis.success,
			nodesExecuted: analysis.nodesExecuted,
			nodesNotReached,
			simulatedNodes: analysis.reachedSimulatedNodes,
			simulationNote: analysis.simulationNote,
			coverageNote: nodesNotReached.length
				? [analysis.coverageNote, `These nodes remain unverified: ${nodesNotReached.join(', ')}.`]
						.filter(Boolean)
						.join(' ')
				: analysis.coverageNote,
			nodeErrors: analysis.nodeErrors,
			error: analysis.errorMessage,
			parameterChecks,
			nodePreviews: buildNodePreviews(
				result.data,
				600,
				new Set(analysis.reachedSimulatedNodes.map(({ nodeName }) => nodeName)),
			),
		};
	}
}
