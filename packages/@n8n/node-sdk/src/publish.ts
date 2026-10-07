import { isRecord } from '@n8n/utils/is-record';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
	UnexpectedError,
	UserError,
	type INode,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { isSecretField, type AnyCredentialType } from './credentials';
import {
	missingTitlesOf,
	type Action,
	type DataTable,
	type DataTables,
	type Trigger,
} from './define';
import {
	contractsOfPackage,
	credentialTypesOf,
	freezeAction,
	freezeCredential,
	freezeNative,
	type FrozenAction,
} from './freeze';
import {
	isDataTableColumns,
	isDataTableInfo,
	isDataTableList,
	isDataTablePage,
	isDataTableRows,
} from './host-imports';
import {
	evaluateVersion,
	executorOf,
	nodeDescriptionOf,
	type BinaryStore,
	type Executor,
	type ExecutorHost,
} from './runtime';
import { parameterPathOf, toProperty } from './properties';
import { providedKindOf, providerInputsOf, replayCapability, type ProviderKind } from './providers';
import { canonicalJson, shapeOf } from './schema';
import { parseCredentialManifest, type CredentialManifest, type NativeManifest } from './manifest';
import {
	DEFAULT_NPM_SCOPE,
	npmDeprecate,
	npmDigestOf,
	npmManifestTextOf,
	npmNameOf,
	npmPackageOf,
	npmPublish,
	npmRegistryOf,
	npmSourceOf,
	npmVersionsOf,
	type NpmSource,
	type NpmVersion,
} from './npm';
import type { SourcePackage, StoreManifest } from './store';
import { evaluateAlone, mockHttp, sendRequest } from './testing';
import { validate } from './validator';
import {
	compareSemver,
	diffContracts,
	isFixtureBinary,
	normativeSchema,
	parseFixtures,
	parseManifest,
	parseNativeManifest,
	parseSemver,
	type ChangeKind,
	type ContractDiff,
	type ContractFixtures,
	type ExecutionFixture,
	type FixtureBinary,
	type VersionManifest,
} from './version';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const bytesOf = ({ data }: FixtureBinary) => Buffer.from(data, 'base64');

async function bufferOf(stream: AsyncIterable<unknown>): Promise<Buffer> {
	const chunks: Uint8Array[] = [];
	for await (const chunk of stream) {
		if (!(chunk instanceof Uint8Array)) throw new UnexpectedError('A binary stream gave text');
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

/** A binary store in memory, with the input binaries of the fixture. */
/** The host imports of a fixture: each data table call, file read and code run takes the next recorded answer. */
function fixtureImports(fixture: ExecutionFixture) {
	const answers = [...(fixture.imports ?? [])];
	const next = <T>(what: string, guard: (value: unknown) => value is T): T => {
		if (answers.length === 0) throw new UserError(`No recorded import answer is left for ${what}`);
		const answer = answers.shift();
		if (!guard(answer)) throw new UserError(`The recorded answer for ${what} has the wrong shape`);
		return answer;
	};
	const anything = (_value: unknown): _value is unknown => true;
	const isNumber = (value: unknown): value is number => typeof value === 'number';
	const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
	const tableOf = (id: string): DataTable => ({
		id,
		columns: async () => next('columns', isDataTableColumns),
		rows: async () => next('rows', isDataTablePage),
		insert: async () => next('insert', isDataTableRows),
		update: async () => next('update', isDataTableRows),
		upsert: async () => next('upsert', isDataTableRows),
		delete: async () => next('delete', isDataTableRows),
		clear: async () => next('clear', isNumber),
		rename: async () => next('rename', isBoolean),
		drop: async () => next('drop', isBoolean),
	});
	const dataTables: DataTables = {
		open: async (table) => tableOf(table.id ?? table.name),
		list: async () => next('list', isDataTableList),
		create: async () => next('create', isDataTableInfo),
	};
	const host: Pick<ExecutorHost, 'dataTables' | 'extractFile' | 'code' | 'waitUntil'> = {
		dataTables,
		// The executor checks the shape of the answer for the format.
		extractFile: async () => next('parsers', anything),
		code: { run: async () => next('code', anything) },
		waitUntil: async () => await Promise.resolve(),
	};
	return { host, unused: () => answers.length };
}

const fixtureBinaryStore = ({ binary }: ExecutionFixture): BinaryStore => ({
	input: async (itemIndex, value) => {
		const found = typeof value === 'string' && itemIndex === 0 ? binary?.[value] : value;
		if (!isFixtureBinary(found)) throw new UserError('The input item has no such binary');
		return { ...found, bytes: bytesOf(found).length };
	},
	read: async (entry) => Readable.from([Buffer.from(entry.data, 'base64')]),
	write: async (stream, { mimeType, fileName }) => {
		const bytes = await bufferOf(stream);
		return {
			data: bytes.toString('base64'),
			mimeType: mimeType ?? 'application/octet-stream',
			...(fileName === undefined ? {} : { fileName }),
			bytes: bytes.length,
		};
	},
});

/**
 * A fixture holds only the declared fields of a credential type, so it never holds a secret.
 * The replay signs no request, so each declared secret gets a stand-in value.
 */
function fixtureCredential(action: Action, type: string, data: ExecutionFixture['credential']) {
	const fields = action.node.credential?.types.find(({ name }) => name === type)?.fields ?? {};
	const secrets = Object.keys(fields).filter((key) => isSecretField(fields[key]));
	const refused = Object.keys(data ?? {}).filter(
		(key) => !(key in fields) || secrets.includes(key),
	);
	if (refused.length > 0) {
		throw new UserError(
			`A fixture credential holds only fields of ${type}, not ${refused.join(', ')}`,
		);
	}
	return { ...Object.fromEntries(secrets.map((key) => [key, 'fixture'])), ...data };
}

/** The binaries of each output item as a fixture records them, or none when no item has one. */
function outputBinaryOf(items: readonly INodeExecutionData[]) {
	const binaries = items.map(({ binary }) =>
		binary
			? Object.fromEntries(
					Object.entries(binary).map(([key, { data, mimeType, fileName }]) => [
						key,
						{ data, mimeType, ...(fileName === undefined ? {} : { fileName }) },
					]),
				)
			: undefined,
	);
	return binaries.some((binary) => binary !== undefined) ? binaries : undefined;
}

/** The recorded capabilities of a fixture, for the provider fields of `input`. */
function fixtureCapabilities(
	fixture: ExecutionFixture,
	fields: ReturnType<typeof providerInputsOf>,
) {
	return async (kind: ProviderKind) => {
		const field = fields.find((entry) => entry.kind === kind);
		const recorded = field ? fixture.supplied?.[field.name] : undefined;
		if (recorded === undefined) return field?.many ? [] : undefined;
		const list = 'results' in recorded ? [recorded] : recorded;
		const values = list.map(({ data, results }) => replayCapability(kind, data ?? {}, results));
		return field?.many ? values : values[0];
	};
}

/** The results of the calls a fixture makes on the capability that a provider gave. */
async function callResults(capability: unknown, calls: ExecutionFixture['calls']) {
	if (!isRecord(capability)) throw new UnexpectedError('The provider gave no capability');
	return await (calls ?? []).reduce<Promise<unknown[]>>(async (done, { method, args }) => {
		const member = capability[method];
		if (typeof member !== 'function') throw new UserError(`The capability has no ${method}()`);
		const result: unknown = await Reflect.apply(member, capability, args);
		return [...(await done), result];
	}, Promise.resolve([]));
}

/**
 * Replays fixtures through the current host executor: execution fixtures against the bundle,
 * migration pairs against its `migrate`. An executor change that alters an old version fails.
 * A trigger replays only its migration pairs.
 */
export async function replayFixtures(
	{ manifest, bundle }: Pick<FrozenAction, 'manifest' | 'bundle'>,
	fixtures: ContractFixtures,
	/** The action, its executor and its `migrate`, e.g. in the sandbox. The default runs the bundle here. */
	loaded?: {
		/** The action that the bundle exports. */
		readonly contract: Action;
		/** The executor that runs it. */
		readonly executor: Executor;
		/** The `migrate` of the bundle in the same runtime. It fails when the bundle has none. */
		readonly migrate: (
			fromMajor: number,
			params: Readonly<Record<string, unknown>>,
		) => Promise<Record<string, unknown>>;
	},
): Promise<string[]> {
	const contract = loaded?.contract ?? evaluateVersion(bundle, manifest);
	const migrate =
		loaded?.migrate ??
		(async (fromMajor: number, params: Readonly<Record<string, unknown>>) => {
			if (!contract.migrate) throw new UserError('the contract has no migrate');
			return contract.migrate(fromMajor, params);
		});
	const migrations = await Promise.all(
		(fixtures.migrations ?? []).map(async ({ fromMajor, params, expected }) => {
			const at = `${manifest.id}@${manifest.semver} migration from ${fromMajor}`;
			const migrated = await migrate(fromMajor, params).catch((error: unknown) =>
				error instanceof Error ? error : new UnexpectedError(String(error)),
			);
			if (migrated instanceof Error) return [`${at}: ${migrated.message}`];
			return [
				...(canonicalJson(migrated) === canonicalJson(expected)
					? []
					: [`${at}: got ${JSON.stringify(migrated)}`]),
				...validate(migrated, contract.inputSchema).map((issue) => `${at}: ${issue}`),
			];
		}),
	).then((issues) => issues.flat());
	if ('kind' in contract) {
		const executions = fixtures.executions.length
			? [`${manifest.id}@${manifest.semver}: trigger execution fixtures do not replay`]
			: [];
		return [...executions, ...migrations];
	}
	const run = loaded?.executor ?? executorOf(contract);
	const providerFields = providerInputsOf(contract.input);
	const isProvider = providedKindOf(contract.output.json) !== undefined;
	// n8n fills each property default into the parameters it runs with.
	const description = nodeDescriptionOf(manifest);
	const defaults = new Map(description.properties.map((p) => [p.name, p.default]));
	const node: INode = {
		id: 'fixture',
		name: manifest.id,
		type: description.name,
		typeVersion: manifest.contract.version,
		position: [0, 0],
		parameters: {},
		credentials: Object.fromEntries(
			manifest.contract.credentials.map((type) => [type, { id: 'fixture', name: type }]),
		),
	};
	const executions = await Promise.all(
		fixtures.executions.map(async (fixture) => {
			const fetchFn = mockHttp(fixture.routes ?? []);
			const inputs = fixture.inputs?.map((list) => list.map((json) => ({ json: { ...json } })));
			const imports = fixtureImports(fixture);
			const host: ExecutorHost = {
				evaluate: evaluateAlone,
				items: inputs?.[0] ?? (fixture.items ?? [{}]).map((json) => ({ json: { ...json } })),
				inputItems: (index) => inputs?.[index] ?? [],
				...imports.host,
				node,
				parameter: (name) => fixture.params[name] ?? defaults.get(name),
				request: async (options) => await sendRequest(fetchFn, options),
				continueOnFail: () => false,
				binary: fixtureBinaryStore(fixture),
				supplied: fixtureCapabilities(fixture, providerFields),
				// A field the fixture does not record, e.g. a base URL, takes its default.
				credentialData: async (type) => fixtureCredential(contract, type, fixture.credential),
			};
			const at = `${manifest.id}@${manifest.semver} fixture "${fixture.name}"`;
			const undeclared = Object.keys(fixture.params).filter((name) => !defaults.has(name));
			const paramIssues = undeclared.length
				? [`${at}: params not declared: ${undeclared.join(', ')}`]
				: [];
			try {
				const items = await run(host);
				// A provider gives its capability; the fixture checks what its calls return.
				const outputs = isProvider
					? [await callResults(items[0]?.[0]?.json, fixture.calls)]
					: items.map((output) => output.map((item) => item.json));
				const output = fixture.outputs ? outputs : outputs[0];
				// Named outputs record no binaries, so any binary there fails the check.
				const outputBinary = outputBinaryOf(fixture.outputs ? items.flat() : (items[0] ?? []));
				return [
					...paramIssues,
					...(canonicalJson(output) === canonicalJson(fixture.outputs ?? fixture.output)
						? []
						: [`${at}: output ${JSON.stringify(output)}`]),
					...(canonicalJson(outputBinary) === canonicalJson(fixture.outputBinary)
						? []
						: [`${at}: output binaries ${JSON.stringify(outputBinary)}`]),
					...(imports.unused() ? [`${at}: ${imports.unused()} import answers not used`] : []),
					...(fixture.error === undefined ? [] : [`${at}: no error, expected "${fixture.error}"`]),
				];
			} catch (error) {
				return [
					...paramIssues,
					...(errorMessage(error) === fixture.error ? [] : [`${at}: ${errorMessage(error)}`]),
				];
			}
		}),
	);
	return [...executions.flat(), ...migrations];
}

const RANK: Readonly<Record<ChangeKind, number>> = { patch: 0, minor: 1, major: 2 };

function bumpOf(previous: string, next: string): ChangeKind {
	if (compareSemver(next, previous) <= 0) {
		throw new UserError(`${next} must be newer than the published ${previous}`);
	}
	const [a, b] = [parseSemver(previous), parseSemver(next)];
	return a.major !== b.major ? 'major' : a.minor !== b.minor ? 'minor' : 'patch';
}

/** Refuses a bump lower than `change`. */
function checkBump(at: string, previous: string, bump: ChangeKind, change: ChangeKind, why = '') {
	if (RANK[bump] < RANK[change]) {
		throw new UserError(
			`${at} is a ${bump} bump from ${previous}, but the change is ${change}${why && ` (${why})`}`,
		);
	}
}

type ContractVersion = Pick<VersionManifest, 'id' | 'semver' | 'contract' | 'contractHash'>;

/** Refuses a bump lower than the contract change, and a patch whose contract hash moved. */
function checkContractBump(previous: ContractVersion, manifest: ContractVersion) {
	const at = `${manifest.id}@${manifest.semver}`;
	const diff = diffContracts(previous.contract, manifest.contract);
	const bump = bumpOf(previous.semver, manifest.semver);
	const changes = diff.changes.map(({ kind, text }) => `${kind}: ${text}`).join('; ');
	checkBump(at, previous.semver, bump, diff.kind, changes);
	if (bump === 'patch' && previous.contractHash !== manifest.contractHash) {
		throw new UserError(`${at} is a patch, so it must keep the contract hash`);
	}
	return { diff, bump };
}

type FormVersion = Pick<VersionManifest, 'contract' | 'ui'>;

const isCollection = ({ type }: INodeProperties) =>
	type === 'collection' || type === 'fixedCollection';

/**
 * `[field path, is a collection]` of a property and of each property in it, e.g. a branch field
 * of a variant collection as `body.inner`.
 */
function storedFormsOf(property: INodeProperties, path: string): Array<[string, boolean]> {
	const children = isCollection(property)
		? (property.options ?? []).flatMap(
				(option): Array<[INodeProperties, string]> =>
					'values' in option
						? option.values.map((value) => [value, `${path}.${option.name}.${value.name}`])
						: 'type' in option
							? [[option, `${path}.${option.name}`]]
							: [],
			)
		: [];
	return [
		[path, isCollection(property)],
		...children.flatMap(([child, at]) => storedFormsOf(child, at)),
	];
}

/**
 * The input fields that the next form stores in another place or shape: a parameter path, or a
 * collection or fixed collection against one value, at any depth, which n8n empties when it
 * holds another form. The editor form of a major comes from its newest version, so a stored
 * workflow loses the value of such a field.
 */
function movedParametersOf(previous: FormVersion, next: FormVersion): string[] {
	const storageOf = ({ contract: { input }, ui }: FormVersion) => {
		const pathOf = parameterPathOf(input, ui);
		return new Map(
			Object.entries(shapeOf(input)).flatMap(([name, schema]) =>
				storedFormsOf(toProperty(name, schema, ui?.fields), name).map(
					([path, collection]): [string, string] => [path, `${pathOf(name)} ${collection}`],
				),
			),
		);
	};
	const after = storageOf(next);
	return [...storageOf(previous)]
		.filter(([name, stored]) => after.has(name) && after.get(name) !== stored)
		.map(([name]) => name);
}

/**
 * The publish gate. It refuses a bump lower than the computed change, a patch whose contract
 * hash moved, a minor or patch whose form moves stored parameters, a major that breaks old input
 * without `migrate` and a fixture pair, and fixtures that fail. `previous` is the newest published version below the new one.
 */
export async function checkPublish(
	previous: VersionManifest | undefined,
	frozen: FrozenAction,
	fixtures: ContractFixtures,
): Promise<ContractDiff | undefined> {
	const { manifest, action } = frozen;
	const at = `${manifest.id}@${manifest.semver}`;
	const isTrigger = 'kind' in action;
	if (fixtures.executions.length === 0 && !isTrigger) {
		throw new UserError(`${at} needs an execution fixture`);
	}
	const checked = previous && checkContractBump(previous, manifest);
	const moved = previous ? movedParametersOf(previous, manifest) : [];
	if (previous && checked && moved.length > 0) {
		const why = `the form moves the stored parameters of ${moved.join(', ')}`;
		checkBump(at, previous.semver, checked.bump, 'major', why);
	}
	if (previous && checked?.bump === 'major' && checked.diff.breaksInput) {
		const fromMajor = previous.contract.version;
		if (!action.migrate) {
			throw new UserError(`${at} breaks old input, so it needs migrate`);
		}
		if (!fixtures.migrations?.some((pair) => pair.fromMajor === fromMajor)) {
			throw new UserError(`${at} needs a migration fixture from major ${fromMajor}`);
		}
	}
	const untitled = missingTitlesOf(manifest.contract);
	if (untitled.length > 0) throw new UserError(`${at} needs field titles: ${untitled.join('; ')}`);
	const issues = await replayFixtures(frozen, fixtures);
	if (issues.length > 0) throw new UserError(`${at} fails its fixtures: ${issues.join('; ')}`);
	return checked?.diff;
}

/**
 * The publish gate of a native version. A legacy node runs it, so it has no fixtures, and the
 * legacy node migrates old parameters. A patch keeps the contract hash and the legacy node.
 */
export function checkNativePublish(previous: NativeManifest | undefined, manifest: NativeManifest) {
	const contracts = [manifest.contract, ...(manifest.reply ? [manifest.reply.contract] : [])];
	const untitled = contracts.flatMap(missingTitlesOf);
	if (untitled.length > 0) {
		throw new UserError(
			`${manifest.id}@${manifest.semver} needs field titles: ${untitled.join('; ')}`,
		);
	}
	if (!previous) return;
	const { bump } = checkContractBump(previous, manifest);
	const bindingOf = ({ native, reply }: NativeManifest) => canonicalJson({ native, reply });
	if (bump === 'patch' && bindingOf(previous) !== bindingOf(manifest)) {
		throw new UserError(
			`${manifest.id}@${manifest.semver} is a patch, so it must keep the legacy node`,
		);
	}
}

/** The keys of a credential manifest that are text only. A change of them is a patch. */
const CREDENTIAL_TEXT = new Set(['semver', 'sdk', 'displayName', 'documentationUrl', 'notice']);

/**
 * The change from one credential manifest to the next, by the rules of `defineCredential`: a
 * change that can break stored data or a saved workflow is major (another name, scheme or base
 * URL, a new host, a removed field, a new required field), any other change of what n8n does is
 * minor, and a change of text only is a patch.
 */
export function credentialChangeOf(
	previous: CredentialManifest,
	next: CredentialManifest,
): ChangeKind {
	const fieldsOf = ({ fields }: CredentialManifest) => Object.keys(fields.properties ?? {});
	const requiredOf = ({ fields }: CredentialManifest) => fields.required ?? [];
	const breaks =
		previous.name !== next.name ||
		canonicalJson(previous.scheme) !== canonicalJson(next.scheme) ||
		canonicalJson(previous.baseUrl) !== canonicalJson(next.baseUrl) ||
		(next.hosts ?? []).some((host) => !(previous.hosts ?? []).includes(host)) ||
		fieldsOf(previous).some((name) => !fieldsOf(next).includes(name)) ||
		requiredOf(next).some((name) => !requiredOf(previous).includes(name));
	if (breaks) return 'major';
	const normative = (manifest: CredentialManifest) =>
		canonicalJson({
			...Object.fromEntries(Object.entries(manifest).filter(([key]) => !CREDENTIAL_TEXT.has(key))),
			fields: normativeSchema(manifest.fields),
		});
	return normative(previous) === normative(next) ? 'patch' : 'minor';
}

/** The publish gate of a credential manifest: it refuses a bump lower than the change. */
export function checkCredentialPublish(
	previous: CredentialManifest | undefined,
	manifest: CredentialManifest,
) {
	if (!previous) return;
	const bump = bumpOf(previous.semver, manifest.semver);
	const at = `${manifest.id}@${manifest.semver}`;
	checkBump(at, previous.semver, bump, credentialChangeOf(previous, manifest));
}

/** Where publish adds a version, and the key that signs it. */
export interface PublishTarget {
	/** The npm registry, e.g. `http://localhost:4873/`. See `npmRegistryOf`. */
	readonly registry: string;
	/** PEM of the ed25519 publisher key. It lives outside the repo. */
	readonly privateKey: string;
	/** The npm scope of the packages. Default: `DEFAULT_NPM_SCOPE`. */
	readonly scope?: string;
	/** The license, repository and author of the source package. */
	readonly source?: NpmSource;
}

/** What `publishAction` publishes, and where. */
export interface PublishOptions extends PublishTarget {
	/** The source file that exports the action, e.g. `src/nodes/notion/actions/user.get.ts`. */
	readonly entryFile: string;
	/** The export name of the action in `entryFile`, e.g. `getUser`. */
	readonly exportName: string;
	/** The fixtures that publish replays before it publishes. A trigger may have none. */
	readonly fixtures?: ContractFixtures;
}

/**
 * Gates one frozen version and publishes it as an npm package. A version already published with
 * the same manifest digest is a no-op. Other bytes for a published version are refused, and so is
 * a package that holds another contract id.
 */
async function publishVersion<M extends StoreManifest>(
	target: PublishTarget,
	frozen: NpmVersion & { readonly manifest: M },
	parse: (text: string) => M,
	gate: (previous: M | undefined) => unknown,
): Promise<M> {
	const { manifest } = frozen;
	const { id, semver } = manifest;
	const name = npmNameOf(id, target.scope);
	const published = await npmVersionsOf(target.registry, name);
	const other = published.find((entry) => entry.id !== id);
	if (other) {
		throw new UserError(`${name} holds ${other.id ?? 'another package'}, so it cannot hold ${id}`);
	}
	const existing = published.find(({ version }) => version === semver);
	if (existing) {
		if (existing.digest === npmDigestOf(manifest)) return manifest;
		throw new UserError(
			`${id}@${semver} is published with other bytes; bump the version in source`,
		);
	}
	const previous = published
		.filter(({ version }) => compareSemver(version, semver) < 0)
		.sort((a, b) => compareSemver(a.version, b.version))
		.at(-1);
	await gate(previous ? parse(await npmManifestTextOf(previous, name)) : undefined);
	await npmPublish(target.registry, npmPackageOf(frozen, target));
	return manifest;
}

/**
 * Freezes HEAD, gates it against the newest published version below it, signs it, and publishes
 * it. A version already published with the same manifest digest is a no-op; with other bytes it
 * is refused.
 */
export async function publishAction(options: PublishOptions): Promise<VersionManifest> {
	const frozen = await freezeAction(options.entryFile, options.exportName);
	const fixtures = options.fixtures ?? { executions: [] };
	return await publishVersion(
		options,
		{ ...frozen, fixtures: options.fixtures },
		parseManifest,
		async (previous) => await checkPublish(previous, frozen, fixtures),
	);
}

/**
 * Publishes the credential manifest of a type, as `publishAction` publishes an action: the gate
 * of `checkCredentialPublish`, and a signature.
 *
 * @throws a `UserError` for a compat type: its legacy class defines it, so it has no manifest.
 */
export async function publishCredential(
	options: PublishTarget & {
		/** The credential type to publish. */
		readonly type: AnyCredentialType;
	},
): Promise<CredentialManifest> {
	const manifest = freezeCredential(options.type);
	if (!manifest) throw new UserError(`${options.type.name} is a compat type and has no manifest`);
	return await publishVersion(options, { manifest }, parseCredentialManifest, (previous) =>
		checkCredentialPublish(previous, manifest),
	);
}

/**
 * Publishes the manifest of a native action or trigger, as `publishAction` publishes an action:
 * the gate of `checkNativePublish`, and a signature.
 */
export async function publishNative(
	options: PublishTarget & {
		/** The native action or trigger to publish. */
		readonly native: Action | Trigger;
	},
): Promise<NativeManifest> {
	const manifest = freezeNative(options.native);
	return await publishVersion(options, { manifest }, parseNativeManifest, (previous) =>
		checkNativePublish(previous, manifest),
	);
}

/** The fixtures of a contract of a package. A trigger replays only migration pairs, so it may have no file. */
async function fixturesOf(pkg: Pick<SourcePackage, 'dir'>, action: Action | Trigger) {
	const file = path.join(pkg.dir, 'fixtures', `${action.id}.json`);
	if ('kind' in action && !existsSync(file)) return undefined;
	return parseFixtures(await readFile(file, 'utf8'));
}

const STATUS_USAGE = ['yank <id>@<version> <reason>', 'revoke <id>@<version> <reason>'].join('\n');

/**
 * The `npm deprecate` of the arguments `<yank|revoke> <id>@<version> <reason>`. A host reads every
 * npm deprecation as a yank, so a revoke gets the message prefix `revoked:`.
 */
function deprecationOfArgs(args: readonly string[]) {
	const [command = '', target = '', text] = args;
	const separator = target.lastIndexOf('@');
	const id = target.slice(0, separator);
	const version = target.slice(separator + 1);
	if (separator <= 0 || !version || !text || !['yank', 'revoke'].includes(command)) {
		throw new UserError(`Usage:\n${STATUS_USAGE}`);
	}
	return { id, version, message: command === 'revoke' ? `revoked: ${text}` : text };
}

/**
 * Without `args`, publishes the HEAD of each action and trigger, each credential type that is
 * not a compat type, and each native contract of a package as npm packages, one at a time, and
 * gives each `id@semver` to `log`. The gate of each kind refuses a wrong bump, and a version
 * already published with the same manifest digest is a no-op. With the arguments
 * `<yank|revoke> <id>@<version> <reason>`, it runs `npm deprecate`.
 * `N8N_NODE_CONTRACTS_NPM_REGISTRY` is the registry, `N8N_NODE_CONTRACTS_NPM_SCOPE` the scope
 * (default `DEFAULT_NPM_SCOPE`), `NPM_TOKEN` the registry token, and
 * `N8N_NODE_CONTRACTS_SIGNING_KEY_FILE` holds the signing key.
 */
export async function publishPackage(
	pkg: Pick<SourcePackage, 'name' | 'dir'>,
	args: readonly string[] = [],
	log: (line: string) => void = () => {},
): Promise<void> {
	const registry = npmRegistryOf(process.env.N8N_NODE_CONTRACTS_NPM_REGISTRY);
	const scope = process.env.N8N_NODE_CONTRACTS_NPM_SCOPE ?? DEFAULT_NPM_SCOPE;
	if (args.length > 0) {
		const { id, version, message } = deprecationOfArgs(args);
		const spec = `${npmNameOf(id, scope)}@${version}`;
		await npmDeprecate(registry, spec, message);
		log(`${spec}: ${message}`);
		return;
	}
	const keyFile = process.env.N8N_NODE_CONTRACTS_SIGNING_KEY_FILE;
	if (!keyFile) throw new UserError('Set N8N_NODE_CONTRACTS_SIGNING_KEY_FILE');
	const target: PublishTarget = {
		registry,
		scope,
		source: await npmSourceOf(pkg.dir),
		privateKey: await readFile(keyFile, 'utf8'),
	};
	const logVersion = ({ id, semver }: { readonly id: string; readonly semver: string }) =>
		log(`${id}@${semver}`);
	const { entries, natives } = await contractsOfPackage(pkg);
	// One at a time, so the log stays readable.
	for (const type of credentialTypesOf([...entries.map(({ action }) => action), ...natives]))
		logVersion(await publishCredential({ ...target, type }));
	for (const { entryFile, exportName, action } of entries) {
		const fixtures = await fixturesOf(pkg, action);
		logVersion(await publishAction({ ...target, entryFile, exportName, fixtures }));
	}
	for (const native of natives) logVersion(await publishNative({ ...target, native }));
}
