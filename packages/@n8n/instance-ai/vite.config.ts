import path from 'node:path';
import { mergeConfig, type Plugin } from 'vite';
import { createVitestConfig } from '@n8n/vitest-config/node';

const INDEX_LAZY_REQUIRE_TEST_SPECS = new Set([
	'./tracing/langsmith-tracing',
	'./agent/instance-agent',
	'./domain-access',
	'./agent/sub-agent-factory',
	'./tools/web-research/sanitize-web-content',
	'./tools/orchestration/delegate.tool',
	'./tools',
	'./tools/orchestration/agent-persistence',
	'./tracing/trace-replay',
	'./memory/title-utils',
	'./mcp/mcp-client-manager',
	'./utils/stream-helpers',
	'./storage',
	'./stream/map-chunk',
	'./skills/runtime-skills',
	'./skills/materialize-runtime-skills',
	'./utils/eval-agents',
	'./utils/agent-tree',
	'./workspace/builder-templates-service',
	'./workspace/create-workspace',
	'@n8n/agents/sandbox',
	'./workspace/lazy-runtime-workspace',
	'./workspace/sandbox-setup',
	'./workspace/snapshot-manager',
	'./runtime/run-state-registry',
	'./runtime/background-task-manager',
	'./runtime/terminal-response-guard',
	'./runtime/resumable-stream-executor',
	'./runtime/stream-runner',
	'./parsers/structured-file-parser',
	'./parsers/validate-attachments',
	'./runtime/liveness-policy',
	'./workflow-loop',
	'./workflow-loop/runtime',
	'./planned-tasks/planned-task-service',
	'./planned-tasks/planned-task-permissions',
]);

/**
 * Lazy exports use `require('./module')` because production runs the compiled
 * CommonJS output. Vitest's module runner hands source files a Node
 * `createRequire`, which cannot resolve relative `.ts` files — and `vi.mock`
 * only intercepts ESM imports, not these `require()`s. This transform
 * (test-time only; the source on disk is untouched) rewrites selected
 * `require('spec')` calls into eager static `import * as __lazymod_N` bindings
 * so Vite resolves them and `vi.mock` applies.
 */
function rewriteLazyRequireForTests(): Plugin {
	return {
		name: 'instance-ai-rewrite-lazy-require',
		enforce: 'pre',
		transform(code, id) {
			const normalizedId = id.replace(/\\/g, '/');
			const shouldRewriteAllRequires = normalizedId.endsWith('/src/tools/index.ts');
			const shouldRewriteSelectedRequires = normalizedId.endsWith('/src/index.ts');
			if (!shouldRewriteAllRequires && !shouldRewriteSelectedRequires) return null;

			const requireRe = /require\((['"])([^'"]+)\1\)/g;
			const specs: string[] = [];
			for (const match of code.matchAll(requireRe)) {
				const spec = match[2];
				if (
					shouldRewriteAllRequires ||
					(shouldRewriteSelectedRequires && INDEX_LAZY_REQUIRE_TEST_SPECS.has(spec))
				) {
					if (!specs.includes(spec)) specs.push(spec);
				}
			}
			if (specs.length === 0) return null;
			const imports = specs
				.map((spec, index) => `import * as __lazymod_${index} from '${spec}';`)
				.join('\n');
			const rewritten = code.replace(requireRe, (full, _quote, spec: string) => {
				const index = specs.indexOf(spec);
				return index === -1 ? full : `__lazymod_${index}`;
			});
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
