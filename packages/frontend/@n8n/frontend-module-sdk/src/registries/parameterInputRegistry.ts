import { shallowReactive } from 'vue';

import type { ParameterInputContribution, ParameterInputType } from '../types/parameterInput';

/**
 * Shallow-reactive so the render path can derive from the registry with a plain
 * `computed`. Shallow on purpose: a contribution's `component` must not be
 * turned into a reactive object.
 */
const parameterInputs = shallowReactive(new Map<ParameterInputType, ParameterInputContribution>());
const listeners = new Set<(entries: Map<ParameterInputType, ParameterInputContribution>) => void>();

export function getAll(): Map<ParameterInputType, ParameterInputContribution> {
	return new Map(parameterInputs);
}

function notifyListeners(): void {
	listeners.forEach((listener) => listener(getAll()));
}

/**
 * Claim `contribution.type` for this component. One owner per type: the shell's
 * built-in branch for that type is what an unclaimed type falls back to.
 */
export function register(contribution: ParameterInputContribution): void {
	const existing = parameterInputs.get(contribution.type);
	if (existing) {
		// Replaying the same contribution is how a re-login re-runs registration —
		// a no-op, not a collision. Only a different contribution claiming a taken
		// type is worth warning about.
		if (existing !== contribution) {
			console.warn(
				`Parameter input for type "${contribution.type}" is already registered. Skipping.`,
			);
		}
		return;
	}

	parameterInputs.set(contribution.type, contribution);
	notifyListeners();
}

export function unregister(type: ParameterInputType): void {
	if (parameterInputs.delete(type)) {
		notifyListeners();
	}
}

export function get(type: ParameterInputType): ParameterInputContribution | undefined {
	return parameterInputs.get(type);
}

export function has(type: ParameterInputType): boolean {
	return parameterInputs.has(type);
}

export function subscribe(
	listener: (entries: Map<ParameterInputType, ParameterInputContribution>) => void,
): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Remove all registered parameter inputs. Primarily for test isolation.
 */
export function clear(): void {
	parameterInputs.clear();
	notifyListeners();
}
