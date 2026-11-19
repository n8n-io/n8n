import { shallowReactive } from 'vue';

import type { ModalDefinition } from '../types/modal';

/**
 * Shallow-reactive so consumers can derive from the registry with a plain
 * `computed` instead of mirroring it through a subscription. Shallow on purpose:
 * a definition's `component` must not be turned into a reactive object.
 */
const modals = shallowReactive(new Map<string, ModalDefinition>());
const listeners = new Set<(modals: Map<string, ModalDefinition>) => void>();

/** Declarations, not registrations — deliberately not emptied by `clear()`. */
const adHocKeyPrefixes = new Set<string>();

export function getAll(): Map<string, ModalDefinition> {
	return new Map(modals);
}

function notifyListeners(): void {
	listeners.forEach((listener) => listener(getAll()));
}

export function register(modal: ModalDefinition): void {
	const existing = modals.get(modal.key);
	if (existing) {
		// Replaying the same definition is how a re-login re-runs registration —
		// a no-op, not a collision. Only a different definition claiming a taken
		// key is worth warning about.
		if (existing !== modal) {
			console.warn(`Modal with key "${modal.key}" is already registered. Skipping.`);
		}
		return;
	}

	modals.set(modal.key, modal);
	notifyListeners();
}

export function unregister(key: string): void {
	if (modals.delete(key)) {
		notifyListeners();
	}
}

export function get(key: string): ModalDefinition | undefined {
	return modals.get(key);
}

export function getKeys(): string[] {
	return Array.from(modals.keys());
}

export function has(key: string): boolean {
	return modals.has(key);
}

/**
 * Declare that keys starting with `prefix` are minted at runtime and will never
 * be registered, so the unknown-key warning can tell them apart from a modal
 * whose registration was forgotten.
 */
export function declareAdHocKeyPrefix(prefix: string): void {
	adHocKeyPrefixes.add(prefix);
}

/**
 * Whether `key` was minted from a declared ad-hoc prefix — either the bare
 * prefix or the `<prefix>-<id>` form features build per row.
 *
 * Prefix matching is the trade this makes: a forgotten registration whose key
 * happens to share a declared prefix goes unwarned.
 */
export function isAdHocKey(key: string): boolean {
	for (const prefix of adHocKeyPrefixes) {
		if (key === prefix || key.startsWith(`${prefix}-`)) return true;
	}

	return false;
}

export function subscribe(listener: (modals: Map<string, ModalDefinition>) => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Remove all registered modals. Primarily for test isolation.
 */
export function clear(): void {
	modals.clear();
	notifyListeners();
}
