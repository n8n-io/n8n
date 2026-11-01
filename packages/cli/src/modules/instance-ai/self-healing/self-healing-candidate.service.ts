import type { WorkflowSuggestionBaseline } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { InstanceWriteAccessService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';
import {
	buildNodePreviews,
	checkToolSimulationSupport,
	collectResolvedParameterWarnings,
	planVerificationSimulation,
	prepareVerificationRun,
	runWorkflowVerification,
	type InstanceAiContext,
	type SelfHealingCandidateInput,
	type WorkflowBuildOutcome,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import isEqual from 'lodash/isEqual';
import { calculateWorkflowChecksum, STICKY_NODE_TYPE, UnexpectedError } from 'n8n-workflow';

import { License } from '@/license';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import { WorkflowSuggestionService } from '../workflow-suggestions/workflow-suggestion.service';
import { toWorkflowJSON } from '../workflow-json';
import { compileCandidateWorkflow, type CandidateWorkflowResult } from './candidate-workflow';
import { SelfHealingTemporaryWorkflowService } from './self-healing-temporary-workflow.service';

type CandidateInput = SelfHealingCandidateInput & {
	user: User;
	baseline: WorkflowSuggestionBaseline;
	context: InstanceAiContext;
	abortSignal: AbortSignal;
};
type CompiledCandidate = Extract<CandidateWorkflowResult, { success: true }> & {
	candidateChecksum: string;
};

@Service()
export class SelfHealingCandidateService {
	constructor(
		private readonly suggestions: WorkflowSuggestionService,
		private readonly temporaryWorkflows: SelfHealingTemporaryWorkflowService,
		private readonly logger: Logger,
		private readonly enterpriseWorkflows: EnterpriseWorkflowService,
		private readonly license: License,
		private readonly writeAccess: InstanceWriteAccessService,
	) {}

	async compile(
		input: Pick<CandidateInput, 'baseline' | 'context' | 'filePath' | 'abortSignal'>,
		user: User,
	): Promise<CandidateWorkflowResult> {
		const compiled = await compileCandidateWorkflow(input);
		if (!compiled.success) return compiled;

		// Reject restored edits so verification and the suggestion use the same graph.
		// oxlint-disable-next-line typescript/no-deprecated
		if (this.license.isSharingEnabled()) {
			const nodes = structuredClone(compiled.workflow.nodes);
			compiled.workflow = await this.enterpriseWorkflows.preventTampering(
				compiled.workflow,
				input.baseline.workflowId,
				user,
			);
			const restoredNodes = nodes
				.filter((node, index) => !isEqual(node, compiled.workflow.nodes[index]))
				.map(({ name }) => name);
			if (restoredNodes.length > 0) {
				return {
					success: false,
					reason: 'candidate_credential_access',
					errors: [
						`Credential access prevents changes to these nodes: ${restoredNodes.join(', ')}. ` +
							'Leave their protected settings unchanged, or return needs_you without a candidate ' +
							'and explain which credential access is needed.',
					],
				};
			}
		}

		return compiled;
	}

	async verify(input: CandidateInput) {
		const { baseline, filePath, abortSignal } = input;
		abortSignal.throwIfAborted();

		if (input.user.id !== baseline.backgroundUserId) {
			throw new ForbiddenError('The self-healing actor must match the workflow baseline.');
		}

		const user = await this.suggestions.requireEditor(
			baseline.backgroundUserId,
			baseline.workflowId,
		);

		const compiled = await this.compile(input, user);
		if (!compiled.success) {
			return { filePath, validation: compiled, verification: { status: 'not_run' } };
		}

		const candidate = {
			...compiled,
			candidateChecksum: await calculateWorkflowChecksum(compiled.workflow),
		};
		const validated = {
			filePath,
			candidateChecksum: candidate.candidateChecksum,
			validation: { success: true, warnings: candidate.warnings },
			credentialResolution: candidate.credentialResolution,
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
		if (this.writeAccess.isReadOnly()) {
			return {
				status: 'not_run',
				error:
					'Cannot verify execution on a protected instance. This instance is in read-only mode.',
			};
		}

		const { baseline, context, abortSignal, user } = input;
		const { runId } = context;
		if (!runId) throw new UnexpectedError('The investigation context is missing.');

		const workflow = toWorkflowJSON({ ...candidate.workflow, id: baseline.workflowId });
		const plan = await planVerificationSimulation({
			workflow,
			workflowId: baseline.workflowId,
			mockedNodeNames: candidate.credentialResolution.mockedNodeNames,
			declaredOutputFixtures: candidate.declaredOutputFixtures,
			outputSchemaLookup: context.outputSchemaLookup,
			fallbackModelConfig: context.modelId,
			modelFetch: context.modelFetch,
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
			mockedNodeNames: candidate.credentialResolution.mockedNodeNames,
			mockedCredentialTypes: candidate.credentialResolution.mockedCredentialTypes,
			needsUserInput: candidate.credentialResolution.mockedCredentialTypes.length > 0,
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

		abortSignal.throwIfAborted();

		const temporaryWorkflow = await this.temporaryWorkflows.create({
			user,
			baseline,
			graph: candidate.workflow,
		});
		try {
			const verification = await runWorkflowVerification({
				executionService: context.executionService,
				workflowId: temporaryWorkflow.id,
				triggerNodeName: input.triggerNodeName,
				inputData: input.inputData,
				buildOutcome,
				prepared: preparation.prepared,
				stateBefore: undefined,
				runId,
				abortSignal,
			});

			return await this.summarizeVerification(input, candidate, verification);
		} finally {
			await this.temporaryWorkflows.cleanup(temporaryWorkflow.id);
		}
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
