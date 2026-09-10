import { UnexpectedError } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import { brand } from './policy-brand';
import type {
	EnforcementPoint,
	PolicedWorkflow,
	PolicyDecision,
	PolicyVersionRef,
} from './policy-check';

/**
 * What kind of thing was policed. Closed, so a typo is a compile error rather than a binding
 * that silently never matches. Open to widening: `contentImport` in particular is generic over
 * artifact kind, and adding a kind here touches no signature.
 */
export type PolicySubjectType = 'workflow' | 'credential';

/** What a decision was about. */
export type PolicySubject = {
	readonly type: PolicySubjectType;

	/** A committed row's id, or a content hash when it has none yet — a workflow being created. */
	readonly id: string;
};

/**
 * A workflow being created binds to its content, not an id.
 *
 * A create has no committed identity — the row's id is generated on insert, and a
 * client-supplied id is no proof of anything checked. Binding to the node hash makes the
 * clearance cover the content policy actually saw, so nothing may mutate `nodes` between the
 * check and the write.
 */
export function workflowContentSubject(workflow: Pick<PolicedWorkflow, 'nodes'>): PolicySubject {
	// Same object within one request, so key order is stable.
	const hash = createHash('sha256').update(JSON.stringify(workflow.nodes)).digest('hex');

	return { type: 'workflow', id: hash };
}

/**
 * An existing workflow binds to its id; one with none yet binds to its content.
 *
 * Truthiness, not `!== null`: a create's id is absent as `undefined`, and treating that as
 * present would bind every create to the same `undefined` subject — a token for one create
 * would then clear any other.
 */
export function workflowSubject(workflow: Pick<PolicedWorkflow, 'id' | 'nodes'>): PolicySubject {
	if (workflow.id) return { type: 'workflow', id: workflow.id };

	return workflowContentSubject(workflow);
}

/**
 * Proof that policy enforcement cleared one specific action, returned by every `enforce*`
 * method. `evaluate*` never returns one: an advisory answer must not unlock anything.
 *
 * Only `mintPolicyCleared` (in `./policy-mint`, off the public barrel) can produce one, so
 * receiving one is evidence the checks ran and passed, and it records what was cleared so a
 * value made for another point or workflow can't stand in.
 */
export type PolicyCleared<Point extends EnforcementPoint> = {
	readonly [brand]: 'Use the policy enforcement service — a cleared action cannot be forged';

	readonly point: Point;

	readonly subject: PolicySubject;

	/** Cleared, so `violations` is empty. Carries whatever else the envelope grows. */
	readonly decision: PolicyDecision;

	/** `decision.policyVersions`, always present. */
	readonly policyVersions: readonly PolicyVersionRef[];
};

/**
 * Verifies a clearance is present, was minted for this exact point, and binds to this subject.
 * Called at the persistence boundary before a policed write.
 *
 * @throws UnexpectedError if the clearance is missing, unbranded (never minted), or bound to a
 * different point or subject — each means a call site failed to thread the right token.
 */
export function assertClearedFor(
	cleared: PolicyCleared<EnforcementPoint> | undefined,
	point: EnforcementPoint,
	subject: PolicySubject,
): void {
	if (!cleared) throw new UnexpectedError(`No policy clearance for ${point}`);
	if (cleared[brand] === undefined || cleared.point !== point)
		throw new UnexpectedError(`Clearance is not valid for ${point}`);
	if (cleared.subject.type !== subject.type || cleared.subject.id !== subject.id)
		throw new UnexpectedError(
			`Clearance is for ${cleared.subject.type} ${cleared.subject.id}, not ${subject.type} ${subject.id}`,
		);
}
