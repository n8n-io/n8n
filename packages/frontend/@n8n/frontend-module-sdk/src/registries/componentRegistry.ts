import { shallowReactive, type Component } from 'vue';

import type { ModuleComponentSlot } from '../types/component';

/**
 * Shell-hosted components, keyed by slot. The shell registers; modules read.
 *
 * Shallow-reactive so a module can resolve a slot with a plain `computed`, and
 * shallow specifically so a component is never turned into a reactive object.
 *
 * A slot with nothing registered resolves to `undefined`, and the module renders
 * nothing for it. That is the correct behavior in a module's own test run, where
 * no shell exists — a test that needs the slot registers a stub.
 */
const components = shallowReactive(new Map<ModuleComponentSlot, Component>());

export function register(slot: ModuleComponentSlot, component: Component): void {
	const existing = components.get(slot);
	if (existing && existing !== component) {
		console.warn(`Component slot "${slot}" is already registered. Skipping.`);
		return;
	}

	components.set(slot, component);
}

export function get(slot: ModuleComponentSlot): Component | undefined {
	return components.get(slot);
}

export function has(slot: ModuleComponentSlot): boolean {
	return components.has(slot);
}

export function unregister(slot: ModuleComponentSlot): void {
	components.delete(slot);
}

/** Test isolation only. */
export function clear(): void {
	components.clear();
}
