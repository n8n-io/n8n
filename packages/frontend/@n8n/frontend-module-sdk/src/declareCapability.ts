import type { CapabilityToken } from './types/capability';

/**
 * Declares a capability: an action the shell owns and a module calls, but cannot
 * import.
 *
 * Reach for one only when all three hold:
 *
 * - the module needs a runtime action or a reactive read, not a component;
 * - the target is shell-core state with no path down to an L2 package;
 * - no existing contribution surface fits (modals, components, commands,
 *   resources, push handlers, parameter inputs).
 *
 * If any of the three fails, use the surface that fits instead.
 *
 * Give `T` explicitly. It is the contract both sides are checked against, and it
 * cannot be inferred from the key.
 */
export function declareCapability<T>(
	key: string,
	options: { fallback?: T } = {},
): CapabilityToken<T> {
	// Only carry the property when the caller declared one: `use()` reads presence,
	// so an always-present `fallback: undefined` would suppress its throw.
	return 'fallback' in options ? { key, fallback: options.fallback } : { key };
}
