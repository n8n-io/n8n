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

	if (/\bScorer\b/.test(source)) {
		errors.push(
			"Scorer is deprecated. Use the Eval system instead: new Eval('name').check(...) or evals.correctness()",
		);
	}

	if (/process\.env\b/.test(source)) {
		errors.push(
			'process.env is not available. Use .credential() for API keys, or const variables for configuration.',
		);
	}

	// Detect ctx.suspend() calls without `return`. The handler must use
	// `return ctx.suspend(...)` or `return await ctx.suspend(...)` so execution
	// halts. Strip valid patterns (return + schema declarations), then check
	// if any bare suspend() call remains.
	{
		// Remove `return await ctx.suspend(` and `return ctx.suspend(` — these are valid
		let stripped = source.replace(/return\s+(?:await\s+)?(?:ctx\.)?suspend\s*\(/g, '');
		// Remove `.suspend(z.` — these are schema declarations, not runtime calls
		stripped = stripped.replace(/\.suspend\s*\(z\./g, '');
		if (/(?:ctx\.)?suspend\s*\(/.test(stripped)) {
			errors.push(
				'ctx.suspend() must be returned: use `return await ctx.suspend(...)` or `return ctx.suspend(...)`. ' +
					'Without return, the handler continues executing after suspension.',
			);
		}
	}

	if (!/\.credential\s*\(/.test(source)) {
		errors.push(
			"No .credential() found. Every agent must declare a credential (e.g. .credential('anthropic')).",
		);
	}

	return { ok: errors.length === 0, errors };
}
