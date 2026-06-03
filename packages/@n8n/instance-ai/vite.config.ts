import path from 'node:path';
import { mergeConfig, type Plugin } from 'vite';
import { createVitestConfig } from '@n8n/vitest-config/node';

/**
 * `src/tools/index.ts` lazy-loads each tool module with `require('./x.tool')`.
 * Under the production `tsc` build that resolves to the compiled `dist/*.js`, but
 * Vitest's module runner hands the (ESM) source a Node `createRequire`, which
 * cannot resolve relative `.ts` files — and `vi.mock` only intercepts ESM imports,
 * not these `require()`s. This transform (test-time only; the source on disk is
 * untouched) rewrites those `require('spec')` calls into eager static
 * `import * as __lazymod_N` bindings so Vite resolves them and `vi.mock` applies.
 */
function rewriteLazyRequireForTests(): Plugin {
	return {
		name: 'instance-ai-rewrite-lazy-require',
		enforce: 'pre',
		transform(code, id) {
			if (!id.replace(/\\/g, '/').endsWith('/src/tools/index.ts')) return null;
			const requireRe = /require\((['"])([^'"]+)\1\)/g;
			const specs: string[] = [];
			for (const match of code.matchAll(requireRe)) {
				if (!specs.includes(match[2])) specs.push(match[2]);
			}
			if (specs.length === 0) return null;
			const imports = specs
				.map((spec, index) => `import * as __lazymod_${index} from '${spec}';`)
				.join('\n');
			const rewritten = code.replace(
				requireRe,
				(_full, _quote, spec: string) => `__lazymod_${specs.indexOf(spec)}`,
			);
			return { code: `${imports}\n${rewritten}`, map: null };
		},
	};
}

export default mergeConfig(
	createVitestConfig({
		// Parity with the previous root Jest config, which set `restoreMocks: true`.
		// Most test files rely on mocks being restored automatically between tests.
		restoreMocks: true,
	}),
	{
		plugins: [rewriteLazyRequireForTests()],
		resolve: {
			alias: [
				{ find: '@', replacement: path.resolve(__dirname, './src') },
				// zod has dual ESM/CJS exports (two separate `ZodType` class identities).
				// Workspace deps CJS-require zod while test files ESM-import it, so
				// `instanceof` checks (e.g. in sanitize-mcp-schemas) fail across the two
				// module instances. Pin the top-level `zod` import to the CJS file so all
				// code paths share one instance. `require.resolve` follows zod's `require`
				// export condition, so it tracks the installed (catalog) version
				// automatically. Subpaths like `zod/v4` resolve normally.
				{
					find: /^zod$/,
					replacement: require.resolve('zod'),
				},
			],
		},
	},
);
