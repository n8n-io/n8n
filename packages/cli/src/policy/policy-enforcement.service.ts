import type {
	ContentImportContext,
	CredentialDecryptContext,
	CredentialSaveContext,
	EnforcementPoint,
	PolicyDecision,
	WorkflowPublishContext,
	WorkflowSaveContext,
	WorkflowStartContext,
	WorkflowTransferContext,
	PolicyCleared,
	PolicySubject,
} from '@n8n/decorators';
import {
	credentialContentSubject,
	credentialSubject,
	workflowContentSubject,
	workflowSubject,
} from '@n8n/decorators';
import { mintPolicyCleared } from '@n8n/decorators/policy-internal';
import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import type {
	PolicyActor,
	PolicyContext,
	PolicyEnforcementBackend,
} from './policy-enforcement-backend';
import { hasViolations, PolicyViolationError } from './policy-violation.error';

/** Fresh each time — `violations` is mutable. */
const emptyDecision = (): PolicyDecision => ({ violations: [] });

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

	async enforceWorkflowSave(
		context: WorkflowSaveContext,
		actor: PolicyActor,
	): Promise<PolicyCleared<'workflowSave'>> {
		// A create has no committed id to bind to, so it binds to its content — even when a client
		// supplied an id, which is no proof of what was checked. An update binds to the row id.
		const subject =
			context.storedWorkflow === null
				? workflowContentSubject(context.workflow)
				: workflowSubject(context.workflow);
		return await this.enforce('workflowSave', context, actor, subject);
	}

	async evaluateWorkflowSave(context: WorkflowSaveContext): Promise<PolicyDecision> {
		return await this.evaluate('workflowSave', context);
	}

	async enforceWorkflowPublish(
		context: WorkflowPublishContext,
		actor: PolicyActor,
	): Promise<PolicyCleared<'workflowPublish'>> {
		return await this.enforce('workflowPublish', context, actor, workflowSubject(context.workflow));
	}

	async evaluateWorkflowPublish(context: WorkflowPublishContext): Promise<PolicyDecision> {
		return await this.evaluate('workflowPublish', context);
	}

	async enforceWorkflowStart(
		context: WorkflowStartContext,
		actor: PolicyActor,
	): Promise<PolicyCleared<'workflowStart'>> {
		return await this.enforce('workflowStart', context, actor, workflowSubject(context.workflow));
	}

	async evaluateWorkflowStart(context: WorkflowStartContext): Promise<PolicyDecision> {
		return await this.evaluate('workflowStart', context);
	}

	async enforceWorkflowTransfer(
		context: WorkflowTransferContext,
		actor: PolicyActor,
	): Promise<PolicyCleared<'workflowTransfer'>> {
		return await this.enforce(
			'workflowTransfer',
			context,
			actor,
			workflowSubject(context.workflow),
		);
	}

	async evaluateWorkflowTransfer(context: WorkflowTransferContext): Promise<PolicyDecision> {
		return await this.evaluate('workflowTransfer', context);
	}

	async enforceCredentialSave(
		context: CredentialSaveContext,
		actor: PolicyActor,
	): Promise<PolicyCleared<'credentialSave'>> {
		// Same rule as a workflow save: a create binds to its content, an update to the row id.
		const subject =
			context.storedCredential === null
				? credentialContentSubject(context.credential)
				: credentialSubject(context.credential);
		return await this.enforce('credentialSave', context, actor, subject);
	}

	async evaluateCredentialSave(context: CredentialSaveContext): Promise<PolicyDecision> {
		return await this.evaluate('credentialSave', context);
	}

	async enforceCredentialDecrypt(
		context: CredentialDecryptContext,
		actor: PolicyActor,
	): Promise<PolicyCleared<'credentialDecrypt'>> {
		return await this.enforce('credentialDecrypt', context, actor, {
			type: 'credential',
			id: context.credentialId,
		});
	}

	async evaluateCredentialDecrypt(context: CredentialDecryptContext): Promise<PolicyDecision> {
		return await this.evaluate('credentialDecrypt', context);
	}

	async enforceContentImport(
		context: ContentImportContext,
		actor: PolicyActor,
	): Promise<PolicyCleared<'contentImport'>> {
		return await this.enforce('contentImport', context, actor, workflowSubject(context.workflow));
	}

	async evaluateContentImport(context: ContentImportContext): Promise<PolicyDecision> {
		return await this.evaluate('contentImport', context);
	}

	private async enforce<Point extends EnforcementPoint>(
		point: Point,
		context: PolicyContext<Point>,
		actor: PolicyActor,
		subject: PolicySubject,
	): Promise<PolicyCleared<Point>> {
		const decision = this.implementation
			? await this.implementation.enforce(point, context, actor)
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
