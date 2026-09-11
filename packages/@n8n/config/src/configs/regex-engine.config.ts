import z from 'zod';

import { Config, Env } from '../decorators';

const regexEngineSchema = z.enum(['js', 'pcre2']);

@Config
export class RegexEngineConfig {
	/** Regex engine for expressions and nodes: the built-in JS engine, or PCRE2 in WebAssembly. */
	@Env('N8N_REGEX_ENGINE', regexEngineSchema)
	engine: 'js' | 'pcre2' = 'js';
}
