import { computed, type ComputedRef } from 'vue';

/**
 * Wraps a derivation in a `computed` that returns the same reference when the
 * new value is considered equal to the previous one by the provided `isEqual`
 * function (defaults to `Object.is`).
 *
 * Vue's `computed` uses `Object.is` on return values to decide whether to
 * notify subscribers. By returning a stable reference on equal content,
 * consumers only re-render when the value actually changes — without each
 * consumer writing its own equality gate.
 *
 * Typical use: pass a deep-equality function (e.g. `lodash/isEqual`) for
 * derivations that produce fresh objects/arrays on every evaluation but are
 * structurally identical most of the time.
 *
 * @example
 * import isEqual from 'lodash/isEqual';
 * const ports = structuralComputed(() => computePorts(...), isEqual);
 */
export function structuralComputed<T>(
	derive: () => T,
	isEqual: (a: T, b: T) => boolean = Object.is,
): ComputedRef<T> {
	let cached: T;
	let primed = false;
	return computed<T>(() => {
		const next = derive();
		if (primed && isEqual(cached, next)) return cached;
		cached = next;
		primed = true;
		return cached;
	});
}
