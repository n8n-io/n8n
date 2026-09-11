import { Pcre2NotInitializedError } from './errors.js';
import createPcre2WrapperModule from './generated/pcre2_wrapper.js';
import type { Pcre2WrapperModule, Pcre2Wrapper } from './generated/pcre2_wrapper.js';
import type { CompiledPattern } from './handle-cache.js';

// Lets reinitModuleAfterTrap invalidate every live engine's handle cache.
export const liveCaches = new Set<Map<string, CompiledPattern>>();

// Handles a trap has already torn down -- their native object belonged to the wasm
// instance reinitModuleAfterTrap() just discarded. A caller may still hold one of these
// (e.g. runMatch()'s own `handle` argument, mid-call when the trap happened) after this
// runs; checked by releaseSubject() so its cleanup doesn't call into a dead object.
export const invalidatedHandles = new WeakSet<Pcre2Wrapper>();

let loadPromise: Promise<Pcre2WrapperModule> | undefined;
let loadedModule: Pcre2WrapperModule | undefined;

/** Idempotent. Must resolve before createPcre2RegexEngine()'s functions run -- they're synchronous. */
export async function initPcre2Engine(): Promise<void> {
	loadPromise ??= createPcre2WrapperModule();
	// Captured so a trap mid-await (which replaces loadPromise with a fresh reload, see
	// reinitModuleAfterTrap) can't have this call publish its now-stale resolved module
	// over the reload's -- only publish if nothing replaced loadPromise while awaiting.
	const awaited = loadPromise;
	const module = await awaited;
	if (loadPromise === awaited) loadedModule = module;
}

export function getModule(): Pcre2WrapperModule {
	if (!loadedModule) {
		throw new Pcre2NotInitializedError(
			'PCRE2 engine used before initPcre2Engine() resolved. Call and await initPcre2Engine() once at startup.',
		);
	}
	return loadedModule;
}

// @types/node doesn't declare WebAssembly (a "dom" lib type), so type it narrowly here.
export function isWasmTrap(error: unknown): boolean {
	/* eslint-disable @typescript-eslint/naming-convention -- names come from the global WebAssembly API, not ours to rename */
	const runtimeErrorCtor = (
		globalThis as { WebAssembly?: { RuntimeError: new (...args: never[]) => Error } }
	).WebAssembly?.RuntimeError;
	/* eslint-enable @typescript-eslint/naming-convention */
	return runtimeErrorCtor !== undefined && error instanceof runtimeErrorCtor;
}

// A trap leaves memory unspecified: drop every handle cache (not freed -- could crash it) and reload.
export function reinitModuleAfterTrap(): void {
	loadedModule = undefined;
	for (const cache of liveCaches) {
		for (const compiled of cache.values()) invalidatedHandles.add(compiled.handle);
		cache.clear();
	}
	loadPromise = createPcre2WrapperModule().then((module) => {
		loadedModule = module;
		return module;
	});
	// A reload failure here would otherwise be an unobserved rejection until (if ever)
	// something calls initPcre2Engine() again; this keeps it observed without swallowing
	// it -- initPcre2Engine() still awaits and surfaces the real rejection to its caller.
	loadPromise.catch(() => {});
}
