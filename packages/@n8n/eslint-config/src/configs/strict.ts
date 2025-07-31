/**
 * Strict ESLint configuration for n8n packages
 *
 * This configuration upgrades common warning rules to errors for packages
 * that are ready to enforce stricter code quality standards.
 *
 * Usage: Import and spread into package-level eslint.config.mjs files:
 * ```
 * import { strictRules } from '@n8n/eslint-config/strict';
 *
 * export default [
 *   ...nodeConfig,
 *   {
 *     rules: {
 *       ...strictRules,
 *       // package-specific overrides
 *     }
 *   }
 * ];
 * ```
 */

export const strictRules = {
	// ==========================================
	// JavaScript Core Rules - Safe Upgrades
	// ==========================================

	/**
	 * https://eslint.org/docs/rules/no-useless-escape
	 * Commonly set to 'warn' across packages - safe to upgrade
	 */
	'no-useless-escape': 'error',

	/**
	 * https://eslint.org/docs/rules/no-empty
	 * Empty blocks are usually mistakes - enforce consistently
	 */
	'no-empty': 'error',

	/**
	 * https://eslint.org/docs/rules/prefer-const
	 * Modern JavaScript best practice - safe to enforce
	 */
	'prefer-const': 'error',

	/**
	 * https://eslint.org/docs/rules/no-prototype-builtins
	 * Security and compatibility best practice
	 */
	'no-prototype-builtins': 'error',

	/**
	 * https://eslint.org/docs/rules/no-fallthrough
	 * Prevent accidental switch fallthrough
	 */
	'no-fallthrough': 'error',

	/**
	 * https://eslint.org/docs/rules/no-ex-assign
	 * Prevent reassigning caught exception parameters
	 */
	'no-ex-assign': 'error',

	/**
	 * https://eslint.org/docs/rules/no-case-declarations
	 * Prevent variable declarations in case statements
	 */
	'no-case-declarations': 'error',

	/**
	 * https://eslint.org/docs/rules/no-extra-boolean-cast
	 * Remove unnecessary boolean casts
	 */
	'no-extra-boolean-cast': 'error',

	/**
	 * https://eslint.org/docs/rules/no-async-promise-executor
	 * Prevent async promise executors (anti-pattern)
	 */
	'no-async-promise-executor': 'error',

	/**
	 * https://eslint.org/docs/rules/eqeqeq
	 * Enforce strict equality
	 */
	eqeqeq: 'error',

	/**
	 * https://eslint.org/docs/rules/prefer-spread
	 * Use spread syntax instead of .apply()
	 */
	'prefer-spread': 'error',

	// ==========================================
	// TypeScript Rules - Moderate Risk Upgrades
	// ==========================================

	/**
	 * https://typescript-eslint.io/rules/prefer-optional-chain
	 * Modern TypeScript best practice
	 */
	'@typescript-eslint/prefer-optional-chain': 'error',

	/**
	 * https://typescript-eslint.io/rules/prefer-nullish-coalescing
	 * Modern TypeScript best practice
	 */
	'@typescript-eslint/prefer-nullish-coalescing': 'error',

	/**
	 * https://typescript-eslint.io/rules/no-empty-object-type
	 * Prevent empty object types
	 */
	'@typescript-eslint/no-empty-object-type': 'error',

	/**
	 * https://typescript-eslint.io/rules/no-base-to-string
	 * Prevent problematic toString() calls
	 */
	'@typescript-eslint/no-base-to-string': 'error',

	/**
	 * https://typescript-eslint.io/rules/require-await
	 * Ensure async functions have await
	 */
	'@typescript-eslint/require-await': 'error',

	// ==========================================
	// Import Rules - Code Organization
	// ==========================================

	/**
	 * https://github.com/import-js/eslint-plugin-import/blob/master/docs/rules/no-default-export.md
	 * Enforce named exports for better refactoring
	 */
	'import-x/no-default-export': 'error',

	/**
	 * https://github.com/import-js/eslint-plugin-import/blob/master/docs/rules/order.md
	 * Enforce consistent import ordering
	 */
	'import-x/order': 'error',

	// ==========================================
	// n8n Specific Rules
	// ==========================================

	/**
	 * https://eslint.org/docs/rules/id-denylist
	 * Prevent problematic variable names
	 */
	'id-denylist': 'error',
} as const;

/**
 * Extended strict rules for packages ready for more aggressive enforcement
 * These rules have higher violation counts and should be applied cautiously
 */
export const extendedStrictRules = {
	...strictRules,

	// ==========================================
	// High-Risk TypeScript Rules
	// ==========================================
	// Note: These rules have high violation counts in some packages
	// Apply only to packages with low violation counts

	/**
	 * https://typescript-eslint.io/rules/naming-convention
	 * Enforce consistent naming patterns
	 * WARNING: High violation count in some packages
	 */
	'@typescript-eslint/naming-convention': 'error',

	/**
	 * https://typescript-eslint.io/rules/no-unsafe-assignment
	 * Prevent unsafe type assignments
	 * WARNING: 7000+ violations in nodes-base
	 */
	'@typescript-eslint/no-unsafe-assignment': 'error',

	/**
	 * https://typescript-eslint.io/rules/no-unsafe-member-access
	 * Prevent unsafe member access
	 * WARNING: 4500+ violations in nodes-base
	 */
	'@typescript-eslint/no-unsafe-member-access': 'error',

	/**
	 * https://typescript-eslint.io/rules/no-unsafe-call
	 * Prevent unsafe function calls
	 * WARNING: 500+ violations in nodes-base
	 */
	'@typescript-eslint/no-unsafe-call': 'error',

	/**
	 * https://typescript-eslint.io/rules/no-unsafe-return
	 * Prevent unsafe return values
	 * WARNING: 400+ violations in nodes-base
	 */
	'@typescript-eslint/no-unsafe-return': 'error',
} as const;

/**
 * Security-focused strict rules
 * Rules that prevent common security vulnerabilities
 */
export const securityStrictRules = {
	/**
	 * https://typescript-eslint.io/rules/no-implied-eval
	 * Prevent implied eval usage
	 */
	'@typescript-eslint/no-implied-eval': 'error',

	/**
	 * https://eslint.org/docs/rules/no-eval
	 * Prevent eval usage
	 */
	'no-eval': 'error',

	/**
	 * https://eslint.org/docs/rules/no-implied-eval
	 * Prevent implied eval usage
	 */
	'no-implied-eval': 'error',

	/**
	 * https://typescript-eslint.io/rules/no-unsafe-function-type
	 * Prevent unsafe function types
	 */
	'@typescript-eslint/no-unsafe-function-type': 'error',
} as const;
