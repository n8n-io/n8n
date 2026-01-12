/**
 * Validates regex literal strings for safe parsing into RegExp objects.
 *
 * Checks format `/pattern/flags` before attempting RegExp construction
 * to prevent crashes from invalid patterns. Used for user-provided regex
 * strings in configuration (e.g., dry-run replace patterns).
 */
export class RegExpValidator {
	/**
	 * Validates if a string is a valid regex literal that can be safely parsed.
	 *
	 * Expects format `/pattern/flags` where pattern is non-empty and flags are
	 * optional valid regex flags (gimusy). Returns false for plain strings
	 * without delimiters or invalid regex syntax.
	 *
	 * @param pattern - Regex literal string to validate (e.g., "/[a-z]+/gi")
	 * @returns true if pattern is valid regex literal, false otherwise
	 *
	 * @example
	 * RegExpValidator.isValidPattern("/test/i")  // true
	 * RegExpValidator.isValidPattern("test")     // false - missing delimiters
	 * RegExpValidator.isValidPattern("//")       // false - empty pattern
	 * RegExpValidator.isValidPattern("/[/")      // false - invalid regex
	 */
	static isValidPattern(pattern: string): boolean {
		try {
			// NOTE: Pattern must match `/.../.../` format with non-empty content between slashes
			const match = pattern.match(/^\/(.+)\/([gimusy]*)$/);
			if (!match) return false;

			// Validate regex syntax by attempting construction
			new RegExp(match[1], match[2]);
			return true;
		} catch {
			// Invalid regex syntax (e.g., unclosed brackets, invalid escapes)
			return false;
		}
	}
}
