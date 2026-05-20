/**
 * Lazy loader for the Vercel `ai` SDK.
 *
 * `ai` is ~7.5 MB on disk and contributes a measurable chunk of resident
 * heap when evaluated at boot. Multiple files in @n8n/agents/src/runtime
 * use values from it (`generateText`, `streamText`, `Output`, `tool`,
 * `jsonSchema`). All those use sites live inside async methods or runtime
 * helpers, so the package can be deferred to first actual use — typically
 * the first chat or tool invocation — with no behavioural change.
 *
 * One shared loader keeps the require cached across files and avoids each
 * call site doing its own caching.
 *
 * Type-only consumers should `import type { ... } from 'ai'` directly;
 * those are erased at compile time.
 */

let _aiMod: typeof import('ai') | undefined;

export function loadAi(): typeof import('ai') {
	if (!_aiMod) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		_aiMod = require('ai');
	}
	return _aiMod!;
}
