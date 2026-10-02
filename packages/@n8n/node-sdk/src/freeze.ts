import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { UnexpectedError, UserError } from 'n8n-workflow';

import type { AnyCredentialType } from './credentials';
import { toContract, type Action, type Trigger } from './define';
import { credentialManifestOf, type CredentialManifest } from './manifest';
import { evaluateBundle, toNodeType } from './runtime';
import { triggerDescriptionOf } from './triggers';
import {
	contractHash,
	manifestKindOf,
	NODE_CONTRACT_VERSION,
	parseSemver,
	requiredNodeContractOf,
	sha256,
	type VersionManifest,
} from './version';

/** The SDK source inlines into each bundle, so a version keeps the SDK helpers it was frozen with. */
const SDK_SOURCE = path.resolve(__dirname, '..', 'src');

/** The `@n8n/node-sdk` version, recorded in each manifest for traceability. */
export function sdkVersion(): string {
	const packageJson: unknown = JSON.parse(
		readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'),
	);
	const version =
		typeof packageJson === 'object' && packageJson !== null && 'version' in packageJson
			? packageJson.version
			: undefined;
	if (typeof version !== 'string') throw new UnexpectedError('@n8n/node-sdk has no version');
	return version;
}

/** `<name>@<major>` of each credential type that has a credential manifest. */
const credentialPinsOf = (action: Action | Trigger) =>
	(action.node.credential?.types ?? []).flatMap(({ name, semver }) =>
		semver === undefined ? [] : [`${name}@${parseSemver(semver).major}`],
	);

/**
 * The globals of Node, and the CommonJS names `__dirname` and `__filename`, that the sandbox guest
 * (StarlingMonkey) does not have. `sandbox.test.ts` checks that the guest has none of them.
 */
export const GUEST_LACKS = [
	'Atomics',
	'BroadcastChannel',
	'Buffer',
	'CloseEvent',
	'Intl',
	'MessageChannel',
	'MessageEvent',
	'MessagePort',
	'Navigator',
	'PerformanceEntry',
	'PerformanceMark',
	'PerformanceMeasure',
	'PerformanceObserver',
	'PerformanceObserverEntryList',
	'PerformanceResourceTiming',
	'SharedArrayBuffer',
	'TextDecoderStream',
	'TextEncoderStream',
	'TransformStreamDefaultController',
	'URLPattern',
	'WebAssembly',
	'WebSocket',
	'WritableStreamDefaultController',
	'WritableStreamDefaultWriter',
	'__dirname',
	'__filename',
	'clearImmediate',
	'global',
	'navigator',
	'process',
	'setImmediate',
] as const;

const LACKS_MARKER = '__n8n_guest_lacks_';

/**
 * What a bundle uses that the sandbox does not have: a module other than `n8n-workflow`, a global
 * of `GUEST_LACKS`, or a Unicode property escape (`\p{…}`). esbuild replaces only a global that
 * no scope binds. A global that the bundle also tests with `typeof` counts as guarded. A name
 * built at run time is not found: the sandbox still stops it.
 */
async function sandboxGapsOf(bundle: string, modules: readonly string[]): Promise<string[]> {
	const { transform } = await import('esbuild');
	const { code } = await transform(bundle, {
		loader: 'js',
		legalComments: 'none',
		define: Object.fromEntries(
			GUEST_LACKS.flatMap((name) => [
				[name, `${LACKS_MARKER}${name}`],
				[`globalThis.${name}`, `${LACKS_MARKER}${name}`],
			]),
		),
	});
	const namesAfter = (prefix: string) =>
		new Set(
			[...code.matchAll(new RegExp(`${prefix}${LACKS_MARKER}(\\w+)`, 'g'))].map(([, name]) => name),
		);
	const guarded = namesAfter('typeof ');
	const globals = [...namesAfter('')].filter((name) => !guarded.has(name));
	return [
		...modules
			.filter((module) => module !== 'n8n-workflow')
			.map((module) => `the module ${module}`),
		...globals.map((name) => `the global ${name}`),
		...(/\\[pP]\{/.test(code)
			? ['a Unicode property escape (\\p{…}) in a regular expression']
			: []),
	];
}

/** A frozen action or trigger in memory: its manifest, its bundle, and what the bundle exports. */
export interface FrozenAction {
	readonly manifest: VersionManifest;
	readonly bundle: string;
	readonly action: Action | Trigger;
}

/**
 * Bundles one exported action or trigger with its helpers and dependencies. The same source gives the
 * same bytes, so a release build reproduces the HEAD bundle the registry holds.
 */
export async function freezeAction(entryFile: string, exportName: string): Promise<FrozenAction> {
	const { build } = await import('esbuild');
	const result = await build({
		stdin: {
			contents: `export { ${exportName} as default } from ${JSON.stringify(entryFile)};`,
			resolveDir: path.dirname(entryFile),
			loader: 'ts',
		},
		bundle: true,
		write: false,
		metafile: true,
		format: 'cjs',
		platform: 'neutral',
		target: 'es2022',
		charset: 'utf8',
		// Comments and layout stay out of the bytes, so only code changes need a new version.
		minifyWhitespace: true,
		// The host provides `n8n-workflow`. Unused SDK modules drop out with their imports.
		external: ['n8n-workflow', 'node:*'],
		plugins: [
			{
				name: 'node-sdk-source',
				setup(bundler) {
					bundler.onResolve({ filter: /^@n8n\/node-sdk(\/credentials)?$/ }, ({ path: name }) => ({
						path: path.join(
							SDK_SOURCE,
							name.endsWith('/credentials') ? 'entry/credentials.ts' : 'index.ts',
						),
						sideEffects: false,
					}));
					bundler.onResolve({ filter: /^\.\.?\/[\w./-]+$/ }, ({ importer, path: file }) => {
						const resolved = path.resolve(path.dirname(importer), `${file}.ts`);
						return importer.startsWith(SDK_SOURCE) && resolved.startsWith(SDK_SOURCE)
							? { path: resolved, sideEffects: false }
							: undefined;
					});
				},
			},
		],
	});
	const bundle = result.outputFiles[0]?.text ?? '';
	const modules = Object.values(result.metafile.outputs).flatMap(({ imports }) =>
		imports.filter(({ external }) => external).map(({ path: module }) => module),
	);
	const gaps = await sandboxGapsOf(bundle, [...new Set(modules)]);
	if (gaps.length > 0) {
		throw new UserError(
			`${exportName} in ${entryFile} uses what the sandbox does not have: ${gaps.join(', ')}. Use web APIs and no Unicode property escapes.`,
		);
	}
	const action = evaluateBundle(bundle, NODE_CONTRACT_VERSION);
	const contract = toContract(action);
	const credentials = credentialPinsOf(action);
	const manifest: VersionManifest = {
		kind: manifestKindOf(contract),
		id: action.id,
		semver: action.semver,
		nodeContract: requiredNodeContractOf(contract, 'list' in action && action.list !== undefined),
		sdk: sdkVersion(),
		...(credentials.length ? { credentials } : {}),
		contractHash: contractHash(contract),
		bundleHash: sha256(bundle),
		contract,
		description:
			'kind' in action ? triggerDescriptionOf(action) : new (toNodeType(action))().description,
	};
	return { manifest, bundle, action };
}

/** Writes `<dir>/<id>/manifest.json` and `bundle.cjs`: the bundled HEAD a package ships. */
export async function writeFrozenAction(dir: string, { manifest, bundle }: FrozenAction) {
	const target = path.join(dir, manifest.id);
	await mkdir(target, { recursive: true });
	await writeFile(path.join(target, 'bundle.cjs'), bundle);
	await writeFile(path.join(target, 'manifest.json'), `${JSON.stringify(manifest, null, '\t')}\n`);
}

/** The credential manifest of a type, or none for a compat type. */
export const freezeCredential = (type: AnyCredentialType) =>
	credentialManifestOf(type, sdkVersion());

/** Writes `<dir>/credentials/<id>/manifest.json`. Action ids have dots, so no action folder has that name. */
export async function writeCredentialManifest(dir: string, manifest: CredentialManifest) {
	const target = path.join(dir, 'credentials', manifest.id);
	await mkdir(target, { recursive: true });
	await writeFile(path.join(target, 'manifest.json'), `${JSON.stringify(manifest, null, '\t')}\n`);
}
