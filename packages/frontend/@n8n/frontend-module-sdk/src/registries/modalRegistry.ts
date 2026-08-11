import { shallowReactive } from 'vue';

import type { ModalDefinition } from '../types/modal';

/**
 * Shallow-reactive so consumers can derive from the registry with a plain
 * `computed` instead of mirroring it through a subscription. Shallow on purpose:
 * a definition's `component` must not be turned into a reactive object.
 */
const modals = shallowReactive(new Map<string, ModalDefinition>());
const listeners = new Set<(modals: Map<string, ModalDefinition>) => void>();

export function getAll(): Map<string, ModalDefinition> {
	return new Map(modals);
}

function notifyListeners(): void {
	listeners.forEach((listener) => listener(getAll()));
}

export function register(modal: ModalDefinition): void {
	if (modals.has(modal.key)) {
		console.warn(`Modal with key "${modal.key}" is already registered. Skipping.`);
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
