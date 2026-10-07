// Builds the sandbox: the generic JS guest component of each kind interface
// (`sandbox/dist/action.wasm`, `provider.wasm` and `trigger.wasm`) and the wasmtime sidecar
// (`sandbox/sidecar/target/release/n8n-sandbox`). A dev step: it needs cargo and fetches
// ComponentizeJS with npx. Usage: `pnpm sandbox:build [guest|sidecar]`.
// It also writes `sandbox/dist/action-snapshot.js`, the template of the per-bundle snapshot guests
// of `scripts/snapshot-bundle.ts`, so a snapshot always comes from the same build as the guests.
import { execFile, execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, promises, readFileSync, realpathSync, rmSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const ROOT = path.resolve(__dirname, '..');
const SANDBOX = path.join(ROOT, 'sandbox');
const DIST = path.join(SANDBOX, 'dist');
const COMPONENTIZE = '@bytecodealliance/componentize-js@0.23.0';
const UNAVAILABLE = 'n8n-guest-unavailable';

/** The identifier in `action-snapshot.js` that `snapshot-bundle.ts` replaces with the bundle code. */
export const SNAPSHOT_BUNDLE = 'N8N_SNAPSHOT_BUNDLE_SOURCE';
export const SNAPSHOT_SDK = 'N8N_SNAPSHOT_SDK_SOURCE';

/** The guest of each kind interface: its entry in `sandbox/` and its world in `wit/guest.wit`. */
const GUESTS = {
	action: 'n8n:js-guest/action-js',
	provider: 'n8n:js-guest/provider-js',
	trigger: 'n8n:js-guest/trigger-js',
};

// The ComponentizeJS 0.23 glue measures each string that the guest gives to the host with a JS
// loop for each character. This is slow for large outputs, so the glue uses `TextEncoder.encode`.
// The replacement does not give `codepoints`, so the build fails when the glue reads it.
const SLOW_UTF8 = /function _utf8AllocateAndEncode\(s, realloc, memory\) \{[\s\S]*?\n\}\n/;
const FAST_UTF8 = `function _utf8AllocateAndEncode(s, realloc, memory) {
  if (typeof s !== 'string') throw new TypeError('expected a string, received [' + typeof s + ']');
  if (s.length === 0) return { ptr: 1, len: 0 };
  const bytes = TEXT_ENCODER_UTF8.encode(s);
  const ptr = realloc(0, 0, 1, bytes.length);
  new Uint8Array(memory.buffer, ptr, bytes.length).set(bytes);
  return { ptr, len: bytes.length };
}
`;

interface Componentize {
	componentize(options: {
		sourcePath: string;
		witPath: string;
		worldName: string;
		disableFeatures: string[];
	}): Promise<{ component: Uint8Array }>;
}

/** The `componentize.js` of the ComponentizeJS package in the npx cache. */
export async function componentizeJsPath() {
	const { stdout } = await promisify(execFile)(
		'npx',
		['--yes', '-p', COMPONENTIZE, '-c', 'command -v componentize-js'],
		{ encoding: 'utf8' },
	);
	return path.join(path.dirname(realpathSync(stdout.trim())), 'componentize.js');
}

export interface Componentization {
	readonly kind: keyof typeof GUESTS;
	/** The JS of the guest. */
	readonly guest: string;
	/** The WIT directory of `buildGuests`, with the spec in `deps`. */
	readonly wit: string;
	/** The component file to write. */
	readonly out: string;
	readonly componentizeJs?: string;
}

/** Runs ComponentizeJS in this process, so the build can replace its string glue. */
export async function componentize({ kind, guest, wit, out, componentizeJs }: Componentization) {
	const api: Componentize = await import(
		pathToFileURL(componentizeJs ?? (await componentizeJsPath())).href
	);
	const { writeFile } = promises;
	let patched = false;
	const patchedWriteFile: typeof writeFile = async (file, data, options) => {
		if (typeof file !== 'string' || !file.endsWith('/initializer.js')) {
			return await writeFile(file, data, options);
		}
		if (typeof data !== 'string' || !SLOW_UTF8.test(data) || data.includes('.codepoints')) {
			throw new Error('The ComponentizeJS string glue changed, so update FAST_UTF8');
		}
		patched = true;
		return await writeFile(file, data.replace(SLOW_UTF8, FAST_UTF8), options);
	};
	Object.defineProperty(promises, 'writeFile', { value: patchedWriteFile });
	syncBuiltinESMExports();
	try {
		// `random` and `clocks` stay on: the sidecar links `wasi:random` to the OS random source
		// and `wasi:clocks` to the host clocks, coarsened to 1 ms.
		const { component } = await api.componentize({
			sourcePath: guest,
			witPath: wit,
			worldName: GUESTS[kind],
			disableFeatures: ['stdio', 'http', 'fetch-event'],
		});
		if (!patched) throw new Error('ComponentizeJS wrote no initializer.js, so update FAST_UTF8');
		await writeFile(out, component);
	} finally {
		Object.defineProperty(promises, 'writeFile', { value: writeFile });
		syncBuiltinESMExports();
	}
}

/** The JS of a guest: its entry in `sandbox/` with the SDK modules it uses, as one ES module. */
async function bundleGuest(name: string, guest: string) {
	const { build } = await import('esbuild');
	const source = path.join(ROOT, 'src');
	const hostValidator = path.join(source, 'validator.ts');
	const guestValidator = path.join(SANDBOX, 'validator.ts');
	await build({
		entryPoints: [path.join(SANDBOX, `${name}.ts`)],
		outfile: guest,
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		target: 'es2022',
		charset: 'utf8',
		external: ['node:*', 'n8n-workflow'],
		plugins: [
			{
				// As in `packAction`: an SDK module that the guest does not use drops out.
				name: 'node-sdk-source',
				setup(bundler) {
					bundler.onResolve({ filter: /^\.\.?\/[\w./-]+$/ }, ({ importer, path: file }) => {
						const resolved = path.resolve(path.dirname(importer), `${file}.ts`);
						if (!resolved.startsWith(source)) return undefined;
						// ajv stays in the host: the guest validates through the `schema` import.
						return {
							path: resolved === hostValidator ? guestValidator : resolved,
							sideEffects: false,
						};
					});
					// A world import that no kept code reads drops out, so each guest imports only
					// what its world has.
					bundler.onResolve({ filter: /^n8n:/ }, ({ path: module }) => ({
						path: module,
						external: true,
						sideEffects: false,
					}));
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
	if (unavailable.length > 0) throw new Error(`The ${name} guest needs ${unavailable.join(', ')}`);
}

async function buildGuests() {
	mkdirSync(DIST, { recursive: true });
	const wit = path.join(DIST, 'wit');
	rmSync(wit, { recursive: true, force: true });
	cpSync(path.join(SANDBOX, 'wit'), wit, { recursive: true });
	cpSync(path.join(ROOT, 'spec', 'wit'), path.join(wit, 'deps', 'node-contract'), {
		recursive: true,
	});
	for (const kind of ['action', 'provider', 'trigger'] as const) {
		const guest = path.join(DIST, `${kind}.js`);
		await bundleGuest(kind, guest);
		await componentize({ kind, guest, wit, out: path.join(DIST, `${kind}.wasm`) });
	}
	const template = path.join(DIST, 'action-snapshot.js');
	await bundleGuest('snapshot-entry', template);
	const text = readFileSync(template, 'utf8');
	if ([SNAPSHOT_BUNDLE, SNAPSHOT_SDK].some((name) => text.split(name).length !== 2)) {
		throw new Error(`${template} must name ${SNAPSHOT_BUNDLE} and ${SNAPSHOT_SDK} once`);
	}
}

function buildSidecar() {
	execFileSync('cargo', ['build', '--release'], {
		cwd: path.join(SANDBOX, 'sidecar'),
		stdio: 'inherit',
	});
}

if (require.main === module) {
	const step = process.argv[2];
	void (async () => {
		if (step !== 'sidecar') await buildGuests();
		if (step !== 'guest') buildSidecar();
	})();
}
