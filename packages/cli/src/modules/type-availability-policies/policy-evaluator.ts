import type {
	PolicyAction,
	PolicyAttachment,
	PolicySelector,
	PolicyVerdict,
} from './policy-rule.types';

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
