export {
	Pcre2CompileError,
	Pcre2BudgetExceededError,
	Pcre2MatchError,
	Pcre2InternalError,
	Pcre2NotInitializedError,
} from './errors.js';
export type { Pcre2BudgetKind } from './errors.js';

export type { Pcre2Flag, Pcre2JsFlag } from './flags.js';

export type { Pcre2CompileOption } from './native-options.js';

export type { Pcre2ExecArray } from './match.js';

export { initPcre2Engine } from './wasm-module.js';

export {
	createPcre2RegexEngine,
	DEFAULT_OPERATION_TIMEOUT_MS,
	DEFAULT_MAX_MATCHES,
	DEFAULT_MAX_CACHED_PATTERNS,
} from './engine.js';
export type { RegexEngine, Pcre2EngineOptions } from './engine.js';
