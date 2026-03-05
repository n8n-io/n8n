export interface VerifyResult {
	ok: boolean;
	errors: string[];
}

/**
 * Verify that agent source code follows SDK conventions.
 *
 * Checks for common mistakes before compilation — call this on the raw
 * TypeScript source before transpiling/evaluating.
 *
 * @example
 * ```typescript
 * import { verify } from '@n8n/agents';
 *
 * const result = verify(sourceCode);
 * if (!result.ok) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function verify(source: string): VerifyResult {
	const errors: string[] = [];

	if (!source?.trim()) {
		return { ok: false, errors: ['No source code provided'] };
	}

	if (/\.build\s*\(/.test(source)) {
		errors.push(
			'Do not call .build() — the engine handles this automatically. Remove all .build() calls.',
		);
	}

	if (!/export\s+default\b/.test(source)) {
		errors.push('No default export found. Export an agent as the default: export default agent;');
	}

	if (!/\.credential\s*\(/.test(source)) {
		errors.push(
			"No .credential() found. Every agent must declare a credential (e.g. .credential('anthropic')).",
		);
	}

	return { ok: errors.length === 0, errors };
}
