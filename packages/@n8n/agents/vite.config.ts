import { createVitestConfig } from '@n8n/vitest-config/node';
import type { Plugin } from 'vite';
import { mergeConfig } from 'vite';
import { configDefaults } from 'vitest/config';

/**
 * Source modules lazy-load their heavy deps via `require()` (intentional runtime
 * lazy-loading — see `lazy-ai.ts` and `model-factory.ts`). Under Vitest, source is
 * ESM and gets a Node `createRequire`, which `vi.mock()` does not intercept, so the
 * AI SDK / provider mocks in the unit tests never apply.
 *
 * This plugin rewrites those `require('spec')` calls to eager static imports at
 * transform time (test runtime only — the files on disk are untouched), which Vite
 * resolves and `vi.mock` can intercept. Dynamic `require(expr)` calls are routed
 * through the same eager-import map. The integration config does not use this plugin
 * because those tests deliberately exercise the real provider packages.
 */
const REWRITE_REQUIRE_TARGETS = [
	'/src/runtime/model/lazy-ai.ts',
	'/src/runtime/model/model-factory.ts',
	'/src/utils/parse.ts',
];

function rewriteSourceRequire(): Plugin {
	return {
		name: 'rewrite-source-require',
		enforce: 'pre',
		transform(code, id) {
			const normalized = id.replace(/\\/g, '/');
			if (!REWRITE_REQUIRE_TARGETS.some((target) => normalized.endsWith(target))) return null;

			const literalRequire = /require\((['"])([^'"]+)\1\)/g;
			const specs: string[] = [];
			for (const match of code.matchAll(literalRequire)) {
				if (!specs.includes(match[2])) specs.push(match[2]);
			}
			if (!specs.length) return null;

			const imports = specs.map((spec, i) => `import * as __req_${i} from '${spec}';`).join('\n');
			const mapEntries = specs.map((spec, i) => `${JSON.stringify(spec)}: __req_${i}`).join(', ');
			const rewritten = code
				.replace(literalRequire, (_full, _quote, spec) => `__requireMap[${JSON.stringify(spec)}]`)
				.replace(/require\(([^'")][^)]*)\)/g, (_full, expr) => `__requireMap[${expr}]`);

			return {
				code: `${imports}\nconst __requireMap = { ${mapEntries} };\n${rewritten}`,
				map: null,
			};
		},
	};
}

export default mergeConfig(
	createVitestConfig({
		// The n8n root jest.config sets `restoreMocks: true`, and test files silently rely on
		// it — omit this and mocks bleed between tests.
		restoreMocks: true,
		// Integration tests run via vitest.integration.config.mjs (real providers, long timeouts).
		exclude: [...configDefaults.exclude, '**/__tests__/integration/**'],
	}),
	{
		plugins: [rewriteSourceRequire()],
	},
);
