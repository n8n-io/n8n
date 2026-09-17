import { LicenseState } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import type {
	ContentImportContext,
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

import { NODE_TYPES_KIND } from './constants';
import {
	TypeAvailabilityPolicyService,
	type ComposedTypeVerdict,
} from './type-availability-policy.service';

const NO_VIOLATIONS: PolicyCheckResult = { violations: [] };

/** Nothing to grandfather, for the points that report the full list. */
const NOTHING_GRANDFATHERED: ReadonlySet<string> = new Set();

function distinctTypes(nodes: PolicedWorkflow['nodes']): string[] {
	// A Set keeps first-encounter order, so violations and audit lines stay deterministic.
	return [...new Set(nodes.map((node) => node.type))];
}

function toViolation(checkId: string, verdict: ComposedTypeVerdict): PolicyViolation {
	const by = verdict.scope === 'instance' ? 'an instance policy' : "this project's policy";

	return {
		kind: 'node-type-unavailable',
		checkId,
		message: `Node type "${verdict.name}" is blocked by ${by}`,
		subject: verdict.name,
		subjectType: 'nodeType',
		scope: verdict.scope,
		// The scope's default action decided when no rule matched, and there is no id to report.
		...(verdict.matchedRuleId !== null && { matchedRuleId: verdict.matchedRuleId }),
	};
}

/**
 * Enforces node type availability policies at every point that handles a workflow.
 *
 * Registered by `TypeAvailabilityPoliciesModule`, which the license flag gates, so an
 * unlicensed or opt-out instance has no check at all and everything is allowed.
 */
@PolicyCheck()
export class NodeTypePolicyCheck implements RegisteredPolicyCheck {
	readonly id = 'node-type-availability';

	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly licenseState: LicenseState,
	) {}

	/**
	 * Grandfathers the types the stored workflow already had, so a policy change never makes
	 * existing content uneditable. The diff is type-level: a moved, renamed or duplicated node
	 * whose type is already stored adds nothing to police. Publish and start still report it.
	 */
	async onWorkflowSave({
		workflow,
		storedWorkflow,
		projectId,
	}: WorkflowSaveContext): Promise<PolicyCheckResult> {
		const grandfathered = storedWorkflow
			? new Set(distinctTypes(storedWorkflow.nodes))
			: NOTHING_GRANDFATHERED;

		return await this.check(workflow, projectId, grandfathered);
	}

	async onWorkflowPublish({
		workflow,
		projectId,
	}: WorkflowPublishContext): Promise<PolicyCheckResult> {
		return await this.check(workflow, projectId, NOTHING_GRANDFATHERED);
	}

	async onWorkflowStart({ workflow, projectId }: WorkflowStartContext): Promise<PolicyCheckResult> {
		return await this.check(workflow, projectId, NOTHING_GRANDFATHERED);
	}

	/** The target project's policy decides — grandfathering does not travel into a new scope. */
	async onWorkflowTransfer({
		workflow,
		targetProjectId,
	}: WorkflowTransferContext): Promise<PolicyCheckResult> {
		return await this.check(workflow, targetProjectId, NOTHING_GRANDFATHERED);
	}

	/**
	 * The context carries no stored workflow, and loading one here would read state the host
	 * never vetted, so an import is judged on its whole content. `transport` is not read: an
	 * unattended sync and a hand-run import are held to the same policy, and each host already
	 * picks its own fail posture.
	 */
	async onContentImport({ workflow, projectId }: ContentImportContext): Promise<PolicyCheckResult> {
		return await this.check(workflow, projectId, NOTHING_GRANDFATHERED);
	}

	/**
	 * No `signal` is threaded: nothing below accepts one (TypeORM does not), and the deadline
	 * race in the decision service already turns an overrun into a check failure.
	 */
	private async check(
		workflow: PolicedWorkflow,
		projectId: string | null,
		grandfathered: ReadonlySet<string>,
	): Promise<PolicyCheckResult> {
		// An expired license stops enforcing, matching the `@Licensed` routes that author the
		// policy: a customer who cannot edit the policy must not keep being blocked by it.
		if (!this.licenseState.isLicensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)) return NO_VIOLATIONS;

		const types = distinctTypes(workflow.nodes).filter((type) => !grandfathered.has(type));

		if (types.length === 0) return NO_VIOLATIONS;

		const { verdicts, versions } = await this.service.evaluateComposedTypesFor(
			NODE_TYPES_KIND,
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
