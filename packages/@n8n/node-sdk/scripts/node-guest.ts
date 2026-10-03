// Builds the JS guest for Node: `dist/guest/action.cjs` on stdio and `dist/guest/worker.cjs` in a
// worker thread. The package build runs it.
// The `n8n:*` WIT imports resolve to `sandbox/node/imports.ts`, which calls the host over
// JSON-RPC. Usage: `pnpm exec tsx scripts/node-guest.ts`.
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SANDBOX = path.join(ROOT, 'sandbox');
const SOURCE = path.join(ROOT, 'src');
const IMPORTS = path.join(SANDBOX, 'node', 'imports.ts');
// As in the WASM guest: the plain forms of what the guest takes from `n8n-workflow`.
const WORKFLOW = path.join(SANDBOX, 'n8n-workflow.ts');
const OUTDIR = path.join(ROOT, 'dist', 'guest');

const contentsOf = (module: string) =>
	module === 'n8n-workflow'
		? `module.exports = require(${JSON.stringify(WORKFLOW)});`
		: `module.exports = require(${JSON.stringify(IMPORTS)}).modules[${JSON.stringify(
				/^n8n:[\w-]+\/([\w-]+)@/.exec(module)?.[1],
			)}];`;

void (async () => {
	await build({
		entryPoints: {
			action: path.join(SANDBOX, 'node', 'main.ts'),
			worker: path.join(SANDBOX, 'node', 'worker-entry.ts'),
		},
		outdir: OUTDIR,
		outExtension: { '.js': '.cjs' },
		bundle: true,
		format: 'cjs',
		platform: 'node',
		target: 'node22',
		charset: 'utf8',
		plugins: [
			{
				name: 'guest-modules',
				setup(bundler) {
					bundler.onResolve({ filter: /^(n8n:.*|n8n-workflow)$/ }, ({ path: module }) => ({
						path: module,
						namespace: 'guest-module',
					}));
					bundler.onLoad({ filter: /.*/, namespace: 'guest-module' }, ({ path: module }) => ({
						contents: contentsOf(module),
						loader: 'js',
						resolveDir: SANDBOX,
					}));
					// As in `scripts/sandbox.ts`: an SDK module that the guest does not use drops out.
					bundler.onResolve({ filter: /^\.\.?\/[\w./-]+$/ }, ({ importer, path: file }) => {
						const resolved = path.resolve(path.dirname(importer), `${file}.ts`);
						return resolved.startsWith(SOURCE) ? { path: resolved, sideEffects: false } : undefined;
					});
				},
			},
		],
	});
	// A CommonJS module gives `undefined` for a missing name, so check what the guest reads.
	const shim = readFileSync(WORKFLOW, 'utf8');
	const read = ['action.cjs', 'worker.cjs'].flatMap((file) => [
		...readFileSync(path.join(OUTDIR, file), 'utf8').matchAll(/import_n8n_workflow\d*\.(\w+)/g),
	]);
	const missing = [...new Set(read.map(([, name = '']) => name))].filter(
		(name) => !new RegExp(`^export (?:const|class) ${name}\\b`, 'm').test(shim),
	);
	if (missing.length > 0)
		throw new Error(`The Node guest needs n8n-workflow ${missing.join(', ')}`);
})();
