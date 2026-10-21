import type { TypeAvailabilityPolicyScope } from './database/entities/type-availability-policy-scope.entity';
import { orderedAttachments } from './policy-evaluator';
import type { PolicyAction, PolicyAttachment, PolicyRule } from './policy-rule.types';

/**
 * A scope that has never been written has no row. That "unconfigured" state behaves as
 * allow-all, and reports version `0` — so a first write sends `expectedVersion: 0`. There is
 * no row to lock at that point, so `createScopeOrConflict` decides which of two racing first
 * writes wins.
 */
export const UNCONFIGURED_VERSION = 0;

/**
 * A scope's composed effective policy: its own `defaultAction` plus every attached policy's
 * rules, flattened into the order the evaluator would apply them. `scopeId: null` means the
 * scope has never been written (allow-all, version `0`) — the caller decides whether to
 * still lazily create it, so this method never writes.
 */
export type EffectivePolicy = {
	readonly scopeId: string | null;
	readonly kind: string;
	readonly projectId: string | null;
	readonly defaultAction: PolicyAction;
	readonly version: number;
	readonly rules: readonly PolicyRule[];
	readonly attachments: readonly PolicyAttachment[];
};

export type ProjectEffectivePolicy = EffectivePolicy & { readonly projectId: string };

/** The allow-all state of a scope with no row. */
export function unconfiguredScope(kind: string, projectId: string | null): EffectivePolicy {
	return {
		scopeId: null,
		kind,
		projectId,
		defaultAction: 'allow',
		version: UNCONFIGURED_VERSION,
		rules: [],
		attachments: [],
	};
}

function flattenRules(attachments: readonly PolicyAttachment[]): PolicyRule[] {
	return orderedAttachments(attachments).flatMap((attachment) => [...attachment.rules]);
}

export function toEffectivePolicy(
	scope: TypeAvailabilityPolicyScope,
	attachments: readonly PolicyAttachment[],
): EffectivePolicy {
	return {
		scopeId: scope.id,
		kind: scope.kind,
		projectId: scope.projectId,
		defaultAction: scope.defaultAction,
		version: scope.version,
		rules: flattenRules(attachments),
		attachments,
	};
}
