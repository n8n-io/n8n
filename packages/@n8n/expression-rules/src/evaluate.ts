import { Expression } from 'n8n-workflow';
import type { IDataObject } from 'n8n-workflow';

import type { ClaimRule, EvaluationContext, EvaluationResult } from './types';

/**
 * Build the evaluation context from a set of validated token claims. Claims are
 * exposed to rule expressions as `$claims`.
 */
export function buildClaimsContext(claims: Record<string, unknown>): EvaluationContext {
	return { $claims: claims };
}

/**
 * Evaluate a list of allow/deny rules against a context with **deny-wins**
 * semantics and **deny-by-default**:
 *
 *  - if any `deny` rule matches → denied (regardless of allow rules)
 *  - else if any `allow` rule matches → allowed
 *  - else (no allow matched, including an empty rule list) → denied
 *
 * Expressions that throw or do not resolve to `true` are treated as
 * non-matching (a safe default), so a broken rule never accidentally grants
 * access.
 */
export function evaluateRules(rules: ClaimRule[], context: EvaluationContext): EvaluationResult {
	const matchedDeny = rules.find(
		(rule) => rule.effect === 'deny' && matches(rule.expression, context),
	);
	if (matchedDeny) {
		return { allowed: false, matchedDeny };
	}

	const matchedAllow = rules.find(
		(rule) => rule.effect === 'allow' && matches(rule.expression, context),
	);
	if (matchedAllow) {
		return { allowed: true, matchedAllow };
	}

	return { allowed: false };
}

function matches(expression: string, context: EvaluationContext): boolean {
	// An empty or non-string expression (e.g. a blank rule row) never matches.
	if (typeof expression !== 'string' || expression.trim() === '') {
		return false;
	}

	// n8n marks a value as an expression with a leading "=" (e.g. "={{ ... }}").
	// resolveWithoutWorkflow expects the unprefixed "{{ ... }}" form, so strip it.
	const normalized = expression.startsWith('=') ? expression.slice(1) : expression;
	try {
		const result = Expression.resolveWithoutWorkflow(normalized, context as unknown as IDataObject);
		return String(result) === 'true';
	} catch {
		return false;
	}
}
