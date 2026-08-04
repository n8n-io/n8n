import { mergeConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';
import { createVitestConfig } from './node.js';

export const createVitestConfigWithDecorators = (
	options: InlineConfig = {},
	// `pinCjs` is opt-in per package (default none): pinning a dep to CJS also forces its
	// transitive dual-build deps to CJS (e.g. `n8n-workflow` drags luxon's `DateTime`
	// identity along), which can break unrelated `instanceof`/`expect.any` checks. Only
	// packages whose own tests need a specific dep unified should pass it. See
	// `cjsPinAliases` for the full rationale.
	{ pinCjs = [] }: { pinCjs?: string[] } = {},
) => {
	const baseConfig = createVitestConfig(options, { pinCjs });
	return mergeConfig(baseConfig, {
		test: {
			server: {
				deps: {
					// Load workspace packages that own the DI container or register services
					// from their built dist instead of source. Otherwise Vitest's pipeline loads
					// them as TS while CJS dist gets loaded via require, producing two `Container`
					// instances — one where `@Config`/`@Service` decorators registered, one used
					// by the test — and `Container.get(...)` returns undefined for everything.
					external: [/@n8n\/(di|config|constants)/, /n8n-workflow/],
				},
			},
		},
	});
};

export const vitestConfigWithDecorators = createVitestConfigWithDecorators();
