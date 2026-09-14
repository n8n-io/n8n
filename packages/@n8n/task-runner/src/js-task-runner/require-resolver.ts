import { isBuiltin } from 'node:module';

import { DisallowedModuleError } from './errors/disallowed-module.error';
import { ExecutionError } from './errors/execution-error';

export type RequireResolverOpts = {
	/**
	 * List of built-in nodejs modules that are allowed to be required in the
	 * execution sandbox. `"*"` means all are allowed.
	 */
	allowedBuiltInModules: Set<string> | '*';

	/**
	 * List of external modules that are allowed to be required in the
	 * execution sandbox. `"*"` means all are allowed.
	 */
	allowedExternalModules: Set<string> | '*';

	/**
	 * When true, return a write-blocking view of each resolved module. The
	 * module cache is shared across every task in the runner process, so an
	 * unprotected module object lets one task's changes leak into other tasks.
	 */
	secureModules?: boolean;
};

export type RequireResolver = (request: string) => unknown;

type Constructor = new (...args: unknown[]) => object;

const isWrappable = (value: unknown): value is object =>
	value !== null && (typeof value === 'object' || typeof value === 'function');

// Views (write-blocking proxies) keyed by their real target, plus the reverse
// lookup used to unwrap `this`/arguments back to the real object before a
// wrapped function runs. One view per target keeps identity stable across reads.
const viewByTarget = new WeakMap<object, unknown>();
const targetByView = new WeakMap<object, object>();

const unwrap = (value: unknown): unknown =>
	isWrappable(value) ? (targetByView.get(value) ?? value) : value;

// A non-configurable, non-writable data property: a Proxy must hand back its
// exact value (invariant), so it can't be wrapped.
const isFixedData = (descriptor: PropertyDescriptor | undefined): boolean =>
	!!descriptor && 'value' in descriptor && !descriptor.configurable && !descriptor.writable;

// Secure a value read off the module. Normally wrap it in the membrane; when an
// invariant forces us to return the exact object, freeze it best-effort instead
// so it still can't be mutated for other tasks.
function secureReadValue(value: unknown, mustReturnRaw: boolean): unknown {
	if (!mustReturnRaw) return secureModuleExport(value);
	if (isWrappable(value) && !Object.isFrozen(value)) {
		try {
			Object.freeze(value);
		} catch {
			// Non-freezable (e.g. a populated TypedArray) — nothing more we can do.
		}
	}
	return value;
}

// Blocks every write (assignment incl. accessor setters, (re)definition,
// deletion, prototype change) and wraps values read from the module — via both
// property reads and descriptor reflection — so nested objects can't be mutated
// either. Function calls forward to the real module with `this`/arguments
// unwrapped, so internal-slot/brand checks still pass.
const membraneHandler: ProxyHandler<object> = {
	set: () => false,
	defineProperty: () => false,
	deleteProperty: () => false,
	setPrototypeOf: () => false,
	get(target, prop) {
		const value = Reflect.get(target, prop, target) as unknown;
		const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
		return secureReadValue(value, isFixedData(descriptor));
	},
	getOwnPropertyDescriptor(target, prop) {
		const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
		if (descriptor && 'value' in descriptor) {
			descriptor.value = secureReadValue(descriptor.value, isFixedData(descriptor));
		}
		return descriptor;
	},
	apply: (target, thisArg, args) =>
		Reflect.apply(target as (...a: unknown[]) => unknown, unwrap(thisArg), args.map(unwrap)),
	// Return values are left unwrapped so callers keep ownership of what a
	// module hands back (e.g. a Buffer they can still mutate).
	construct: (target, args, newTarget) =>
		Reflect.construct(target as Constructor, args.map(unwrap), unwrap(newTarget) as Constructor),
};

/**
 * Wrap a resolved module in a write-blocking membrane. Proxying rather than
 * `Object.freeze` avoids two problems: freezing throws on non-freezable
 * exports (e.g. a non-empty `Buffer`/`TypedArray`), and it leaves accessor
 * setters (e.g. `crypto.fips`) able to mutate shared process state. The
 * membrane also wraps nested objects on read, so one task cannot mutate a
 * module's nested state (e.g. `http.globalAgent`) for the others.
 */
export function secureModuleExport(resolved: unknown): unknown {
	if (!isWrappable(resolved)) return resolved;

	const cached = viewByTarget.get(resolved);
	if (cached !== undefined) return cached;

	const view = new Proxy(resolved, membraneHandler);
	viewByTarget.set(resolved, view);
	targetByView.set(view, resolved);
	return view;
}

export function createRequireResolver({
	allowedBuiltInModules,
	allowedExternalModules,
	secureModules = false,
}: RequireResolverOpts) {
	return (request: string) => {
		const checkIsAllowed = (allowList: Set<string> | '*', moduleName: string) => {
			return allowList === '*' || allowList.has(moduleName);
		};

		const isAllowed = isBuiltin(request)
			? checkIsAllowed(allowedBuiltInModules, request)
			: checkIsAllowed(allowedExternalModules, request);

		if (!isAllowed) {
			const error = new DisallowedModuleError(request);
			throw new ExecutionError(error);
		}

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const resolved = require(request) as unknown;

		return secureModules ? secureModuleExport(resolved) : resolved;
	};
}
