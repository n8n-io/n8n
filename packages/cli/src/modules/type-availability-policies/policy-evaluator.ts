import type { NodeTypeAvailabilityScope } from '@n8n/api-types';

import type {
	PolicyAction,
	PolicyAttachment,
	PolicySelector,
	PolicyVerdict,
} from './policy-rule.types';

/** One scope's inputs to evaluation: its attached policies' rules and its own default action. */
export type ScopePolicy = {
	readonly attachments: readonly PolicyAttachment[];
	readonly defaultAction: PolicyAction;
};

/**
 * What the instance ∩ project composition decided for one type, and which scope decided it.
 *
 * `matchedRuleId` carries the same "explicit rule vs. default action" distinction as
 * `PolicyVerdict`, from whichever scope's verdict is reported.
 *
 * `optInAvailable` marks a denial the project can lift on its own, because the instance
 * delegated the type. It says nothing about who denied: a project that denied a delegated
 * type itself can still opt back in, so the flag is about the delegation, not the scope.
 *
 * `scope` reuses the response type's scope union, so the verdict and what the API reports
 * cannot drift apart.
 */
export type ComposedVerdict = {
	readonly action: 'allow' | 'deny';
	readonly scope: NodeTypeAvailabilityScope;
	readonly matchedRuleId: string | null;
	readonly optInAvailable: boolean;
};

/**
 * Package selectors match the segment of the type name before the first dot (a full type
 * name is always `<packageName>.<nodeName>`), same convention used elsewhere in the
 * codebase to derive a package name from a node type.
 */
function selectorMatches(selector: PolicySelector, typeName: string): boolean {
	switch (selector.kind) {
		case 'name':
			return selector.value === typeName;
		case 'package':
			return typeName.split('.')[0] === selector.value;
	}
}

/**
 * Floor attachments first, normal attachments after; each partition ordered by `priority`
 * ascending. Same-priority collisions within one partition are a write-time invariant
 * (DB unique index) — this trusts that invariant rather than re-validating or tie-breaking it.
 *
 * Exported so callers that display or compose the effective rule set (not just evaluate one
 * type) use the same ordering as this evaluator, instead of a second implementation drifting.
 */
export function orderedAttachments(attachments: readonly PolicyAttachment[]): PolicyAttachment[] {
	const byPriority = (a: PolicyAttachment, b: PolicyAttachment) => a.priority - b.priority;

	const floor = attachments.filter((a) => a.isFloor).sort(byPriority);
	const normal = attachments.filter((a) => !a.isFloor).sort(byPriority);

	return [...floor, ...normal];
}

/**
 * Evaluates one scope's effective policy for one type: flattens every attached policy's
 * rules (floor-then-normal, priority ascending) into a single first-match sequence, falling
 * back to the scope's `defaultAction` when nothing matches.
 *
 * Pure and synchronous — callers own fetching attachments and the scope's `defaultAction`
 * from storage.
 */
export function evaluateType(
	attachments: readonly PolicyAttachment[],
	defaultAction: PolicyAction,
	typeName: string,
): PolicyVerdict {
	for (const attachment of orderedAttachments(attachments)) {
		for (const rule of attachment.rules) {
			if (selectorMatches(rule.selector, typeName)) {
				return { action: rule.action, matchedRuleId: rule.id };
			}
		}
	}

	return { action: defaultAction, matchedRuleId: null };
}

/**
 * Composes an instance scope's verdict with a project scope's, per the finalized RFC:
 * conjunction with monotonic restriction. A project can only restrict further, never re-allow
 * an instance `deny`. `delegate` is the sanctioned exception, satisfied only by an explicit
 * project `allow` rule (`matchedRuleId !== null`) — never by the project's bare `defaultAction`,
 * since that would let an unconfigured project silently satisfy a delegation it never actually
 * addressed.
 *
 * `scope` names the scope whose verdict decided. A denial under an instance `delegate` is the
 * project's when the project restricted the type itself (by rule or by a `deny` default), and
 * the instance's only when the project left the type at its bare `allow` default.
 *
 * A project-authored `delegate` is treated as `deny` here (fail-closed): validation rejects it
 * at write time, so this is defense in depth, not the primary guard.
 */
export function evaluateComposedType(
	instance: ScopePolicy,
	project: ScopePolicy,
	typeName: string,
): ComposedVerdict {
	const instanceVerdict = evaluateType(instance.attachments, instance.defaultAction, typeName);

	if (instanceVerdict.action === 'deny') {
		return {
			action: 'deny',
			scope: 'instance',
			matchedRuleId: instanceVerdict.matchedRuleId,
			optInAvailable: false,
		};
	}

	const projectVerdict = evaluateType(project.attachments, project.defaultAction, typeName);

	if (instanceVerdict.action === 'delegate') {
		if (projectVerdict.action === 'allow' && projectVerdict.matchedRuleId !== null) {
			return {
				action: 'allow',
				scope: 'project',
				matchedRuleId: projectVerdict.matchedRuleId,
				optInAvailable: false,
			};
		}
		// The project restricted the type itself, by rule or by a `deny` default: the denial
		// is the project's decision, not the unsatisfied delegation's.
		if (projectVerdict.action !== 'allow') {
			return {
				action: 'deny',
				scope: 'project',
				matchedRuleId: projectVerdict.matchedRuleId,
				optInAvailable: true,
			};
		}
		// A bare project `allow` default never satisfies a delegation, so the unsatisfied
		// instance `delegate` is what denies here.
		return {
			action: 'deny',
			scope: 'instance',
			matchedRuleId: instanceVerdict.matchedRuleId,
			optInAvailable: true,
		};
	}

	// instanceVerdict.action === 'allow': the project's own verdict decides.
	if (projectVerdict.action !== 'allow') {
		return {
			action: 'deny',
			scope: 'project',
			matchedRuleId: projectVerdict.matchedRuleId,
			optInAvailable: false,
		};
	}

	return {
		action: 'allow',
		scope: projectVerdict.matchedRuleId !== null ? 'project' : 'instance',
		matchedRuleId: projectVerdict.matchedRuleId ?? instanceVerdict.matchedRuleId,
		optInAvailable: false,
	};
}
