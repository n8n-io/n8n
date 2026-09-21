import type { CapabilityToken } from '../types/capability';

/**
 * Shell-provided actions, keyed by capability token. The shell provides;
 * modules read.
 *
 * Not reactive, unlike `componentRegistry`: a capability is an action a module
 * calls from a handler or a guard, so nothing renders off it. A capability whose
 * value changes should carry a `Ref` and stay one provider.
 */
const providers = new Map<string, unknown>();

export function provide<T>(token: CapabilityToken<T>, implementation: T): void {
	if (providers.has(token.key) && providers.get(token.key) !== implementation) {
		console.warn(`Capability "${token.key}" is already provided. Skipping.`);
		return;
	}

	providers.set(token.key, implementation);
}

/**
 * The provided implementation, or `undefined` when there is none. Ignores the
 * token's `fallback` on purpose: this is the presence check.
 */
export function tryUse<T>(token: CapabilityToken<T>): T | undefined {
	// The one cast here. A token is the only way to write its key, so whatever is
	// stored under it came from a `provide()` call with the same `T`.
	return providers.get(token.key) as T | undefined;
}

/**
 * The provided implementation, or the token's fallback. Throws when there is
 * neither — call it from a handler or a guard, never at module scope.
 */
export function use<T>(token: CapabilityToken<T>): T {
	const implementation = tryUse(token) ?? token.fallback;
	if (implementation === undefined) {
		throw new Error(
			`Capability "${token.key}" has no provider. Call capabilityRegistry.provide() at app bootstrap.`,
		);
	}

	return implementation;
}

export function has(token: CapabilityToken<unknown>): boolean {
	return providers.has(token.key);
}

export function unprovide(token: CapabilityToken<unknown>): void {
	providers.delete(token.key);
}

/** Test isolation only. */
export function clear(): void {
	providers.clear();
}
