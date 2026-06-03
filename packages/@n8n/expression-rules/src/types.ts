/**
 * A single access-control rule. The expression is evaluated with n8n expression
 * syntax (e.g. `{{ $claims.groups.includes("admin") }}`) against an
 * {@link EvaluationContext}. A rule "matches" when its expression resolves to a
 * truthy boolean.
 */
export interface ClaimRule {
	effect: 'allow' | 'deny';
	expression: string;
}

/**
 * The variables exposed to rule expressions. `$claims` holds the validated
 * token claims; additional keys (e.g. `$oidc`) may be added by the caller.
 */
export interface EvaluationContext {
	$claims: Record<string, unknown>;
	[key: string]: unknown;
}

export interface EvaluationResult {
	/** True only when an allow rule matched and no deny rule matched. */
	allowed: boolean;
	/** The deny rule that caused a denial, if any (deny-wins). */
	matchedDeny?: ClaimRule;
	/** The allow rule that granted access, if any. */
	matchedAllow?: ClaimRule;
}
