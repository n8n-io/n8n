import { isRecord } from '@n8n/utils/is-record';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { UnexpectedError, UserError } from 'n8n-workflow';

import type { AnyCredentialType } from './credentials';
import { replyContractOf, toContract, type Action, type Trigger } from './define';
import {
	actionUiSchema,
	credentialManifestOf,
	type CredentialManifest,
	type NativeManifest,
} from './manifest';
import { evaluateBundle, isHostModule, VALIDATOR_MODULE } from './runtime';
import {
	addToStore,
	embeddedStoreDirOf,
	manifestTextOf,
	storeFilesOfUrl,
	storeReader,
	type SourcePackage,
	type StoreReader,
	type StoreRecord,
} from './store';
import { matches } from './validate';
import {
	compareSemver,
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

/** The SDK module that the host gives each bundle as `VALIDATOR_MODULE`, with ajv. */
const VALIDATOR_SOURCE = path.join(SDK_SOURCE, 'validator.ts');

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

/** `<id>@<major>` of each credential type that has a credential manifest. */
const credentialPinsOf = (action: Action | Trigger) =>
	(action.node.credential?.types ?? []).flatMap(({ id, semver }) =>
		semver === undefined ? [] : [`${id}@${parseSemver(semver).major}`],
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

/**
 * The globals that freeze refuses. The guest has `fetch` and the timers only as stubs that throw.
 * In the n8n process, `fetch` sends a request past the egress check of the host, and a timer
 * runs code after the run.
 */
const REFUSED_GLOBALS = [...GUEST_LACKS, 'fetch', 'setTimeout', 'setInterval'];

const LACKS_MARKER = '__n8n_guest_lacks_';

/**
 * What a bundle may not use: a module that the host does not give, ajv, a global
 * of `REFUSED_GLOBALS`, or a Unicode property escape (`\p{…}`). esbuild replaces only a global that
 * no scope binds. A use counts as guarded only where a `typeof` test of the global skips it when
 * the global is missing. A name built at run time is not found: the sandbox still stops it.
 */
async function sandboxGapsOf(
	bundle: string,
	modules: readonly string[],
	inputs: readonly string[],
): Promise<string[]> {
	const { transform } = await import('esbuild');
	const { code } = await transform(bundle, {
		loader: 'js',
		legalComments: 'none',
		define: Object.fromEntries(
			REFUSED_GLOBALS.flatMap((name) => [
				[name, `${LACKS_MARKER}${name}`],
				[`globalThis.${name}`, `${LACKS_MARKER}${name}`],
			]),
		),
	});
	// Each `typeof` test gives "undefined", as for a missing global, so esbuild drops the code that
	// the test guards. A use that stays runs also when the global is missing.
	const { code: unguarded } = await transform(
		code.replace(new RegExp(`typeof ${LACKS_MARKER}\\w+`, 'g'), '"undefined"'),
		{ loader: 'js', minifySyntax: true },
	);
	const globals = new Set(
		[...unguarded.matchAll(new RegExp(`${LACKS_MARKER}(\\w+)`, 'g'))].map(([, name]) => name),
	);
	return [
		...modules.filter((module) => !isHostModule(module)).map((module) => `the module ${module}`),
		// The host validates with its own ajv, so a bundle that carries ajv only grows.
		...(inputs.some((input) => /(^|\/)node_modules\/ajv\//.test(input))
			? ['ajv (use validate of @n8n/node-sdk: the host gives it)']
			: []),
		...[...globals].map((name) => `the global ${name}`),
		...(/\\[pP]\{/.test(code)
			? ['a Unicode property escape (\\p{…}) in a regular expression']
			: []),
	];
}

/** A frozen action or trigger in memory: its manifest, its bundle, and what the bundle exports. */
export interface FrozenAction {
	/** The version manifest of the bundle. */
	readonly manifest: VersionManifest;
	/** The bundle code. */
	readonly bundle: string;
	/** The action or trigger that the bundle exports. */
	readonly action: Action | Trigger;
}

/**
 * The index line of the newest frozen version of an id in one major and minor, e.g. the newest
 * published one. Freeze computes the patch from it.
 */
export type LastVersionOf = (
	id: string,
	major: number,
	minor: number,
) => Promise<Pick<StoreRecord, 'version' | 'manifest' | 'bundle'> | undefined>;

/**
 * The source holds the major and the minor, because they are decisions. The patch follows the
 * last version: the same content keeps its version, other content takes the next patch. The
 * content of a version with a bundle is the bundle; of any other version, the manifest. A change
 * without a new minor also takes the next patch, and the publish gate refuses it.
 */
async function semverOf(
	{ id, major, minor }: { readonly id: string; readonly major: number; readonly minor: number },
	lastOf: LastVersionOf | undefined,
	isSame: (last: Pick<StoreRecord, 'manifest' | 'bundle'>, version: string) => boolean,
) {
	const last = await lastOf?.(id, major, minor);
	if (!last) return `${major}.${minor}.0`;
	const previous = parseSemver(last.version);
	const patch =
		previous.major !== major || previous.minor !== minor
			? 0
			: previous.patch + (isSame(last, last.version) ? 0 : 1);
	return `${major}.${minor}.${patch}`;
}

const manifestDigestOf = (manifest: CredentialManifest | NativeManifest) =>
	`sha256:${sha256(manifestTextOf(manifest))}`;

/** The version of a manifest without a bundle: the same manifest bytes keep the last version. */
async function bundleLessSemverOf<M extends CredentialManifest | NativeManifest>(
	manifestAt: (semver: string) => M,
	major: number,
	minor: number,
	lastOf: LastVersionOf | undefined,
): Promise<M> {
	const { id } = manifestAt(`${major}.${minor}.0`);
	const semver = await semverOf(
		{ id, major, minor },
		lastOf,
		(last, version) => last.manifest === manifestDigestOf(manifestAt(version)),
	);
	return manifestAt(semver);
}

/**
 * Bundles one exported action or trigger with its helpers and dependencies. The same source gives the
 * same bytes, so a release build reproduces the HEAD bundle the registry holds. Without `lastOf`,
 * no version is frozen before, so the patch is 0.
 */
export async function freezeAction(
	entryFile: string,
	exportName: string,
	lastOf?: LastVersionOf,
): Promise<FrozenAction> {
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
		// The neutral platform reads no main field, so a package without `exports` would not resolve.
		// The guest has web APIs and no Node builtins, so the browser build of a package comes first.
		mainFields: ['browser', 'module', 'main'],
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
						if (!importer.startsWith(SDK_SOURCE) || !resolved.startsWith(SDK_SOURCE)) {
							return undefined;
						}
						return resolved === VALIDATOR_SOURCE
							? { path: VALIDATOR_MODULE, external: true, sideEffects: false }
							: { path: resolved, sideEffects: false };
					});
				},
			},
		],
	});
	const bundle = result.outputFiles[0]?.text ?? '';
	const modules = Object.values(result.metafile.outputs).flatMap(({ imports }) =>
		imports.filter(({ external }) => external).map(({ path: module }) => module),
	);
	const imported = [...new Set(modules)];
	const gaps = await sandboxGapsOf(bundle, imported, Object.keys(result.metafile.inputs));
	if (gaps.length > 0) {
		throw new UserError(
			`${exportName} in ${entryFile} uses what a bundle may not use: ${gaps.join(', ')}. Use web APIs, http.request for requests, no timers, and no Unicode property escapes.`,
		);
	}
	const action = evaluateBundle(bundle, NODE_CONTRACT_VERSION);
	const runtime = 'runtime' in action ? action.runtime : undefined;
	// A tag can point to other bytes later, so only a digest pins what the version runs.
	if (runtime && !/@sha256:[0-9a-f]{64}$/.test(runtime.image)) {
		throw new UserError(
			`${exportName} in ${entryFile} needs the image ${runtime.image}. Pin it by digest: <ref>@sha256:<digest>.`,
		);
	}
	const contract = toContract(action);
	const ui = 'ui' in action ? action.ui : undefined;
	if (ui !== undefined && !matches(actionUiSchema, ui)) {
		throw new UserError(`${exportName} in ${entryFile} has a ui block that is not valid`);
	}
	const credentials = credentialPinsOf(action);
	const bundleHash = sha256(bundle);
	const semver = await semverOf(
		{ id: action.id, major: action.version, minor: action.minor ?? 0 },
		lastOf,
		(last) => last.bundle === `sha256:${bundleHash}`,
	);
	const required = requiredNodeContractOf(contract, 'list' in action && action.list !== undefined);
	const manifest: VersionManifest = {
		kind: manifestKindOf(contract),
		id: action.id,
		semver,
		// The host gives the validator module since 2.9.0.
		nodeContract:
			imported.includes(VALIDATOR_MODULE) && compareSemver(required, '2.9.0') < 0
				? '2.9.0'
				: required,
		sdk: sdkVersion(),
		...(credentials.length ? { credentials } : {}),
		contractHash: contractHash(contract),
		bundleHash,
		contract,
		...(ui ? { ui } : {}),
	};
	return { manifest, bundle, action };
}

/**
 * The credential manifest of a type, or none for a compat type. The type gives the major and the
 * minor; the patch follows `lastOf`, as for an action.
 */
export async function freezeCredential(
	type: AnyCredentialType,
	lastOf?: LastVersionOf,
): Promise<CredentialManifest | undefined> {
	const sdk = sdkVersion();
	const head = credentialManifestOf(type, sdk);
	if (!head) return undefined;
	const { major, minor } = parseSemver(head.semver);
	return await bundleLessSemverOf((semver) => ({ ...head, semver }), major, minor, lastOf);
}

/**
 * The manifest of a native action or trigger: its contract and the legacy node that runs it. It
 * has no bundle. The patch follows `lastOf`, as for an action.
 *
 * @throws a `UserError` for a contract that is not native.
 */
export async function freezeNative(
	source: Action | Trigger,
	lastOf?: LastVersionOf,
): Promise<NativeManifest> {
	const binding = source.native;
	const contract = toContract(source);
	const kind = manifestKindOf(contract);
	if (!binding || kind === 'provider') {
		throw new UserError(`${source.id} is not a native action or trigger`);
	}
	const credentials = credentialPinsOf(source);
	const trigger = 'kind' in source && source.kind === 'native' ? source : undefined;
	const reply = trigger?.reply;
	const replyContract = trigger && replyContractOf(trigger);
	const sdk = sdkVersion();
	const manifestAt = (semver: string): NativeManifest => ({
		kind,
		id: source.id,
		semver,
		nodeContract: '2.5.0',
		sdk,
		...(credentials.length ? { credentials } : {}),
		contractHash: contractHash(contract),
		contract,
		native: { type: binding.type, version: binding.version },
		...(reply && replyContract
			? {
					reply: {
						contract: replyContract,
						native: { type: reply.native.type, version: reply.native.version },
						...(reply.awaits ? { awaits: reply.awaits } : {}),
					},
				}
			: {}),
	});
	return await bundleLessSemverOf(manifestAt, source.version, source.minor ?? 0, lastOf);
}

/** The index line of the newest version of an id in one major and minor in a store. It reads the index only. */
export const lastPublishedIn =
	(store: StoreReader): LastVersionOf =>
	async (id, major, minor) =>
		(await store.records(id))
			.filter(({ version }) => {
				const semver = parseSemver(version);
				return semver.major === major && semver.minor === minor;
			})
			.sort((a, b) => compareSemver(a.version, b.version))
			.at(-1);

/**
 * The credential types of contracts that are not compat types, one for each id. Each one has a
 * credential manifest.
 */
export const credentialTypesOf = (
	contracts: ReadonlyArray<Action | Trigger>,
): AnyCredentialType[] =>
	// Two module loads give two objects for one type, so the key is the id.
	[
		...new Map(
			contracts.flatMap(({ node }) => node.credential?.types ?? []).map((type) => [type.id, type]),
		).values(),
	].filter(({ scheme }) => scheme.kind !== 'compat');

/** The source file and the export name of an action or a trigger with a bundle. */
export interface ActionEntry {
	/** The source file, e.g. `src/nodes/no-op/actions/pass.ts`. */
	readonly entryFile: string;
	/** The export name of the action in `entryFile`, e.g. `passItems`. */
	readonly exportName: string;
	/** The action or trigger. */
	readonly action: Action | Trigger;
}

/** The contracts of a source package, as its action files export them. */
export interface PackageContracts {
	/** Each action and trigger with a bundle. */
	readonly entries: readonly ActionEntry[];
	/** The contracts that a legacy node runs. They have a manifest and no bundle. */
	readonly natives: ReadonlyArray<Action | Trigger>;
}

// A built contract has these fields; other exports of an action file are helpers.
const isContractExport = (value: unknown): value is Action | Trigger =>
	isRecord(value) &&
	typeof value.id === 'string' &&
	typeof value.version === 'number' &&
	isRecord(value.inputSchema) &&
	isRecord(value.node);

/**
 * The contracts of a package: the exports of its `src/nodes/<node>/actions/*.ts` files. An
 * action file without a contract export is an error, because freeze would drop it without a
 * sign. Two exports of one id and major are an error, because freeze would write two versions
 * for one.
 */
export async function contractsOfPackage(
	pkg: Pick<SourcePackage, 'name' | 'dir'>,
): Promise<PackageContracts> {
	const nodesDir = path.join(pkg.dir, 'src', 'nodes');
	const files = readdirSync(nodesDir, { recursive: true, encoding: 'utf8' }).filter(
		(file) => path.basename(path.dirname(file)) === 'actions' && file.endsWith('.ts'),
	);
	// tsx loads TypeScript in any caller: a tsx script, vitest or plain Node.
	const { require: tsxRequire } = await import('tsx/cjs/api');
	const found = files.flatMap((file) => {
		const entryFile = path.join(nodesDir, file);
		const module: unknown = tsxRequire(entryFile, __filename);
		return (isRecord(module) ? Object.entries(module) : []).flatMap(([exportName, action]) =>
			isContractExport(action) ? [{ file, entryFile, exportName, action }] : [],
		);
	});
	const empty = files.filter((file) => !found.some((entry) => entry.file === file));
	if (empty.length > 0) {
		throw new UserError(
			`These action files of ${pkg.name} export no action or trigger: ${empty.join(', ')}.`,
		);
	}
	const keyOf = ({ action }: (typeof found)[number]) => `${action.id}@${action.version}`;
	const repeated = [...new Set(found.map(keyOf))].flatMap((key) => {
		const exports = found.filter((entry) => keyOf(entry) === key);
		return exports.length > 1
			? [`${key} (${exports.map(({ file, exportName }) => `${file}#${exportName}`).join(', ')})`]
			: [];
	});
	if (repeated.length > 0) {
		throw new UserError(
			`These contracts of ${pkg.name} have more than one export: ${repeated.join('; ')}. Export each action once.`,
		);
	}
	return {
		entries: found.flatMap(({ entryFile, exportName, action }) =>
			action.native ? [] : [{ entryFile, exportName, action }],
		),
		natives: found.flatMap(({ action }) => (action.native ? [action] : [])),
	};
}

/** The manifests that `freezePackage` writes. */
export interface FrozenPackage {
	/** The manifest of the HEAD of each action and trigger with a bundle. */
	readonly manifests: readonly VersionManifest[];
	/** The manifest of each credential type that is not a compat type. */
	readonly credentials: readonly CredentialManifest[];
	/** The manifest of each native contract. */
	readonly natives: readonly NativeManifest[];
}

/**
 * Freezes the HEAD of each action, trigger, credential type and native contract of a package
 * into the store in `outDir`, by default the embedded store of the package. It replaces the
 * store in `outDir`: n8n loads every version there, so a removed contract must not stay from an
 * older build. The registry is the one record of published patches: with
 * `N8N_NODE_CONTRACTS_REGISTRY_URL`, each patch follows the newest published one, and without
 * it, each HEAD is patch 0. It finds the contracts in the action files (`contractsOfPackage`).
 */
export async function freezePackage(
	pkg: Pick<SourcePackage, 'name' | 'dir'>,
	outDir = embeddedStoreDirOf(pkg),
): Promise<FrozenPackage> {
	const registryUrl = process.env.N8N_NODE_CONTRACTS_REGISTRY_URL;
	const lastOf = registryUrl
		? lastPublishedIn(storeReader(storeFilesOfUrl(registryUrl, async (url) => await fetch(url))))
		: undefined;
	const { entries, natives: sources } = await contractsOfPackage(pkg);
	const types = credentialTypesOf([...entries.map(({ action }) => action), ...sources]);
	const [frozen, credentials, natives] = await Promise.all([
		Promise.all(
			entries.map(
				async ({ entryFile, exportName }) => await freezeAction(entryFile, exportName, lastOf),
			),
		),
		Promise.all(types.map(async (type) => await freezeCredential(type, lastOf))),
		Promise.all(sources.map(async (native) => await freezeNative(native, lastOf))),
	]);
	const credentialManifests = credentials.flatMap((manifest) => manifest ?? []);
	rmSync(outDir, { recursive: true, force: true });
	await addToStore(outDir, [
		...frozen.map(({ manifest, bundle }) => ({ manifestText: manifestTextOf(manifest), bundle })),
		...[...credentialManifests, ...natives].map((manifest) => ({
			manifestText: manifestTextOf(manifest),
		})),
	]);
	return {
		manifests: frozen.map(({ manifest }) => manifest),
		credentials: credentialManifests,
		natives,
	};
}
