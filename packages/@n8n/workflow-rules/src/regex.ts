import type { RegexTester } from './types';

export const MAX_PATTERN_LENGTH = 500;
export const MAX_TESTED_INPUT_LENGTH = 10_000;

const ALLOWED_FLAGS = /^[imsu]*$/;

/** Plain `RegExp`. The editor and the CLI only run patterns their own admins wrote. */
export const nativeRegexTester: RegexTester = {
	test(pattern, input, flags) {
		return new RegExp(pattern, flags).test(input.slice(0, MAX_TESTED_INPUT_LENGTH));
	},
};

/** Returns an error message, or `undefined` when the pattern is usable. */
export function validateRegexPattern(pattern: string, flags = ''): string | undefined {
	if (pattern.length === 0) return 'Enter a pattern';
	if (pattern.length > MAX_PATTERN_LENGTH) {
		return `Use a pattern of ${MAX_PATTERN_LENGTH} characters or fewer`;
	}
	if (!ALLOWED_FLAGS.test(flags)) return 'Use only the i, m, s and u flags';
	try {
		new RegExp(pattern, flags);
		return undefined;
	} catch (error) {
		return error instanceof Error ? error.message : 'The pattern is not valid';
	}
}
