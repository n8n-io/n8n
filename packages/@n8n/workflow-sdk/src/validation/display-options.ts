/**
 * Centralized displayOptions Resolution
 *
 * This module provides displayOptions matching logic aligned with n8n core
 * (packages/workflow/src/node-helpers.ts). It supports:
 * - Simple value inclusion (legacy)
 * - _cnd operators (eq, not, gte, lte, gt, lt, between, includes, startsWith, endsWith, regex, exists)
 * - Root paths (/ prefix)
 * - @version meta-property
 * - @tool meta-property (via isToolNode context)
 * - Resource locator unwrapping (__rl)
 * - Expression handling (values starting with =)
 *
 * Note: @feature meta-property is not supported as it requires
 * nodeTypeDescription context which is not available in this SDK context.
 */

import get from 'lodash/get';
import isEqual from 'lodash/isEqual';

// =============================================================================
// Types
// =============================================================================

/**
 * Supported operators for _cnd conditions
 */
export type DisplayConditionOperator =
	| 'eq'
	| 'not'
	| 'gte'
	| 'lte'
	| 'gt'
	| 'lt'
	| 'between'
	| 'includes'
	| 'startsWith'
	| 'endsWith'
	| 'regex'
	| 'exists';

/**
 * A condition using the _cnd operator syntax
 */
export type DisplayCondition = {
	_cnd: Partial<Record<DisplayConditionOperator, unknown>>;
};

/**
 * Display options for conditional field visibility
 */
export type DisplayOptions = {
	show?: Record<string, unknown[]>;
	hide?: Record<string, unknown[]>;
};

/**
 * Context for evaluating displayOptions
 */
export type DisplayOptionsContext = {
	/** Current parameter values at this level */
	parameters: Record<string, unknown>;
	/** Node version for @version meta-property */
	nodeVersion?: number;
	/** Root parameter values for / prefix paths */
	rootParameters?: Record<string, unknown>;
	/** Default values for properties (used when property is not set in parameters) */
	defaults?: Record<string, unknown>;
	/** Whether this node is a tool (for @tool meta-property) */
	isToolNode?: boolean;
};

// =============================================================================
// Helper: isDisplayCondition
// =============================================================================

function isDisplayCondition(value: unknown): value is DisplayCondition {
	return (
		value !== null &&
		typeof value === 'object' &&
		'_cnd' in value &&
		Object.keys(value).length === 1
	);
}

/**
 * Check if a property path contains regex metacharacters (for OR matching).
 * Regex paths use | for alternation, e.g., '/guardrails.(jailbreak|nsfw|custom)'
 */
function isRegexPath(path: string): boolean {
	return path.includes('|') || path.includes('(');
}

/**
 * Get all dot-separated paths from an object recursively.
 * E.g., { guardrails: { jailbreak: { value: 1 } } } => ['guardrails', 'guardrails.jailbreak', 'guardrails.jailbreak.value']
 */
function getAllPaths(obj: unknown, prefix = ''): string[] {
	if (obj === null || obj === undefined || typeof obj !== 'object') {
		return prefix ? [prefix] : [];
	}
	const paths: string[] = [];
	if (prefix) paths.push(prefix);
	for (const key of Object.keys(obj as Record<string, unknown>)) {
		const newPrefix = prefix ? `${prefix}.${key}` : key;
		paths.push(...getAllPaths((obj as Record<string, unknown>)[key], newPrefix));
	}
	return paths;
}

/**
 * Find all property paths that match a regex pattern.
 * Returns the values at those paths.
 */
function getMatchingPathValues(context: DisplayOptionsContext, regexPath: string): unknown[][] {
	const rootParams = context.rootParameters ?? context.parameters;
	// Remove leading / for root paths
	const pattern = regexPath.startsWith('/') ? regexPath.slice(1) : regexPath;

	// Convert the path pattern to a regex (escape dots, keep | and () for alternation)
	// Pattern like 'guardrails.(jailbreak|nsfw)' becomes regex /^guardrails\.(jailbreak|nsfw)$/
	const regexPattern = '^' + pattern.replace(/\./g, '\\.').replace(/\\\.\(/g, '.(') + '$';
	const regex = new RegExp(regexPattern);

	const allPaths = getAllPaths(rootParams);
	const matchingValues: unknown[][] = [];

	for (const path of allPaths) {
		if (regex.test(path)) {
			const value = get(rootParams, path);
			if (value !== undefined) {
				matchingValues.push(Array.isArray(value) ? value : [value]);
			}
		}
	}

	return matchingValues;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Check if conditions are met against actual values.
 *
 * Aligned with n8n core checkConditions function.
 *
 * For simple values: returns true if ANY actual value is in the conditions list.
 * For _cnd operators: returns true if ALL actual values satisfy the condition.
 *
 * @param conditions - Array of allowed values or _cnd conditions
 * @param actualValues - Array of actual property values to check
 * @returns true if conditions are satisfied
 */
export function checkConditions(conditions: unknown[], actualValues: unknown[]): boolean {
	return conditions.some((condition) => {
		if (isDisplayCondition(condition)) {
			const [key, targetValue] = Object.entries(condition._cnd)[0];

			// Special case: empty array handling
			if (actualValues.length === 0) {
				if (key === 'not') return true; // Value is not present, so 'not' is true
				return false; // For all other keys, empty array means condition is not met
			}

			return actualValues.every((propertyValue) => {
				if (key === 'eq') {
					return isEqual(propertyValue, targetValue);
				}
				if (key === 'not') {
					return !isEqual(propertyValue, targetValue);
				}
				if (key === 'gte') {
					return (propertyValue as number) >= (targetValue as number);
				}
				if (key === 'lte') {
					return (propertyValue as number) <= (targetValue as number);
				}
				if (key === 'gt') {
					return (propertyValue as number) > (targetValue as number);
				}
				if (key === 'lt') {
					return (propertyValue as number) < (targetValue as number);
				}
				if (key === 'between') {
					const { from, to } = targetValue as { from: number; to: number };
					return (propertyValue as number) >= from && (propertyValue as number) <= to;
				}
				if (key === 'includes') {
					return (propertyValue as string).includes(targetValue as string);
				}
				if (key === 'startsWith') {
					return (propertyValue as string).startsWith(targetValue as string);
				}
				if (key === 'endsWith') {
					return (propertyValue as string).endsWith(targetValue as string);
				}
				if (key === 'regex') {
					return new RegExp(targetValue as string).test(propertyValue as string);
				}
				if (key === 'exists') {
					return propertyValue !== null && propertyValue !== undefined && propertyValue !== '';
				}
				return false;
			});
		}

		// Simple value inclusion check
		return actualValues.includes(condition);
	});
}

/**
 * Get property values from context for a given property name.
 *
 * Handles special cases:
 * - Root paths (/ prefix): Gets value from rootParameters
 * - @version: Returns node version
 * - Resource locator (__rl): Unwraps to the inner value
 * - Defaults: Uses default value when property is not set in parameters
 *
 * @param context - The display options context
 * @param propertyName - The property name to get (may include path or special prefix)
 * @returns Array of values (single values are wrapped in array)
 */
export function getPropertyValue(context: DisplayOptionsContext, propertyName: string): unknown[] {
	let value: unknown;

	if (propertyName.charAt(0) === '/') {
		// Get the value from root parameters
		const rootParams = context.rootParameters ?? context.parameters;
		value = get(rootParams, propertyName.slice(1));
		// Fall back to defaults for root paths as well
		if (value === undefined && context.defaults) {
			value = get(context.defaults, propertyName.slice(1));
		}
	} else if (propertyName === '@version') {
		value = context.nodeVersion ?? 0;
	} else if (propertyName === '@tool') {
		value = context.isToolNode ?? false;
	} else {
		// Get the value from current level parameters
		value = get(context.parameters, propertyName);
		// Fall back to default value if property is not set
		if (value === undefined && context.defaults) {
			value = get(context.defaults, propertyName);
		}
	}

	// Unwrap resource locator values
	if (value && typeof value === 'object' && '__rl' in value) {
		const rlValue = value as Record<string, unknown>;
		if (rlValue.__rl === true && 'value' in rlValue) {
			value = rlValue.value;
		}
	}

	// Return as array
	if (!Array.isArray(value)) {
		return [value];
	}
	return value;
}

/**
 * Get the raw (unwrapped) property value from context, used to inspect
 * resource locator objects before they are unwrapped by getPropertyValue.
 */
function getRawPropertyValue(context: DisplayOptionsContext, propertyName: string): unknown {
	if (propertyName.charAt(0) === '/') {
		const rootParams = context.rootParameters ?? context.parameters;
		return get(rootParams, propertyName.slice(1));
	}
	if (propertyName === '@version' || propertyName === '@tool') {
		return undefined;
	}
	return get(context.parameters, propertyName);
}

/**
 * Check if a value is an unselected resource locator (any mode with empty value).
 * An empty RL represents "not yet configured" — the user hasn't selected a value yet.
 */
function isUnselectedResourceLocator(value: unknown): boolean {
	if (!value || typeof value !== 'object' || !('__rl' in value)) return false;
	const rl = value as Record<string, unknown>;
	return rl.__rl === true && rl.value === '';
}

/**
 * Check if a field should be visible based on displayOptions and current context.
 *
 * Aligned with n8n core displayParameter function.
 *
 * Logic:
 * - If no displayOptions, return true
 * - All show conditions must match (AND)
 * - Any hide condition matching returns false
 * - Expression values (starting with =) cause show to return true (can't statically evaluate)
 * - Regex paths (containing | or ()) match if ANY matching path satisfies the condition
 *
 * @param context - The context with parameters and metadata
 * @param displayOptions - The show/hide conditions
 * @returns true if the field should be displayed
 */
export function matchesDisplayOptions(
	context: DisplayOptionsContext,
	displayOptions: DisplayOptions,
): boolean {
	const { show, hide } = displayOptions;

	if (show) {
		// All show conditions must match
		for (const propertyName of Object.keys(show)) {
			const conditions = show[propertyName];

			// Handle regex paths - check if ANY matching path satisfies the conditions
			if (isRegexPath(propertyName)) {
				const matchingPathValues = getMatchingPathValues(context, propertyName);

				// If no paths match the pattern, the condition fails
				if (matchingPathValues.length === 0) {
					return false;
				}

				// Check if ANY of the matching paths satisfies the conditions
				const anyMatch = matchingPathValues.some((values) => {
					if (values.some((v) => typeof v === 'string' && v.charAt(0) === '=')) {
						return true; // Expression - treat as matching
					}
					return checkConditions(conditions, values);
				});

				if (!anyMatch) {
					return false;
				}
				continue;
			}

			// Regular path handling
			const values = getPropertyValue(context, propertyName);

			// If any value is an expression, we can't evaluate it statically - show the field
			if (values.some((v) => typeof v === 'string' && v.charAt(0) === '=')) {
				return true;
			}

			if (!checkConditions(conditions, values)) {
				return false;
			}
		}
	}

	if (hide) {
		// Any matching hide condition hides the field
		for (const propertyName of Object.keys(hide)) {
			// Skip hide condition for unselected resource locators.
			// An empty RL value means "not yet configured" — the untilXSelected pattern
			// is a UI progressive-disclosure hint, not a validation constraint.
			if (isUnselectedResourceLocator(getRawPropertyValue(context, propertyName))) {
				continue;
			}

			const values = getPropertyValue(context, propertyName);

			// Don't apply hide if actualValues is empty (property doesn't exist)
			if (values.length !== 0 && checkConditions(hide[propertyName], values)) {
				return false;
			}
		}
	}

	return true;
}
