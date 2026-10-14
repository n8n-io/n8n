import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IWorkflowSettings } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import { WorkflowFinderService } from './workflow-finder.service';
import { WorkflowPublishedDataService } from './workflow-published-data.service';

import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks/subworkflow-policy-checker';
import { NodeTypes } from '@/node-types';

/**
 * Why a workflow cannot serve as another workflow's error handler. Callers turn
 * this into their own copy — the MCP tool teaches an agent how to self-correct,
 * the REST path states the problem — so the rules stay in one place while the
 * wording stays fit for each audience.
 */
export type ErrorWorkflowProblem =
	| { reason: 'not-found' }
	| { reason: 'not-published'; name: string }
	| { reason: 'no-error-trigger'; name: string; errorTriggerType: string }
	| { reason: 'caller-policy'; name: string };

/**
 * True when the setting holds an n8n expression.
 *
 * Nothing ever evaluates it. `executeErrorWorkflow` reads `settings.errorWorkflow`
 * and passes it to the error-workflow lookup verbatim, so a stored `=…` string is
 * used as a literal workflow id and can never match one — the handler silently
 * never runs. The editor's setting is a workflow picker and cannot produce this;
 * only a caller that writes settings directly (API, MCP) can. Such callers should
 * reject it rather than save a reference that is dead on arrival.
 */
export function isExpressionErrorWorkflowId(
	errorWorkflow: IWorkflowSettings['errorWorkflow'],
): boolean {
	return typeof errorWorkflow === 'string' && errorWorkflow.startsWith('=');
}

/**
 * The workflow id `settings.errorWorkflow` actually points at, or undefined when
 * the setting names no concrete workflow: cleared (`DEFAULT`), or an expression.
 *
 * An expression yields undefined because there is no id to validate, NOT because
 * it is a usable value — see {@link isExpressionErrorWorkflowId}.
 */
export function staticErrorWorkflowId(
	errorWorkflow: IWorkflowSettings['errorWorkflow'],
): string | undefined {
	if (
		typeof errorWorkflow !== 'string' ||
		errorWorkflow === '' ||
		errorWorkflow === 'DEFAULT' ||
		isExpressionErrorWorkflowId(errorWorkflow)
	) {
		return undefined;
	}
	return errorWorkflow;
}

/**
 * Validates a `settings.errorWorkflow` reference at write time.
 *
 * Runtime runs the named workflow with the failed run's context and checks only
 * the target's own caller policy, so nothing downstream establishes that the
 * person who wrote the setting may point at that workflow at all. Checking on
 * write also catches the three ways a link silently never fires: the target is
 * gone, unpublished, or has no Error Trigger.
 *
 * Callers must only run this when the reference actually changes, so a workflow
 * that already carries a stale link stays saveable.
 */
@Service()
export class ErrorWorkflowValidationService {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly nodeTypes: NodeTypes,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
		private readonly subworkflowPolicyChecker: SubworkflowPolicyChecker,
	) {}

	/** The problem with the reference, or undefined when it is usable. */
	async findProblem({
		errorWorkflowId,
		parentWorkflowId,
		user,
	}: {
		errorWorkflowId: string;
		parentWorkflowId: string;
		user: User;
	}): Promise<ErrorWorkflowProblem | undefined> {
		const { useWorkflowPublicationService } = this.globalConfig.workflows;
		const { errorTriggerType } = this.globalConfig.nodes;

		// Read access is required intentionally, mirroring the editor UI (the error
		// workflow picker only lists workflows the user can read). Resolving the
		// target without an access check would let callers probe arbitrary workflow
		// IDs and learn their name / published / trigger / policy state from the
		// problems below. Runtime not requiring read access is separate: it runs the
		// error workflow under the owner project's context, gated by caller policy,
		// which is about execution — not about who may configure the link.
		const errorWorkflow = await this.workflowFinderService.findWorkflowForUser(
			errorWorkflowId,
			user,
			['workflow:read'],
			// activeVersion is only the published source of truth when the publication
			// service is off; otherwise we read it from the service below.
			{ includeActiveVersion: !useWorkflowPublicationService },
		);

		if (!errorWorkflow) return { reason: 'not-found' };

		// Runtime runs the PUBLISHED version of the error workflow, not its draft, and
		// resolves it differently depending on the publication service flag — mirror
		// WorkflowExecutionService.loadErrorWorkflowData exactly so we neither reject a
		// workflow runtime would run nor accept a version runtime will not use.
		const publishedNodes = useWorkflowPublicationService
			? (await this.workflowPublishedDataService.getPublishedWorkflowData(errorWorkflowId))
					?.publishedVersion.nodes
			: errorWorkflow.activeVersionId && errorWorkflow.activeVersion
				? (errorWorkflow.activeVersion.nodes ?? [])
				: undefined;

		if (!publishedNodes) return { reason: 'not-published', name: errorWorkflow.name };

		const hasErrorTrigger = publishedNodes.some(
			(node) => node.type === errorTriggerType && node.disabled !== true,
		);

		if (!hasErrorTrigger) {
			return { reason: 'no-error-trigger', name: errorWorkflow.name, errorTriggerType };
		}

		// Runtime blocks the error workflow if this workflow may not call it as a
		// sub-workflow (see WorkflowExecutionService.executeErrorWorkflow). The
		// policy checker only reads the target's id + settings, so an empty-node
		// Workflow instance is sufficient.
		const errorWorkflowInstance = new Workflow({
			id: errorWorkflow.id,
			name: errorWorkflow.name,
			nodeTypes: this.nodeTypes,
			nodes: [],
			connections: {},
			active: false,
			settings: errorWorkflow.settings ?? {},
		});

		try {
			await this.subworkflowPolicyChecker.check(
				errorWorkflowInstance,
				parentWorkflowId,
				undefined,
				user.id,
			);
		} catch (error) {
			if (error instanceof SubworkflowPolicyDenialError) {
				return { reason: 'caller-policy', name: errorWorkflow.name };
			}
			throw error;
		}

		return undefined;
	}
}
