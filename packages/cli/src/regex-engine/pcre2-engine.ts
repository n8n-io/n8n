import type { Pcre2JsFlag } from '@n8n/regex-engine-pcre2';

import type { ManagedRegexEngine } from './regex-engine.service';

/**
 * The built-in engine already applies 250ms to a whole operation, so the package default of
 * 1000ms would loosen that ceiling fourfold.
 */
const OPERATION_TIMEOUT_MS = 250;

/**
 * The engine rejects any pattern carrying a JS flag it was not given, and a user's patterns
 * carry these.
 */
const JS_FLAGS: Pcre2JsFlag[] = ['g', 'u', 'y'];

/** Dynamic import: the engine package is ESM-only and this one is CommonJS. */
export async function createPcre2Engine(): Promise<ManagedRegexEngine> {
	const { initPcre2Engine, createPcre2RegexEngine } = await import('@n8n/regex-engine-pcre2');
	await initPcre2Engine();
	return createPcre2RegexEngine({
		jsFlags: JS_FLAGS,
		operationTimeoutMs: OPERATION_TIMEOUT_MS,
	});
}
