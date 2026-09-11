import { Pcre2CompileError } from './errors.js';
import type { Pcre2WrapperModule } from './generated/pcre2_wrapper.js';

export type Pcre2Flag = 'i' | 'm' | 's' | 'x';

export type Pcre2JsFlag = 'g' | 'u' | 'y';
export const ALL_JS_FLAGS: readonly Pcre2JsFlag[] = ['g', 'u', 'y'];

/** Every char the native module's flag-parsing loop understands, except 'u' -- opt-in via jsFlags. */
export function nativeFlagsFrom(module: Pcre2WrapperModule): ReadonlySet<Pcre2Flag> {
	const flags = new Set<Pcre2Flag>();
	for (const ch of module.nativeFlagChars()) {
		if (ch === 'u') continue;
		flags.add(ch as Pcre2Flag);
	}
	return flags;
}

/** JS's sticky flag: PCRE2_ANCHORED forces the match to start exactly at startOffset. */
export function isSticky(flags: string): boolean {
	return flags.includes('y');
}

/** JS's unicode flag: code-point rather than code-unit semantics (see PCRE2_UTF above). */
export function isUnicode(flags: string): boolean {
	return flags.includes('u');
}

export function assertSupportedFlags(
	allowedFlags: ReadonlySet<Pcre2Flag | Pcre2JsFlag>,
	flags: string,
): void {
	// Native RegExp rejects a repeated flag character (e.g. 'ii') with a SyntaxError.
	const seen = new Set<string>();
	for (const flag of flags) {
		if (!allowedFlags.has(flag as Pcre2Flag | Pcre2JsFlag)) {
			throw new Pcre2CompileError(`Unsupported regex flag: '${flag}'`, '', flags, 0, 0);
		}
		if (seen.has(flag)) {
			throw new Pcre2CompileError(`Duplicate regex flag: '${flag}'`, '', flags, 0, 0);
		}
		seen.add(flag);
	}
}
