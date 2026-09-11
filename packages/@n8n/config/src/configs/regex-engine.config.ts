import z from 'zod';

import { Config, Env } from '../decorators';

const regexEngineSchema = z.enum(['js']);

@Config
export class RegexEngineConfig {
	/**
	 * Which regex engine runs the patterns a user writes.
	 * - `js` (default) is the built-in engine: `RegExp` behind a `node:vm` timeout.
	 *
	 * Patterns n8n itself authored always use the built-in engine.
	 */
	@Env('N8N_REGEX_ENGINE', regexEngineSchema)
	engine: 'js' = 'js';
}
