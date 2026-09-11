import z from 'zod';

import { Config, Env } from '../decorators';

const regexEngineSchema = z.enum(['js', 'pcre2']);

@Config
export class RegexEngineConfig {
	/**
	 * Which regex engine runs the patterns a user writes.
	 * - `js` (default) is the built-in engine: `RegExp` behind a `node:vm` timeout.
	 * - `pcre2` is a PCRE2 engine compiled to WebAssembly (`@n8n/regex-engine-pcre2`).
	 *
	 * Patterns n8n itself authored always use the built-in engine.
	 */
	@Env('N8N_REGEX_ENGINE', regexEngineSchema)
	engine: 'js' | 'pcre2' = 'js';
}
