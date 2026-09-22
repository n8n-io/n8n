import { LicenseState } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import type {
	ContentImportContext,
	CredentialDecryptContext,
	CredentialSaveContext,
	PolicedWorkflow,
	PolicyCheckResult,
	PolicyViolation,
	RegisteredPolicyCheck,
	WorkflowPublishContext,
	WorkflowSaveContext,
	WorkflowStartContext,
	WorkflowTransferContext,
} from '@n8n/decorators';
import { PolicyCheck } from '@n8n/decorators';

import { CREDENTIAL_TYPES_KIND } from './constants';
import {
	TypeAvailabilityPolicyService,
	type ComposedTypeVerdict,
} from './type-availability-policy.service';

const NO_VIOLATIONS: PolicyCheckResult = { violations: [] };

/** Nothing to grandfather, for the points that report the full list. */
const NOTHING_GRANDFATHERED: ReadonlySet<string> = new Set();

/**
 * The credential types a workflow's nodes ask for, which are the keys of each node's
 * `credentials` map. A node that names a type without selecting a credential still counts:
 * the workflow is built around a type the policy refuses.
 */
function distinctCredentialTypes(nodes: PolicedWorkflow['nodes']): string[] {
	// A Set keeps first-encounter order, so violations and audit lines stay deterministic.
	const types = new Set<string>();

	for (const node of nodes) {
		for (const type of Object.keys(node.credentials ?? {})) types.add(type);
	}

	return [...types];
}

function toViolation(checkId: string, verdict: ComposedTypeVerdict): PolicyViolation {
	const by = verdict.scope === 'instance' ? 'an instance policy' : "this project's policy";

	return {
		kind: 'credential-type-unavailable',
		checkId,
		message: `Credential type "${verdict.name}" is blocked by ${by}`,
		subject: verdict.name,
		subjectType: 'credentialType',
		scope: verdict.scope,
		// The scope's default action decided when no rule matched, and there is no id to report.
		...(verdict.matchedRuleId !== null && { matchedRuleId: verdict.matchedRuleId }),
	};
}

/**
 * Enforces credential type availability policies, at every point that handles a workflow and
 * at both points that handle a credential.
 *
 * Stacks with `NodeTypePolicyCheck` rather than replacing it: that one refuses a credential
 * because the node asking is blocked, this one because the credential's own type is. Either
 * veto blocks, so a policy on the Slack node and a policy on `slackApi` are independent.
 *
 * Registered by `TypeAvailabilityPoliciesModule`, which the license flag gates, so an
 * unlicensed or opt-out instance has no check at all and everything is allowed.
 */
@PolicyCheck()
export class CredentialTypePolicyCheck implements RegisteredPolicyCheck {
	readonly id = 'credential-type-availability';

	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly licenseState: LicenseState,
	) {}

	/**
	 * Grandfathers the credential types the stored workflow already asked for, so a policy
	 * change never makes existing content uneditable. The diff is type-level, not
	 * credential-level: swapping one `slackApi` credential for another, or copying the node,
	 * adds no type and so adds nothing to police. Publish and start still report it.
	 */
	async onWorkflowSave({
		workflow,
		storedWorkflow,
		projectId,
	}: WorkflowSaveContext): Promise<PolicyCheckResult> {
		const grandfathered = storedWorkflow
			? new Set(distinctCredentialTypes(storedWorkflow.nodes))
			: NOTHING_GRANDFATHERED;

		return await this.checkWorkflow(workflow, projectId, grandfathered);
	}

	async onWorkflowPublish({
		workflow,
		projectId,
	}: WorkflowPublishContext): Promise<PolicyCheckResult> {
		return await this.checkWorkflow(workflow, projectId, NOTHING_GRANDFATHERED);
	}

	async onWorkflowStart({ workflow, projectId }: WorkflowStartContext): Promise<PolicyCheckResult> {
		return await this.checkWorkflow(workflow, projectId, NOTHING_GRANDFATHERED);
	}

	/** The target project's policy decides — grandfathering does not travel into a new scope. */
	async onWorkflowTransfer({
		workflow,
		targetProjectId,
	}: WorkflowTransferContext): Promise<PolicyCheckResult> {
		return await this.checkWorkflow(workflow, targetProjectId, NOTHING_GRANDFATHERED);
	}

	/**
	 * The context carries no stored workflow, and loading one here would read state the host
	 * never vetted, so an import is judged on its whole content. `transport` is not read: an
	 * unattended sync and a hand-run import are held to the same policy, and each host already
	 * picks its own fail posture.
	 */
	async onContentImport({ workflow, projectId }: ContentImportContext): Promise<PolicyCheckResult> {
		return await this.checkWorkflow(workflow, projectId, NOTHING_GRANDFATHERED);
	}

	/**
	 * Refuses creating a credential of a blocked type, and refuses switching an existing one
	 * onto a blocked type. An edit that keeps the stored type is grandfathered, so a type
	 * blocked after the fact stays openable and renameable — the lock belongs at decryption.
	 */
	async onCredentialSave({
		credential,
		storedCredential,
		projectId,
	}: CredentialSaveContext): Promise<PolicyCheckResult> {
		if (storedCredential?.type === credential.type) return NO_VIOLATIONS;

		return await this.checkTypes([credential.type], projectId);
	}

	/**
	 * Locks on the credential's own type, never on the node asking, which is what closes the
	 * gap a node policy alone leaves: a blocked `slackApi` is refused to the Slack node and to
	 * an HTTP Request node alike.
	 *
	 * A null `consumer` changes nothing here. An OAuth flow or a credential test has no node
	 * to police, but it does have a credential type, so it is judged like any other read.
	 */
	async onCredentialDecrypt({
		credentialType,
		projectId,
	}: CredentialDecryptContext): Promise<PolicyCheckResult> {
		return await this.checkTypes([credentialType], projectId);
	}

	private async checkWorkflow(
		workflow: PolicedWorkflow,
		projectId: string | null,
		grandfathered: ReadonlySet<string>,
	): Promise<PolicyCheckResult> {
		const types = distinctCredentialTypes(workflow.nodes).filter(
			(type) => !grandfathered.has(type),
		);

		return await this.checkTypes(types, projectId);
	}

	/**
	 * No `signal` is threaded: nothing below accepts one (TypeORM does not), and the deadline
	 * race in the decision service already turns an overrun into a check failure.
	 */
	private async checkTypes(types: string[], projectId: string | null): Promise<PolicyCheckResult> {
		// An expired license stops enforcing, matching the `@Licensed` routes that author the
		// policy: a customer who cannot edit the policy must not keep being blocked by it.
		if (!this.licenseState.isLicensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)) return NO_VIOLATIONS;

		if (types.length === 0) return NO_VIOLATIONS;

		const { verdicts, versions } = await this.service.evaluateComposedTypesFor(
			CREDENTIAL_TYPES_KIND,
			projectId,
			types,
		);

		return {
			violations: verdicts
				.filter((verdict) => verdict.action === 'deny')
				.map((verdict) => toViolation(this.id, verdict)),
			// Reported even when nothing is denied: the audit line records what a partial run read.
			policyVersions: versions,
		};
	}
}
