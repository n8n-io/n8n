import type { CapabilityToken } from '../types/capability';

/**
 * Shell-provided actions, keyed by capability token. The shell provides;
 * modules read.
 *
 * Not reactive, unlike `componentRegistry`: a capability is an action a module
 * calls from a handler or a guard, so nothing renders off it. A capability whose
 * value changes should carry a `Ref` and stay one provider.
 *
 * Keyed by the token itself, not by `token.key`: two tokens that pick the same
 * string then get their own slot instead of one reading the other's value.
 */
const providers = new Map<CapabilityToken<unknown>, unknown>();

export function provide<T>(token: CapabilityToken<T>, implementation: T): void {
	if (providers.has(token) && providers.get(token) !== implementation) {
		console.warn(`Capability "${token.key}" is already provided. Skipping.`);
		return;
	}

	providers.set(token, implementation);
}

/**
 * The provided implementation, or `undefined` when there is none. Ignores the
 * token's `fallback` on purpose: this is the presence check.
 */
export function tryUse<T>(token: CapabilityToken<T>): T | undefined {
	// The one cast here. The token is the slot and `provide()` is the only writer,
	// so whatever is stored under it came from a `provide()` call with the same `T`.
	return providers.get(token) as T | undefined;
}

/**
 * The provided implementation, or the token's fallback. Throws when there is
 * neither — call it from a handler or a guard, never at module scope.
 */
export function use<T>(token: CapabilityToken<T>): T {
	// Presence decides, not the value: a provider is free to supply `null` or
	// `undefined` when `T` allows it, and must still win over the fallback.
	if (has(token)) {
		return providers.get(token) as T;
	}

	if ('fallback' in token) {
		return token.fallback as T;
	}

	throw new Error(
		`Capability "${token.key}" has no provider. Call capabilityRegistry.provide() at app bootstrap.`,
	);
}

export function has(token: CapabilityToken<unknown>): boolean {
	return providers.has(token);
}

export function unprovide(token: CapabilityToken<unknown>): void {
	providers.delete(token);
}

/** Test isolation only. */
export function clear(): void {
	providers.clear();
}
