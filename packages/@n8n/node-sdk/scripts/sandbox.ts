// Builds the sandbox: the generic JS guest component (`sandbox/dist/guest.wasm`) and the
// wasmtime sidecar (`sandbox/sidecar/target/release/n8n-sandbox`). A dev step: it needs
// cargo and fetches ComponentizeJS with npx. Usage: `pnpm sandbox:build [guest|sidecar]`.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SANDBOX = path.join(ROOT, 'sandbox');
const DIST = path.join(SANDBOX, 'dist');
const COMPONENTIZE = '@bytecodealliance/componentize-js@0.23.0';
const UNAVAILABLE = 'n8n-guest-unavailable';

async function buildGuest() {
	const { build } = await import('esbuild');
	mkdirSync(DIST, { recursive: true });
	const source = path.join(ROOT, 'src');
	const guest = path.join(DIST, 'guest.js');
	await build({
		entryPoints: [path.join(SANDBOX, 'guest.ts')],
		outfile: guest,
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		target: 'es2022',
		charset: 'utf8',
		external: ['n8n:*', 'node:*', 'n8n-workflow'],
		plugins: [
			{
				// As in `freezeAction`: an SDK module that the guest does not use drops out.
				name: 'node-sdk-source',
				setup(bundler) {
					bundler.onResolve({ filter: /^\.\.?\/[\w./-]+$/ }, ({ importer, path: file }) => {
						const resolved = path.resolve(path.dirname(importer), `${file}.ts`);
						return resolved.startsWith(source) ? { path: resolved, sideEffects: false } : undefined;
					});
				},
			},
		],
	});
	// The first pass keeps each import of a host module, also where no kept code reads it. The
	// second pass resolves them: `n8n-workflow` to the guest forms, any other name to a marker,
	// so a kept read of a name that the guest lacks fails the build.
	const first = readFileSync(guest, 'utf8');
	const shim = path.join(SANDBOX, 'n8n-workflow.ts');
	const shimNames = new Set(
		[...readFileSync(shim, 'utf8').matchAll(/^export (?:const|class) (\w+)/gm)].map(
			([, name]) => name,
		),
	);
	const importedNames = (module: string) =>
		[...first.matchAll(/import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/g)]
			.filter(([, , from]) => from === module)
			.flatMap(([, names = '']) => names.split(','))
			.map((name) => name.trim().split(/\s+as\s+/)[0] ?? '')
			.filter((name) => name !== '');
	await build({
		entryPoints: [guest],
		outfile: guest,
		allowOverwrite: true,
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		target: 'es2022',
		charset: 'utf8',
		external: ['n8n:*'],
		plugins: [
			{
				name: 'host-modules',
				setup(bundler) {
					bundler.onResolve({ filter: /^(node:.*|n8n-workflow)$/ }, ({ path: module }) => ({
						path: module,
						namespace: 'host-module',
					}));
					bundler.onLoad({ filter: /.*/, namespace: 'host-module' }, ({ path: module }) => {
						const own = module === 'n8n-workflow' ? shimNames : new Set<string>();
						const missing = [...new Set(importedNames(module))].filter((name) => !own.has(name));
						return {
							contents: [
								...(own.size > 0 ? [`export * from ${JSON.stringify(shim)};`] : []),
								...missing.map(
									(name) => `export const ${name} = "${UNAVAILABLE}:${module}:${name}";`,
								),
							].join('\n'),
							loader: 'ts',
							resolveDir: SANDBOX,
						};
					});
				},
			},
		],
	});
	const code = readFileSync(guest, 'utf8');
	const unavailable = [...code.matchAll(new RegExp(`${UNAVAILABLE}:([^"]+)`, 'g'))].map(
		([, name]) => name,
	);
	if (unavailable.length > 0) throw new Error(`The guest needs ${unavailable.join(', ')}`);
	const wit = path.join(DIST, 'wit');
	rmSync(wit, { recursive: true, force: true });
	cpSync(path.join(SANDBOX, 'wit'), wit, { recursive: true });
	cpSync(path.join(ROOT, 'spec', 'wit'), path.join(wit, 'deps', 'node-contract'), {
		recursive: true,
	});
	// `random` stays on: the sidecar links `wasi:random` to the OS random source.
	execFileSync(
		'npx',
		[
			'--yes',
			COMPONENTIZE,
			guest,
			'--wit',
			wit,
			'--world-name',
			'n8n:js-guest/action-js',
			'--disable',
			'stdio',
			'clocks',
			'http',
			'fetch-event',
			'--out',
			path.join(DIST, 'guest.wasm'),
		],
		{ stdio: 'inherit' },
	);
}

function buildSidecar() {
	execFileSync('cargo', ['build', '--release'], {
		cwd: path.join(SANDBOX, 'sidecar'),
		stdio: 'inherit',
	});
}

const step = process.argv[2];
void (async () => {
	if (step !== 'sidecar') await buildGuest();
	if (step !== 'guest') buildSidecar();
})();
