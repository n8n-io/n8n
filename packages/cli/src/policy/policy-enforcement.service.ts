import type {
	ContentImportContext,
	CredentialDecryptContext,
	EnforcementPoint,
	PolicedWorkflow,
	PolicyDecision,
	WorkflowPublishContext,
	WorkflowSaveContext,
	WorkflowStartContext,
	WorkflowTransferContext,
} from '@n8n/decorators';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import { mintPolicyCleared, type PolicyCleared, type PolicySubject } from './policy-cleared';
import type { PolicyContext, PolicyEnforcementBackend } from './policy-enforcement-backend';
import { hasViolations, PolicyViolationError } from './policy-violation.error';

/** Fresh each time — `violations` is mutable. */
const emptyDecision = (): PolicyDecision => ({ violations: [] });

/** A workflow being created has no id yet, so it binds to its nodes instead. */
function workflowSubject(workflow: PolicedWorkflow): PolicySubject {
	if (workflow.id !== null) return { type: 'workflow', id: workflow.id };

	// Same object within one request, so key order is stable.
	const nodes = createHash('sha256').update(JSON.stringify(workflow.nodes)).digest('hex');

	return { type: 'workflow', id: nodes };
}

/**
 * The policy enforcement point every host call site talks to.
 *
 * With nothing registered, `enforce*` clears and `evaluate*` returns an empty decision — the
 * feature is *absent*, not failing closed, so a host can call this unconditionally.
 *
 * `enforce*` is the gate: it throws `PolicyViolationError` with every violation, or returns a
 * `PolicyCleared`. `evaluate*` is the advisory: same checks, returns the decision, never mints.
 */
@Service()
export class PolicyEnforcementService {
	private implementation?: PolicyEnforcementBackend;

	/** Single-shot: a second implementation would be silently ignored. */
	setImplementation(implementation: PolicyEnforcementBackend) {
		if (this.implementation) {
			throw new UnexpectedError('A policy enforcement implementation is already registered');
		}

		this.implementation = implementation;
	}

	/**
	 * Whether any check would run at `point`. Only for skipping expensive work needed to build
	 * a context — `enforce*` already clears, so a host holding its context should just call it.
	 */
	hasChecksFor(point: EnforcementPoint): boolean {
		return this.implementation?.hasChecksFor(point) ?? false;
	}

	async enforceWorkflowSave(context: WorkflowSaveContext): Promise<PolicyCleared<'workflowSave'>> {
		return await this.enforce('workflowSave', context, workflowSubject(context.workflow));
	}

	async evaluateWorkflowSave(context: WorkflowSaveContext): Promise<PolicyDecision> {
		return await this.evaluate('workflowSave', context);
	}

	async enforceWorkflowPublish(
		context: WorkflowPublishContext,
	): Promise<PolicyCleared<'workflowPublish'>> {
		return await this.enforce('workflowPublish', context, workflowSubject(context.workflow));
	}

	async evaluateWorkflowPublish(context: WorkflowPublishContext): Promise<PolicyDecision> {
		return await this.evaluate('workflowPublish', context);
	}

	async enforceWorkflowStart(
		context: WorkflowStartContext,
	): Promise<PolicyCleared<'workflowStart'>> {
		return await this.enforce('workflowStart', context, workflowSubject(context.workflow));
	}

	async evaluateWorkflowStart(context: WorkflowStartContext): Promise<PolicyDecision> {
		return await this.evaluate('workflowStart', context);
	}

	async enforceWorkflowTransfer(
		context: WorkflowTransferContext,
	): Promise<PolicyCleared<'workflowTransfer'>> {
		return await this.enforce('workflowTransfer', context, workflowSubject(context.workflow));
	}

	async evaluateWorkflowTransfer(context: WorkflowTransferContext): Promise<PolicyDecision> {
		return await this.evaluate('workflowTransfer', context);
	}

	async enforceCredentialDecrypt(
		context: CredentialDecryptContext,
	): Promise<PolicyCleared<'credentialDecrypt'>> {
		return await this.enforce('credentialDecrypt', context, {
			type: 'credential',
			id: context.credentialId,
		});
	}

	async evaluateCredentialDecrypt(context: CredentialDecryptContext): Promise<PolicyDecision> {
		return await this.evaluate('credentialDecrypt', context);
	}

	async enforceContentImport(
		context: ContentImportContext,
	): Promise<PolicyCleared<'contentImport'>> {
		return await this.enforce('contentImport', context, workflowSubject(context.workflow));
	}

	async evaluateContentImport(context: ContentImportContext): Promise<PolicyDecision> {
		return await this.evaluate('contentImport', context);
	}

	private async enforce<Point extends EnforcementPoint>(
		point: Point,
		context: PolicyContext<Point>,
		subject: PolicySubject,
	): Promise<PolicyCleared<Point>> {
		const decision = this.implementation
			? await this.implementation.enforce(point, context)
			: emptyDecision();

		if (hasViolations(decision.violations)) {
			throw new PolicyViolationError(decision.violations);
		}

		return mintPolicyCleared({ point, subject, decision });
	}

	private async evaluate<Point extends EnforcementPoint>(
		point: Point,
		context: PolicyContext<Point>,
	): Promise<PolicyDecision> {
		if (!this.implementation) return emptyDecision();

		return await this.implementation.evaluate(point, context);
	}
}
