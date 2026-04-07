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
// TODO: This is quite a messy function - whether we keep this functionality in the future
// is up for debate - but want to capture some rules that can't be captured easily with Typescript
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

	// Detect ctx.suspend() calls that won't halt execution. Valid patterns:
	//   - `return [await] [ctx.]suspend(` — may span lines (return + newline + suspend)
	//   - `return <expr> ? [await] [ctx.]suspend(` — ternary
	//   - `=> [await] [ctx.]suspend(` — arrow implicit return
	//   - `.suspend(z.` — schema declaration, not a runtime call
	//
	// Strategy: strip all valid patterns from the source, then check if any
	// bare suspend() call remains. The key difference from a naive [\s\S]*?
	// approach is that `return` must only be followed by whitespace (not
	// arbitrary code) before reaching `[await] suspend(`.
	{
		let stripped = source;
		// Valid: return [whitespace/newlines] [await] [ctx.]suspend(
		stripped = stripped.replace(/return\s+(?:await\s+)?(?:ctx\.)?suspend\s*\(/g, '');
		// Valid: return <single-line-expr> ? [await] [ctx.]suspend(
		stripped = stripped.replace(/return\s+[^\n;]+\?\s*(?:await\s+)?(?:ctx\.)?suspend\s*\(/g, '');
		// Valid: => [whitespace/newlines] [await] [ctx.]suspend( (arrow implicit return)
		stripped = stripped.replace(/=>\s*(?:await\s+)?(?:ctx\.)?suspend\s*\(/g, '');
		// Schema declarations: .suspend(z. or .suspend(\nz.
		stripped = stripped.replace(/\.suspend\s*\(\s*z\./g, '');
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
