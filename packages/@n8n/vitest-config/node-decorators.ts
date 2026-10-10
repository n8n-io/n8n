import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { transformWithOxc, type Alias, type Plugin } from 'vite';
import { mergeConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';
import { createVitestConfig } from './node.js';

const backendTestUtilsSource = (from: string) => {
	const req = createRequire(join(from, 'noop.js'));

	try {
		const packageJson = req.resolve('@n8n/backend-test-utils/package.json');
		return join(dirname(packageJson), 'src');
	} catch {
		return undefined;
	}
};

export const backendTestUtilsSourceAlias = (from: string = process.cwd()): Alias[] => {
	const sourceDir = backendTestUtilsSource(from);
	return sourceDir
		? [
				{
					find: /^@n8n\/backend-test-utils$/,
					replacement: join(sourceDir, 'index.ts'),
				},
			]
		: [];
};

export const backendTestUtilsSourcePlugin = (from: string = process.cwd()): Plugin => {
	const sourceDir = backendTestUtilsSource(from);

	return {
		name: 'backend-test-utils-source',
		enforce: 'pre',
		async transform(code, id) {
			if (!sourceDir || !id.startsWith(`${sourceDir}/`) || !id.endsWith('.ts')) return null;

			// The package builds as CommonJS. Vitest must transform its source as ESM
			// because the source imports Vitest directly.
			return await transformWithOxc(code, id, {
				lang: 'ts',
				sourceType: 'module',
			});
		},
	};
};

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
		plugins: [backendTestUtilsSourcePlugin()],
		resolve: { alias: backendTestUtilsSourceAlias() },
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
