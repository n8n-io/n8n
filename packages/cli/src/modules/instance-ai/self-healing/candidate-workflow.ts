import type { WorkflowSuggestionBaseline, WorkflowSuggestionSnapshot } from '@n8n/api-types';
import { BadRequestError } from '@n8n/errors';
import {
	buildCredentialMap,
	compileWorkflowSource,
	computeChangedNodeNames,
	computeChatModelValidationIssues,
	downgradeUnchangedNodeBlockers,
	partitionWarnings,
	prepareWorkflowForSave,
	readWorkspaceFile,
	resolveCredentials,
	stripStaleCredentialsFromWorkflow,
	type CredentialResolutionResult,
	type InstanceAiContext,
	type ValidationWarning,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { hasPlaceholderDeep } from '@n8n/utils/placeholder';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import isEqual from 'lodash/isEqual';
import { INodeSchema } from 'n8n-workflow';

import { validateWorkflowStructure } from '@/workflow-helpers';

import { toWorkflowJSON } from '../workflow-json';

type CandidateWorkflowInput = {
	baseline: WorkflowSuggestionBaseline;
	context: InstanceAiContext;
	filePath: string;
	abortSignal?: AbortSignal;
};

export type CandidateWorkflowResult =
	| {
			success: true;
			workflow: WorkflowSuggestionSnapshot;
			warnings: ValidationWarning[];
			credentialResolution: CredentialResolutionResult;
			declaredOutputFixtures?: WorkflowJSON['pinData'];
	  }
	| { success: false; reason: string; errors: string[] };

/** Compile each call from the workspace. Verification never saves or publishes this workflow. */
export async function compileCandidateWorkflow({
	baseline,
	context,
	filePath,
	abortSignal,
}: CandidateWorkflowInput): Promise<CandidateWorkflowResult> {
	abortSignal?.throwIfAborted();

	if (context.allowSendingParameterValues === false) {
		return {
			success: false,
			reason: 'parameter_sharing_disabled',
			errors: ['Candidate verification requires parameter sharing to be enabled.'],
		};
	}

	if (!context.workspace) {
		return {
			success: false,
			reason: 'workspace_unavailable',
			errors: ['The workspace is unavailable.'],
		};
	}

	const source = await readWorkspaceFile(context.workspace, filePath, {
		logger: context.logger,
		abortSignal,
	});
	abortSignal?.throwIfAborted();

	if (source === null) {
		return {
			success: false,
			reason: 'candidate_not_found',
			errors: ['The candidate file was not found in this workspace.'],
		};
	}

	try {
		const compiled = await compileWorkflowSource(context, filePath, source, abortSignal);
		if (!compiled.success) return compiled;

		const original = toWorkflowJSON({ ...baseline.original, id: baseline.workflowId });
		const warnings = downgradeUnchangedNodeBlockers(compiled.warnings, compiled.workflow, original);
		const { blocking } = partitionWarnings(warnings);
		if (blocking.length > 0) {
			return {
				success: false,
				reason: 'candidate_invalid',
				errors: blocking.map(({ message }) => message),
			};
		}

		// Builder helpers must read the captured baseline, not a newer saved version.
		const preparationContext: InstanceAiContext = {
			...context,
			workflowService: {
				...context.workflowService,
				getAsWorkflowJSON: async () => structuredClone(original),
			},
		};

		const credentialResolution = await resolveCredentials(
			compiled.workflow,
			baseline.workflowId,
			preparationContext,
			await buildCredentialMap(context.credentialService),
		);
		await prepareWorkflowForSave(compiled.workflow, baseline.workflowId, preparationContext);
		const modelWarnings: ValidationWarning[] = [];
		for (const node of compiled.workflow.nodes) {
			if (!node.name || node.disabled) continue;
			const issues = await computeChatModelValidationIssues(context, node);
			for (const message of Object.values(issues).flat()) {
				modelWarnings.push({
					code: 'chat_model_validation',
					message: `${node.name}: ${message}`,
					nodeName: node.name,
					severity: 'error',
				});
			}
		}
		warnings.push(...downgradeUnchangedNodeBlockers(modelWarnings, compiled.workflow, original));
		const { blocking: modelErrors } = partitionWarnings(warnings);
		if (modelErrors.length > 0) {
			return {
				success: false,
				reason: 'chat_model_validation_failed',
				errors: modelErrors.map(({ message }) => message),
			};
		}
		await stripStaleCredentialsFromWorkflow(preparationContext, compiled.workflow);

		const changedNodes = new Set(computeChangedNodeNames(compiled.workflow, original));
		for (const node of compiled.workflow.nodes) {
			if (!node.name || node.disabled || !changedNodes.has(node.name)) continue;
			if (hasPlaceholderDeep(node.parameters)) {
				warnings.push({
					code: 'unresolved_placeholders',
					message: `Fill in the placeholder values in "${node.name}" before using this repair.`,
					nodeName: node.name,
					severity: 'informational',
				});
			}
		}

		const { toEngineConnections } = await import('@n8n/workflow-sdk');
		const connections = toEngineConnections(compiled.workflow.connections);
		if (!isEqual(connections, compiled.workflow.connections)) {
			throw new BadRequestError('The candidate contains unsupported connection types.');
		}

		const workflow: WorkflowSuggestionSnapshot = {
			...structuredClone(baseline.original),
			nodes: compiled.workflow.nodes.map((node) => INodeSchema.parse(node)),
			connections,
		};
		validateWorkflowStructure(workflow);

		return {
			success: true,
			workflow,
			warnings,
			credentialResolution,
			declaredOutputFixtures: compiled.declaredOutputFixtures,
		};
	} catch (error) {
		abortSignal?.throwIfAborted();

		return { success: false, reason: 'candidate_invalid', errors: [getErrorMessage(error)] };
	}
}
