import { execFile } from 'node:child_process';
import { sign } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import { UserError, type INode } from 'n8n-workflow';

import { freezeAction, type FrozenAction } from './freeze';
import { evaluateBundle, executorOf, type ExecutorHost } from './runtime';
import { validate } from './validate';
import {
	canonicalJson,
	compareSemver,
	diffContracts,
	openContractPackage,
	packageNameOf,
	parseSemver,
	type ChangeKind,
	type ContractDiff,
	type ContractFixtures,
	type VersionManifest,
} from './version';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Replays fixtures through the current host executor: execution fixtures against the bundle,
 * migration pairs against its `migrate`. An executor change that alters an old version fails.
 */
export async function replayFixtures(
	{ manifest, bundle }: Pick<FrozenAction, 'manifest' | 'bundle'>,
	fixtures: ContractFixtures,
): Promise<string[]> {
	const action = evaluateBundle(bundle);
	const run = executorOf(action);
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
			const host: ExecutorHost = {
				itemCount: 1,
				node,
				parameter: (name) => fixture.params[name] ?? defaults.get(name),
				request: async () => {
					if (responses.length === 0) throw new UserError('No recorded response is left');
					return responses.shift();
				},
				continueOnFail: () => false,
			};
			const at = `${manifest.id}@${manifest.semver} fixture "${fixture.name}"`;
			try {
				const output = (await run(host)).map((item) => item.json);
				return [
					...(canonicalJson(output) === canonicalJson(fixture.output)
						? []
						: [`${at}: output ${JSON.stringify(output)}`]),
					...(responses.length ? [`${at}: ${responses.length} responses not requested`] : []),
				];
			} catch (error) {
				return [`${at}: ${errorMessage(error)}`];
			}
		}),
	);
	const migrations = (fixtures.migrations ?? []).flatMap(({ fromMajor, params, expected }) => {
		const at = `${manifest.id}@${manifest.semver} migration from ${fromMajor}`;
		if (!action.migrate) return [`${at}: the action has no migrate`];
		const migrated = action.migrate(fromMajor, params);
		return [
			...(canonicalJson(migrated) === canonicalJson(expected)
				? []
				: [`${at}: got ${JSON.stringify(migrated)}`]),
			...validate(migrated, action.inputSchema).map((issue) => `${at}: ${issue}`),
		];
	});
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
	if (fixtures.executions.length === 0) throw new UserError(`${at} needs an execution fixture`);
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
			if (!action.migrate) throw new UserError(`${at} breaks old input, so it needs migrate`);
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
	const { id, semver, abi, contractHash, bundleHash } = manifest;
	const packageJson = {
		name: packageNameOf(id),
		version: semver,
		description: manifest.contract.summary,
		license: 'SEE LICENSE IN manifest.json',
		// The registry copies these into the packument, so a resolver can filter before download.
		n8nContract: { id, abi, contractHash, bundleHash },
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
