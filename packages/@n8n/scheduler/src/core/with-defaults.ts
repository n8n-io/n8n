/**
 * A plain `{ ...defaults, ...overrides }` would let an explicitly-undefined
 * override clobber a default (turning e.g. `leaseMs` into `NaN` downstream),
 * so undefined entries are treated as absent.
 */
export function withDefaults<T extends object>(defaults: T, overrides: Partial<T> = {}): T {
	const definedOverrides = Object.entries(overrides).filter(([, value]) => value !== undefined);
	return { ...defaults, ...Object.fromEntries(definedOverrides) };
}
