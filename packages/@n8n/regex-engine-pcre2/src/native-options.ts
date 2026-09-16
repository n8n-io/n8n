import type { Pcre2WrapperModule } from './generated/pcre2_wrapper.js';

/** Opt-in PCRE2 compile options; off unless requested since some alter default PCRE2 semantics. */
export type Pcre2CompileOption =
	| 'altBsux'
	| 'matchUnsetBackref'
	| 'ucp'
	| 'dollarEndonly'
	| 'newlineAnyCrlf';

export interface ResolvedNativeOptions {
	extraOptions: number;
	compileExtraOptions: number;
	newlineConvention: number;
}

export function resolveNativeOptions(
	compileOptions: Pcre2CompileOption[],
	module: Pcre2WrapperModule,
): ResolvedNativeOptions {
	let extraOptions = 0;
	let compileExtraOptions = 0;
	let newlineConvention = 0;
	for (const option of compileOptions) {
		switch (option) {
			case 'altBsux':
				extraOptions |= module.PCRE2_ALT_BSUX;
				compileExtraOptions |= module.PCRE2_EXTRA_ALT_BSUX;
				break;
			case 'matchUnsetBackref':
				extraOptions |= module.PCRE2_MATCH_UNSET_BACKREF;
				break;
			case 'ucp':
				extraOptions |= module.PCRE2_UCP;
				break;
			case 'dollarEndonly':
				extraOptions |= module.PCRE2_DOLLAR_ENDONLY;
				break;
			case 'newlineAnyCrlf':
				newlineConvention = module.PCRE2_NEWLINE_ANYCRLF;
				break;
		}
	}
	return { extraOptions, compileExtraOptions, newlineConvention };
}
