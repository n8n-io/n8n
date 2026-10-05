import { readFileSync } from 'node:fs';
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
import { manifestTextOf, type StoreRecord } from './store';
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
 * no scope binds. A global that the bundle also tests with `typeof` counts as guarded. A name
 * built at run time is not found: the sandbox still stops it.
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
	const namesAfter = (prefix: string) =>
		new Set(
			[...code.matchAll(new RegExp(`${prefix}${LACKS_MARKER}(\\w+)`, 'g'))].map(([, name]) => name),
		);
	const guarded = namesAfter('typeof ');
	const globals = [...namesAfter('')].filter((name) => !guarded.has(name));
	return [
		...modules.filter((module) => !isHostModule(module)).map((module) => `the module ${module}`),
		// The host validates with its own ajv, so a bundle that carries ajv only grows.
		...(inputs.some((input) => /(^|\/)node_modules\/ajv\//.test(input))
			? ['ajv (use validate of @n8n/node-sdk: the host gives it)']
			: []),
		...globals.map((name) => `the global ${name}`),
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
