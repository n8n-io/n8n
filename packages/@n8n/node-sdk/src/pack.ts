import { isRecord } from '@n8n/utils/is-record';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import type { BuildOptions, BuildResult, Plugin } from 'esbuild';
import path from 'node:path';
import { toHostname, UnexpectedError, UserError } from 'n8n-workflow';
import { validRange } from 'semver';

import type { AnyCredentialType } from './credentials';
import { replyContractOf, toContract, type Action, type Trigger } from './define';
import { allowsHost } from './egress';
import {
	credentialDataOf,
	extendedConfig,
	httpGuestActionOf,
	liftHttpGuest,
	parseHttpGuestConfig,
	type HttpGuestConfig,
	type ParentNode,
} from './lift/http';
import {
	actionUiSchema,
	credentialManifestOf,
	parseCredentialManifest,
	SDK_RUNTIME_ID,
	type CredentialManifest,
	type NativeManifest,
	type SdkManifest,
} from './manifest';
import { DEFAULT_NPM_SCOPE, npmDigestOf, npmRegistryOf, npmStoreReader } from './npm';
import { evaluateBundle, isHostModule, SDK_MODULES, VALIDATOR_MODULE } from './runtime';
import {
	addToStore,
	embeddedStoreDirOf,
	manifestTextOf,
	type SourcePackage,
	type StoreManifest,
	type StoreReader,
	type StoreVersion,
	verifyStoreSignature,
} from './store';
import { matches } from './validate';
import {
	compareSemver,
	contractHash,
	HTTP_GUEST_NODE_CONTRACT,
	manifestKindOf,
	NODE_CONTRACT_VERSION,
	parseManifest,
	parseNativeManifest,
	requiredNodeContractOf,
	sha256,
	type NodeContractVersion,
	type VersionManifest,
} from './version';
import { canonicalJson } from './schema';

/** The SDK source that the SDK runtime bundles. */
const SDK_SOURCE = path.resolve(__dirname, '..', 'src');

/** The SDK module that the host gives each bundle as `VALIDATOR_MODULE`, with ajv. */
const VALIDATOR_SOURCE = path.join(SDK_SOURCE, 'validator.ts');

/** The `@n8n/node-sdk` version: the version of the SDK runtime. */
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

/**
 * The semver range of each credential type that has a credential manifest, by id: the range of
 * `.range()`, else `^<version>`. `undefined` when no type has a manifest.
 */
function credentialPinsOf(action: Action | Trigger): Record<string, string> | undefined {
	const pins = (action.node.credential?.types ?? []).flatMap(
		({ id, scheme, semver, versionRange }): Array<[string, string]> => {
			if (scheme.kind === 'compat') return [];
			if (semver === undefined) throw new UserError(`The credential ${id} has no version`);
			const range = versionRange ?? `^${semver}`;
			if (validRange(range) === null) {
				throw new UserError(`The range ${range} of the credential ${id} is not valid`);
			}
			return [[id, range]];
		},
	);
	return pins.length > 0 ? Object.fromEntries(pins) : undefined;
}

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
 * The globals that pack refuses. The guest has `fetch` and the timers only as stubs that throw.
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
		...modules
			.filter((module) => !isHostModule(module) && !SDK_MODULES.includes(module))
			.map((module) => `the module ${module}`),
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

/** A packed action or trigger in memory: its manifest, its bundle, and what the bundle exports. */
export interface PackedAction {
	/** The version manifest of the bundle. */
	readonly manifest: VersionManifest;
	/** The bundle code. */
	readonly bundle: string;
	/** The SDK runtime bundle that `manifest.sdk` pins. An HTTP guest config has none. */
	readonly sdk?: string;
	/** The action or trigger that the bundle exports. */
	readonly action: Action | Trigger;
}

/** The SDK runtime in memory: its manifest and its bundle. */
export interface PackedSdkRuntime {
	/** The manifest of the runtime. */
	readonly manifest: SdkManifest;
	/** The runtime code. Its default export is `{ root, credentials }`. */
	readonly bundle: string;
}

/** The Node Contract version that added the SDK runtime. */
const SDK_NODE_CONTRACT: NodeContractVersion = '2.11.0';

/** The Node Contract version that pins credential types by semver range. */
const CREDENTIAL_RANGES_NODE_CONTRACT: NodeContractVersion = '2.12.0';

/** The build settings of a bundle and of the SDK runtime. The same source gives the same bytes. */
const BUILD_OPTIONS = {
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
} as const satisfies BuildOptions;

/** Keeps the SDK `validator` module out of the bytes: the host gives it as `VALIDATOR_MODULE`. */
const sdkSourcePlugin: Plugin = {
	name: 'node-sdk-source',
	setup(bundler) {
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
};

/** The modules that a build leaves to the host. */
const externalsOf = ({ metafile }: BuildResult<{ metafile: true }>) => [
	...new Set(
		Object.values(metafile.outputs).flatMap(({ imports }) =>
			imports.filter(({ external }) => external).map(({ path: module }) => module),
		),
	),
];

/**
 * Bundles `@n8n/node-sdk` and `@n8n/node-sdk/credentials` as one runtime, which the host gives
 * each bundle as `SDK_MODULES`. The same source gives the same bytes, so a new SDK version
 * with the same code keeps the digest.
 */
export async function packSdkRuntime(version = sdkVersion()): Promise<PackedSdkRuntime> {
	const { build } = await import('esbuild');
	const [root, credentials] = ['index.ts', 'entry/credentials.ts'].map((file) =>
		JSON.stringify(path.join(SDK_SOURCE, file)),
	);
	const result = await build({
		...BUILD_OPTIONS,
		stdin: {
			contents: `import * as root from ${root};\nimport * as credentials from ${credentials};\nexport default { root, credentials };`,
			resolveDir: SDK_SOURCE,
			loader: 'ts',
		},
		external: ['n8n-workflow', 'node:*'],
		plugins: [sdkSourcePlugin],
	});
	const bundle = result.outputFiles[0]?.text ?? '';
	const gaps = await sandboxGapsOf(
		bundle,
		externalsOf(result),
		Object.keys(result.metafile.inputs),
	);
	if (gaps.length > 0) {
		throw new UnexpectedError(`The SDK runtime uses what a bundle may not use: ${gaps.join(', ')}`);
	}
	return {
		manifest: {
			kind: 'sdk',
			id: SDK_RUNTIME_ID,
			semver: version,
			nodeContract: SDK_NODE_CONTRACT,
			bundleHash: sha256(bundle),
		},
		bundle,
	};
}

/** The version that the source sets. Only an action that the host makes has none. */
const semverOf = (source: Action | Trigger) => source.semver ?? `${source.version}.0.0`;

/**
 * Bundles one exported action or trigger with its helpers and dependencies. The same source gives the
 * same bytes, so a release build reproduces the HEAD bundle the registry holds. The bundle imports
 * the SDK from the host, and its manifest pins `sdk`. Default: the SDK runtime of this source.
 */
export async function packAction(
	entryFile: string,
	exportName: string,
	sdk?: PackedSdkRuntime,
): Promise<PackedAction> {
	const { build } = await import('esbuild');
	const result = await build({
		...BUILD_OPTIONS,
		stdin: {
			contents: `export { ${exportName} as default } from ${JSON.stringify(entryFile)};`,
			resolveDir: path.dirname(entryFile),
			loader: 'ts',
		},
		// The host provides `n8n-workflow` and the SDK runtime.
		external: ['n8n-workflow', 'node:*', ...SDK_MODULES],
		plugins: [sdkSourcePlugin],
	});
	const bundle = result.outputFiles[0]?.text ?? '';
	const imported = externalsOf(result);
	const gaps = await sandboxGapsOf(bundle, imported, Object.keys(result.metafile.inputs));
	if (gaps.length > 0) {
		throw new UserError(
			`${exportName} in ${entryFile} uses what a bundle may not use: ${gaps.join(', ')}. Use web APIs, http.request for requests, no timers, and no Unicode property escapes.`,
		);
	}
	const usesSdk = imported.some((module) => SDK_MODULES.includes(module));
	const runtimeSdk = usesSdk ? (sdk ?? (await packSdkRuntime())) : undefined;
	const action = evaluateBundle(bundle, NODE_CONTRACT_VERSION, runtimeSdk?.bundle);
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
	const errorOf = typeof action.node.errorOf === 'string' ? action.node.errorOf : undefined;
	const required = requiredNodeContractOf(
		contract,
		'list' in action && action.list !== undefined,
		errorOf !== undefined,
	);
	// The host gives the validator module since 2.9.0, and the SDK runtime since 2.11.0.
	const floors: NodeContractVersion[] = [
		required,
		...(imported.includes(VALIDATOR_MODULE) ? ['2.9.0' as const] : []),
		...(runtimeSdk ? [SDK_NODE_CONTRACT] : []),
		...(credentials ? [CREDENTIAL_RANGES_NODE_CONTRACT] : []),
	];
	const manifest: VersionManifest = {
		kind: manifestKindOf(contract),
		id: action.id,
		semver: semverOf(action),
		nodeContract: floors.reduce((top, floor) => (compareSemver(top, floor) >= 0 ? top : floor)),
		...(runtimeSdk
			? {
					sdk: {
						version: runtimeSdk.manifest.semver,
						digest: `sha256:${runtimeSdk.manifest.bundleHash}`,
					},
				}
			: {}),
		...(credentials ? { credentials } : {}),
		contractHash: contractHash(contract),
		bundleHash,
		...(errorOf ? { errorOf } : {}),
		contract,
		...(ui ? { ui } : {}),
	};
	return { manifest, bundle, ...(runtimeSdk ? { sdk: runtimeSdk.bundle } : {}), action };
}

/**
 * Packs the config of a declarative HTTP action for the HTTP guest. The bundle is the config
 * with the contract that its binding gives, e.g. the `egress` of its base URL and the `paging`
 * input of a paged list, as canonical JSON: the same config gives the same bytes.
 */
export async function packHttpGuest(
	config: unknown,
	options: {
		/** The node that a config `extends`, as a copy takes it. Absent: no config may extend. */
		readonly parentOf?: (nodeId: string) => ParentNode | undefined;
		/** The icon of the node that a config extends, e.g. `node:n8n-nodes-base.github`. */
		readonly iconOf?: (nodeId: string) => string | undefined;
		/** n8n's credential type of a name. Absent: the config's credentials stay. */
		readonly credentialTypeOf?: (name: string) => AnyCredentialType | undefined;
	} = {},
): Promise<PackedAction> {
	// The bundle is canonical JSON, which sorts keys, and the binding takes the order of `required`
	// from the properties. So the contract comes from the sorted config, as the lift reads it.
	const parsed = parseHttpGuestConfig(
		JSON.parse(
			canonicalJson(
				withN8nCredentials(
					extendedOf(parseHttpGuestConfig(withFieldTitles(withNodeDisplayName(config))), options),
					options.credentialTypeOf,
				),
			),
		),
	);
	const contract = toContract(httpGuestActionOf(parsed));
	const bundle = canonicalJson({ ...parsed, contract });
	const action = liftHttpGuest(parseHttpGuestConfig(JSON.parse(bundle)));
	const bundleHash = sha256(bundle);
	const credentials = credentialPinsOf(action);
	const errorOf = typeof action.node.errorOf === 'string' ? action.node.errorOf : undefined;
	const manifest: VersionManifest = {
		kind: manifestKindOf(contract),
		id: action.id,
		semver: semverOf(action),
		nodeContract: credentials ? CREDENTIAL_RANGES_NODE_CONTRACT : HTTP_GUEST_NODE_CONTRACT,
		...(credentials ? { credentials } : {}),
		contractHash: contractHash(contract),
		bundleHash,
		guest: 'http',
		...(errorOf ? { errorOf } : {}),
		contract,
	};
	return { manifest, bundle, action };
}

/**
 * The config with `contract.nodeDisplayName` from its node, e.g. of a form that names the app
 * once. A node that the config extends replaces it.
 */
function withNodeDisplayName(config: unknown): unknown {
	if (!isRecord(config) || !isRecord(config.contract)) return config;
	if (config.contract.nodeDisplayName !== undefined) return config;
	const node = isRecord(config.node) ? config.node : {};
	const name = typeof node.displayName === 'string' ? node.displayName : config.contract.node;
	return { ...config, contract: { ...config.contract, nodeDisplayName: name } };
}

/**
 * The config with a title on each input field that has none, from the field name: `issueNumber`
 * gives "Issue Number". The publish gate needs a title on each field, and the HTTP action form,
 * an OpenAPI document or the AI builder often give none.
 */
function withFieldTitles(config: unknown): unknown {
	if (!isRecord(config) || !isRecord(config.contract) || !isRecord(config.contract.input)) {
		return config;
	}
	return {
		...config,
		contract: { ...config.contract, input: titledSchema(config.contract.input) },
	};
}

/** The schema with a title on each field, at the depths that `missingTitlesOf` checks. */
function titledSchema(
	schema: Record<string, unknown>,
	tag = isRecord(schema.discriminator) ? schema.discriminator.propertyName : undefined,
): Record<string, unknown> {
	const branchesOf = (key: 'oneOf' | 'anyOf') => {
		const branches = schema[key];
		return Array.isArray(branches)
			? { [key]: branches.map((branch) => (isRecord(branch) ? titledSchema(branch, tag) : branch)) }
			: {};
	};
	const { properties, items } = schema;
	return {
		...schema,
		...(isRecord(properties)
			? {
					properties: Object.fromEntries(
						Object.entries(properties).map(([name, field]) => [
							name,
							name === tag || !isRecord(field)
								? field
								: { ...titledSchema(field), title: field.title ?? titleOf(name) },
						]),
					),
				}
			: {}),
		...branchesOf('oneOf'),
		...branchesOf('anyOf'),
		...(isRecord(items) ? { items: titledSchema(items) } : {}),
	};
}

/** A field name as a title, e.g. `issue_number` or `issueNumber` gives "Issue Number". */
const titleOf = (name: string) =>
	name
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.trim()
		.replace(/\b\w/g, (letter) => letter.toUpperCase());

/** The config with the settings of the node it extends copied in. */
function extendedOf(
	config: HttpGuestConfig,
	{
		parentOf,
		iconOf,
	}: {
		parentOf?: (id: string) => ParentNode | undefined;
		iconOf?: (id: string) => string | undefined;
	},
): HttpGuestConfig {
	if (config.extends === undefined) return config;
	const parent = parentOf?.(config.extends);
	if (!parent) throw new UserError(`There is no node ${config.extends} to extend`);
	if (!parent.extendable) throw new UserError(`${parent.id} cannot be extended: ${parent.reason}`);
	return extendedConfig(config, parent, iconOf?.(parent.id));
}

/**
 * The config with n8n's base URL template and fields of each credential type. The runtime also
 * takes n8n's types, so this makes a config that would send a credential elsewhere fail here.
 */
function withN8nCredentials(
	config: HttpGuestConfig,
	typeOf: ((name: string) => AnyCredentialType | undefined) | undefined,
): HttpGuestConfig {
	if (!typeOf) return config;
	const credentials = config.contract.credentials.map((name) => {
		const type = typeOf(name);
		if (!type) throw new UserError(`n8n has no credential type ${name}`);
		const data = credentialDataOf(type);
		if (typeof data === 'string') throw new UserError(`An action cannot use ${name}: ${data}`);
		assertCredentialHost(config.baseUrl, type);
		return data;
	});
	return { ...config, credentials };
}

/**
 * Refuses a base URL that a credential type with known hosts does not allow, so the user learns
 * that the request would go elsewhere. A base URL template of the type (an account server)
 * replaces the config's base URL, and a type without hosts follows the credential's "Allowed
 * HTTP Request Domains" when it runs.
 */
function assertCredentialHost(baseUrl: string | undefined, type: AnyCredentialType) {
	const own = type.baseUrl;
	if (
		baseUrl === undefined ||
		(own !== undefined && (typeof own !== 'string' || own.includes('{')))
	) {
		return;
	}
	const known = [
		...new Set(
			[...(type.hosts ?? []), ...(own ? [toHostname(own)] : [])].flatMap((host) =>
				host ? [host] : [],
			),
		),
	];
	const host = toHostname(baseUrl);
	if (known.length > 0 && host && !allowsHost(known, host)) {
		throw new UserError(`${type.name} goes only to ${known.join(', ')}, not to ${host}`);
	}
}

/** The credential manifest of a type, with the version of its source, or none for a compat type. */
export const packCredential = (type: AnyCredentialType): CredentialManifest | undefined =>
	credentialManifestOf(type);

/**
 * The manifest of a native action or trigger: its contract and the legacy node that runs it. It
 * has no bundle.
 *
 * @throws a `UserError` for a contract that is not native.
 */
export function packNative(source: Action | Trigger): NativeManifest {
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
	return {
		kind,
		id: source.id,
		semver: semverOf(source),
		nodeContract: credentials ? CREDENTIAL_RANGES_NODE_CONTRACT : '2.5.0',
		...(credentials ? { credentials } : {}),
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
	};
}

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
 * action file without a contract export is an error, because pack would drop it without a
 * sign. Two exports of one id and major are an error, because pack would write two versions
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

/** The manifests that `packPackage` writes. */
export interface PackedPackage {
	/** The manifest of the HEAD of each action and trigger with a bundle. */
	readonly manifests: readonly VersionManifest[];
	/** The manifest of each credential type that is not a compat type. */
	readonly credentials: readonly CredentialManifest[];
	/** The manifest of each native contract. */
	readonly natives: readonly NativeManifest[];
}

/**
 * What a published version must keep, next to the contract hash, to stand for a HEAD: the
 * bundle, or all of a credential but its old `sdk` text.
 */
// A version without a bundle (credential, native) is all manifest, so every field except the SDK
// pin must match.
const shipKeyOf = (manifest: StoreManifest) =>
	'bundleHash' in manifest
		? manifest.bundleHash
		: canonicalJson(Object.fromEntries(Object.entries(manifest).filter(([key]) => key !== 'sdk')));

const contractHashOf = (manifest: StoreManifest) =>
	'contractHash' in manifest ? manifest.contractHash : undefined;

/**
 * Throws unless the published version of an id and version may stand for the HEAD of that
 * version, e.g. when only its SDK pin differs. Build ships it and publish skips the HEAD.
 */
export function assertPublishedMatches(published: StoreManifest, head: StoreManifest) {
	const at = `${head.id}@${head.semver}`;
	if (contractHashOf(published) !== contractHashOf(head)) {
		throw new UserError(`${at} is published with another contract; bump the version in source`);
	}
	if (shipKeyOf(published) !== shipKeyOf(head)) {
		throw new UserError(`${at} is published with other bytes; bump the version in source`);
	}
}

/**
 * The version to ship of a HEAD. The registry can have the version with another manifest, e.g. one
 * that pins another SDK runtime. Then the published manifest, bundle and fixtures ship when they
 * match, see `assertPublishedMatches`. Any other change fails: it needs a new version.
 */
async function shippedOf<M extends StoreManifest>(
	reader: StoreReader,
	local: { readonly manifest: M; readonly bundle?: string },
	parse: (text: string) => M,
	log: (line: string) => void,
): Promise<{ readonly manifest: M } & StoreVersion> {
	const { manifest, bundle } = local;
	const record = (await reader.records(manifest.id)).find(
		({ version }) => version === manifest.semver,
	);
	if (!record || record.manifest === npmDigestOf(manifest)) {
		return { manifest, manifestText: manifestTextOf(manifest), bundle };
	}
	const read = await reader.readManifest(record);
	if (!read)
		throw new UserError(`The npm registry has no tarball of ${record.id}@${record.version}`);
	const published = parse(read.text);
	assertPublishedMatches(published, manifest);
	const textOf = async (digest?: string) =>
		digest === undefined ? undefined : (await reader.blob(digest))?.toString('utf8');
	log(`${manifest.id}@${manifest.semver} has unpublished changes; bump the version to ship them`);
	return {
		manifest: published,
		manifestText: read.text,
		bundle: await textOf(record.bundle),
		fixtures: await textOf(record.fixtures),
	};
}

/**
 * The SDK runtime of a `sha256:<hex>` digest from the registry, which the shipped manifest of
 * `pinnedBy` pins. The store runs it as n8n code, so it needs a signature of the first-party key
 * (`N8N_NODE_CONTRACTS_FIRST_PARTY_KEY_FILE`).
 */
async function registrySdkOf(reader: StoreReader, digest: string, pinnedBy: string) {
	const record = (await reader.records(SDK_RUNTIME_ID)).find(({ bundle }) => bundle === digest);
	// readManifest checks the bundleHash against the digest, and blob checks the bytes.
	const read = record && (await reader.readManifest(record));
	const bundle = await reader.blob(digest);
	if (!record || !read || !bundle) throw new UserError(`The registry has no SDK runtime ${digest}`);
	const keyFile = process.env.N8N_NODE_CONTRACTS_FIRST_PARTY_KEY_FILE;
	if (!keyFile) {
		throw new UserError(
			`${pinnedBy} pins SDK runtime ${digest} from the registry. Set N8N_NODE_CONTRACTS_FIRST_PARTY_KEY_FILE to check its signature.`,
		);
	}
	if (!verifyStoreSignature(record, read.text, readFileSync(keyFile, 'utf8'))) {
		throw new UserError(
			`${pinnedBy} pins SDK runtime ${digest}, which has no first-party signature`,
		);
	}
	return { manifestText: read.text, bundle: bundle.toString('utf8') };
}

/**
 * Packs the HEAD of each action, trigger, credential type and native contract of a package,
 * and the SDK runtime that the bundles pin, into the store in `outDir`, by default the embedded
 * store of the package. It replaces the store in `outDir`: n8n loads every version there, so a
 * removed contract must not stay from an older build. Each version comes from the source. It finds the contracts in the action files
 * (`contractsOfPackage`).
 *
 * With `N8N_NODE_CONTRACTS_NPM_REGISTRY` (scope: `N8N_NODE_CONTRACTS_NPM_SCOPE`), a release ships
 * the published bytes of each HEAD that the registry has, see `shippedOf`, with the SDK runtime
 * that they pin, and gives a line to `log` for each published manifest that differs from HEAD.
 * Without it, `log` gets one warning that the build did not compare published bytes.
 */
export async function packPackage(
	pkg: Pick<SourcePackage, 'name' | 'dir'>,
	outDir = embeddedStoreDirOf(pkg),
	log: (line: string) => void = () => {},
): Promise<PackedPackage> {
	const { entries, natives: sources } = await contractsOfPackage(pkg);
	const types = credentialTypesOf([...entries.map(({ action }) => action), ...sources]);
	const sdk = await packSdkRuntime();
	const packed = await Promise.all(
		entries.map(async ({ entryFile, exportName }) => await packAction(entryFile, exportName, sdk)),
	);
	const credentialManifests = types.flatMap((type) => packCredential(type) ?? []);
	const natives = sources.map(packNative);
	const url = process.env.N8N_NODE_CONTRACTS_NPM_REGISTRY;
	const scope = process.env.N8N_NODE_CONTRACTS_NPM_SCOPE ?? DEFAULT_NPM_SCOPE;
	const registry = url ? npmStoreReader(npmRegistryOf(url), { scope }) : undefined;
	if (!registry) {
		log(
			'Warning: N8N_NODE_CONTRACTS_NPM_REGISTRY is not set, so the build did not compare published bytes',
		);
	}
	const ship = async <M extends StoreManifest>(
		local: { readonly manifest: M; readonly bundle?: string },
		parse: (text: string) => M,
	) =>
		registry
			? await shippedOf(registry, local, parse, log)
			: { ...local, manifestText: manifestTextOf(local.manifest) };
	const [shipped, shippedCredentials, shippedNatives] = await Promise.all([
		Promise.all(packed.map(async (version) => await ship(version, parseManifest))),
		Promise.all(
			credentialManifests.map(
				async (manifest) => await ship({ manifest }, parseCredentialManifest),
			),
		),
		Promise.all(natives.map(async (manifest) => await ship({ manifest }, parseNativeManifest))),
	]);
	const localSdk = `sha256:${sdk.manifest.bundleHash}`;
	const pinnedSdks = new Map(
		shipped.flatMap(
			({ manifest }): Array<[string, string]> =>
				typeof manifest.sdk === 'object' && manifest.sdk.digest !== localSdk
					? [[manifest.sdk.digest, `${manifest.id}@${manifest.semver}`]]
					: [],
		),
	);
	const publishedSdks = registry
		? await Promise.all(
				[...pinnedSdks].map(
					async ([digest, pinnedBy]) => await registrySdkOf(registry, digest, pinnedBy),
				),
			)
		: [];
	rmSync(outDir, { recursive: true, force: true });
	await addToStore(outDir, [
		{ manifestText: manifestTextOf(sdk.manifest), bundle: sdk.bundle },
		...publishedSdks,
		...shipped,
		...shippedCredentials,
		...shippedNatives,
	]);
	return {
		manifests: shipped.map(({ manifest }) => manifest),
		credentials: shippedCredentials.map(({ manifest }) => manifest),
		natives: shippedNatives.map(({ manifest }) => manifest),
	};
}
