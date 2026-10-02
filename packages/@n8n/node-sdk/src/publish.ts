import { execFile } from 'node:child_process';
import { sign } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import { UnexpectedError, UserError, type INode, type INodeExecutionData } from 'n8n-workflow';

import { isSecretField } from './credentials';
import type { Action, DataTable, DataTables } from './define';
import { freezeAction, type FrozenAction } from './freeze';
import {
	isDataTableColumns,
	isDataTableInfo,
	isDataTableList,
	isDataTablePage,
	isDataTableRows,
} from './host-imports';
import {
	evaluateBundle,
	executorOf,
	type BinaryStore,
	type Executor,
	type ExecutorHost,
} from './runtime';
import { providedKindOf, providerInputsOf, replayCapability, type ProviderKind } from './providers';
import { validate } from './validate';
import {
	canonicalJson,
	compareSemver,
	diffContracts,
	isFixtureBinary,
	openContractPackage,
	packageNameOf,
	parseSemver,
	type ChangeKind,
	type ContractDiff,
	type ContractFixtures,
	type ExecutionFixture,
	type FixtureBinary,
	type VersionManifest,
} from './version';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const bytesOf = ({ data }: FixtureBinary) => Buffer.from(data, 'base64');

const isFullResponse = (value: unknown) =>
	isRecord(value) && typeof value.statusCode === 'number' && 'body' in value;

async function bufferOf(stream: AsyncIterable<unknown>): Promise<Buffer> {
	const chunks: Uint8Array[] = [];
	for await (const chunk of stream) {
		if (!(chunk instanceof Uint8Array)) throw new UnexpectedError('A binary stream gave text');
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

/** A binary store in memory, with the input binaries of the fixture. */
/** The host imports of a fixture: each data table call and code run takes the next recorded answer. */
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
	const host: Pick<ExecutorHost, 'dataTables' | 'code' | 'waitUntil'> = {
		dataTables,
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

/** The recorded binary as the HTTP client gives a streamed response. */
function streamedResponse(recorded: unknown) {
	if (!isFixtureBinary(recorded)) {
		throw new UserError('A binary response needs a recorded { data, mimeType, fileName? }');
	}
	const { mimeType, fileName } = recorded;
	return {
		body: Readable.from([bytesOf(recorded)]),
		headers: {
			'content-type': mimeType,
			...(fileName ? { 'content-disposition': `attachment; filename="${fileName}"` } : {}),
		},
		statusCode: 200,
	};
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
	/** The action and its executor, e.g. in the sandbox. The default runs the bundle here. */
	loaded?: { readonly contract: Action; readonly executor: Executor },
): Promise<string[]> {
	const contract = loaded?.contract ?? evaluateBundle(bundle, manifest.nodeContract);
	const migrations = (fixtures.migrations ?? []).flatMap(({ fromMajor, params, expected }) => {
		const at = `${manifest.id}@${manifest.semver} migration from ${fromMajor}`;
		if (!contract.migrate) return [`${at}: the contract has no migrate`];
		const migrated = contract.migrate(fromMajor, params);
		return [
			...(canonicalJson(migrated) === canonicalJson(expected)
				? []
				: [`${at}: got ${JSON.stringify(migrated)}`]),
			...validate(migrated, contract.inputSchema).map((issue) => `${at}: ${issue}`),
		];
	});
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
	const defaults = new Map(manifest.description.properties.map((p) => [p.name, p.default]));
	const node: INode = {
		id: 'fixture',
		name: manifest.id,
		type: manifest.description.name,
		typeVersion: manifest.contract.version,
		position: [0, 0],
		parameters: {},
		credentials: Object.fromEntries(
			manifest.contract.credentials.map((type) => [type, { id: 'fixture', name: type }]),
		),
	};
	const executions = await Promise.all(
		fixtures.executions.map(async (fixture) => {
			const responses = [...fixture.responses];
			const inputs = fixture.inputs?.map((list) => list.map((json) => ({ json: { ...json } })));
			const imports = fixtureImports(fixture);
			const host: ExecutorHost = {
				items: inputs?.[0] ?? (fixture.items ?? [{}]).map((json) => ({ json: { ...json } })),
				inputItems: (index) => inputs?.[index] ?? [],
				...imports.host,
				node,
				parameter: (name) => fixture.params[name] ?? defaults.get(name),
				request: async (options) => {
					if (responses.length === 0) throw new UserError('No recorded response is left');
					const recorded = responses.shift();
					if (options.encoding === 'stream') return streamedResponse(recorded);
					// A fixture records the body only, unless the action reads the full response.
					return options.returnFullResponse && !isFullResponse(recorded)
						? { body: recorded, headers: {}, statusCode: 200 }
						: recorded;
				},
				continueOnFail: () => false,
				binary: fixtureBinaryStore(fixture),
				supplied: fixtureCapabilities(fixture, providerFields),
				// A field the fixture does not record, e.g. a base URL, takes its default.
				credentialData: async (type) => fixtureCredential(contract, type, fixture.credential),
			};
			const at = `${manifest.id}@${manifest.semver} fixture "${fixture.name}"`;
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
					...(canonicalJson(output) === canonicalJson(fixture.outputs ?? fixture.output)
						? []
						: [`${at}: output ${JSON.stringify(output)}`]),
					...(canonicalJson(outputBinary) === canonicalJson(fixture.outputBinary)
						? []
						: [`${at}: output binaries ${JSON.stringify(outputBinary)}`]),
					...(responses.length ? [`${at}: ${responses.length} responses not requested`] : []),
					...(imports.unused() ? [`${at}: ${imports.unused()} import answers not used`] : []),
					...(fixture.error === undefined ? [] : [`${at}: no error, expected "${fixture.error}"`]),
				];
			} catch (error) {
				return errorMessage(error) === fixture.error ? [] : [`${at}: ${errorMessage(error)}`];
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

/**
 * The publish gate. It refuses a bump lower than the computed change, a patch whose contract
 * hash moved, a major that breaks old input without `migrate` and a fixture pair, and
 * fixtures that fail. `previous` is the newest published version below the new one.
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
	const diff = previous ? diffContracts(previous.contract, manifest.contract) : undefined;
	if (previous && diff) {
		const bump = bumpOf(previous.semver, manifest.semver);
		if (RANK[bump] < RANK[diff.kind]) {
			const changes = diff.changes.map(({ kind, text }) => `${kind}: ${text}`).join('; ');
			throw new UserError(
				`${at} is a ${bump} bump from ${previous.semver}, but the change is ${diff.kind} (${changes})`,
			);
		}
		if (bump === 'patch' && previous.contractHash !== manifest.contractHash) {
			throw new UserError(`${at} is a patch, so it must keep the contract hash`);
		}
		const fromMajor = previous.contract.version;
		if (bump === 'major' && diff.breaksInput) {
			if (!action.migrate) {
				throw new UserError(`${at} breaks old input, so it needs migrate`);
			}
			if (!fixtures.migrations?.some((pair) => pair.fromMajor === fromMajor)) {
				throw new UserError(`${at} needs a migration fixture from major ${fromMajor}`);
			}
		}
	}
	const issues = await replayFixtures(frozen, fixtures);
	if (issues.length > 0) throw new UserError(`${at} fails its fixtures: ${issues.join('; ')}`);
	return diff;
}

const BLOCK = 512;
// npm packs every file with this time, so equal files give equal tarballs.
const NPM_MTIME = 499162500;

function tarEntry(name: string, data: Buffer): Buffer {
	const header = Buffer.alloc(BLOCK);
	const octal = (value: number, length: number) =>
		`${value.toString(8).padStart(length - 1, '0')}\0`;
	const fields: ReadonlyArray<readonly [string, number]> = [
		[name, 0],
		['0000644\0', 100],
		['0000000\0', 108],
		['0000000\0', 116],
		[octal(data.length, 12), 124],
		[octal(NPM_MTIME, 12), 136],
		['        ', 148],
		['0', 156],
		['ustar\0', 257],
		['00', 263],
	];
	fields.forEach(([text, offset]) => header.write(text, offset, 'utf8'));
	const checksum = header.reduce((sum, byte) => sum + byte, 0);
	header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 'utf8');
	return Buffer.concat([header, data, Buffer.alloc((BLOCK - (data.length % BLOCK)) % BLOCK)]);
}

/** The npm tarball of a version: package.json, the signed manifest, the bundle, the fixtures. */
export function packContractPackage(
	{ manifest, bundle }: Pick<FrozenAction, 'manifest' | 'bundle'>,
	fixtures: ContractFixtures,
	privateKey: string,
): Buffer {
	const manifestText = `${JSON.stringify(manifest, null, '\t')}\n`;
	const { id, semver, nodeContract, contractHash, bundleHash } = manifest;
	const packageJson = {
		name: packageNameOf(id),
		version: semver,
		description: manifest.contract.summary,
		license: 'SEE LICENSE IN manifest.json',
		// The registry copies these into the packument, so a resolver can filter before download.
		n8nContract: { id, nodeContract, contractHash, bundleHash },
	};
	const files: ReadonlyArray<readonly [string, string]> = [
		['package.json', `${JSON.stringify(packageJson, null, '\t')}\n`],
		['manifest.json', manifestText],
		['manifest.sig', `${sign(null, Buffer.from(manifestText), privateKey).toString('base64')}\n`],
		['bundle.cjs', bundle],
		['fixtures.json', `${JSON.stringify(fixtures, null, '\t')}\n`],
	];
	return gzipSync(
		Buffer.concat([
			...files.map(([name, text]) => tarEntry(`package/${name}`, Buffer.from(text))),
			Buffer.alloc(BLOCK * 2),
		]),
	);
}

/** The registry operations the publish tool needs. */
export interface ContractRegistry {
	versions(name: string): Promise<readonly string[]>;
	tarball(name: string, version: string): Promise<{ data: Buffer; integrity: string }>;
	publish(name: string, version: string, tarball: Buffer): Promise<void>;
}

const run = promisify(execFile);

/** An npm registry through the npm CLI, which also holds the publish auth. */
export function npmRegistry(url: string): ContractRegistry {
	const npm = async (...args: string[]) =>
		(await run('npm', [...args, '--registry', url], { maxBuffer: 64 * 1024 * 1024 })).stdout;
	const versions = async (name: string): Promise<readonly string[]> => {
		try {
			const value: unknown = JSON.parse(await npm('view', name, 'versions', '--json'));
			return [value].flat().filter((version) => typeof version === 'string');
		} catch (error) {
			if (errorMessage(error).includes('E404')) return [];
			throw error;
		}
	};
	return {
		versions,
		async tarball(name, version) {
			const integrity = (await npm('view', `${name}@${version}`, 'dist.integrity')).trim();
			const dir = await mkdtemp(path.join(tmpdir(), 'n8n-contract-'));
			try {
				const packed: unknown = JSON.parse(
					await npm('pack', `${name}@${version}`, '--pack-destination', dir, '--json'),
				);
				const [entry] = Array.isArray(packed) ? packed : [];
				const filename: unknown = isRecord(entry) ? entry.filename : undefined;
				if (typeof filename !== 'string')
					throw new UserError(`npm did not pack ${name}@${version}`);
				return { data: await readFile(path.join(dir, filename)), integrity };
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		},
		async publish(name, version, tarball) {
			const newest = (await versions(name)).every((other) => compareSemver(other, version) < 0);
			const dir = await mkdtemp(path.join(tmpdir(), 'n8n-contract-'));
			try {
				const file = path.join(dir, 'package.tgz');
				await writeFile(file, tarball);
				// npm moves `latest` only to the newest version; a backport patch gets its own tag.
				await npm('publish', file, '--access', 'public', ...(newest ? [] : ['--tag', 'backport']));
			} finally {
				await rm(dir, { recursive: true, force: true });
			}
		},
	};
}

export interface PublishOptions {
	readonly entryFile: string;
	readonly exportName: string;
	readonly fixtures: ContractFixtures;
	readonly registry: ContractRegistry;
	/** PEM of the ed25519 publisher key. It lives outside the repo. */
	readonly privateKey: string;
}

/**
 * Freezes HEAD, gates it against the newest published version below it, signs it, and
 * publishes it. A version already published with the same bundle is a no-op; with another
 * bundle it is refused.
 */
export async function publishAction(options: PublishOptions): Promise<VersionManifest> {
	const { registry, fixtures, privateKey } = options;
	const frozen = await freezeAction(options.entryFile, options.exportName);
	const { id, semver, bundleHash } = frozen.manifest;
	const name = packageNameOf(id);
	const published = await registry.versions(name);
	const open = async (version: string) => {
		const { data, integrity } = await registry.tarball(name, version);
		return openContractPackage(data, integrity).manifest;
	};
	if (published.includes(semver)) {
		const existing = await open(semver);
		if (existing.bundleHash === bundleHash) return existing;
		throw new UserError(`${id}@${semver} is published with other bytes; bump the version`);
	}
	const previous = published
		.filter((version) => compareSemver(version, semver) < 0)
		.sort(compareSemver)
		.at(-1);
	await checkPublish(previous ? await open(previous) : undefined, frozen, fixtures);
	await registry.publish(name, semver, packContractPackage(frozen, fixtures, privateKey));
	return frozen.manifest;
}
