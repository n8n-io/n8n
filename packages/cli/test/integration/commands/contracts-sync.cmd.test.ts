import {
	npmNameOf,
	parseManifest,
	signStoreManifest,
	type VersionManifest as Manifest,
} from '@n8n/node-sdk/registry';
import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { NodeContractVersionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { hostRuntime } from '@n8n/node-sdk/host';
import { packageOf } from '@test/first-party-contracts';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { create } from 'tar';
import { mock } from 'vitest-mock-extended';

import { ContractsSyncCommand } from '@/commands/contracts/sync';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { ContractNodeLoader } from '@/node-contracts-registry';
import { setupTestCommand } from '@test-integration/utils/test-command';

const OLDER = path.resolve(
	__dirname,
	'../../../../@n8n/nodes-core/fixtures/versions/httpRequest.get@2.0.0',
);

const keyPair = () =>
	generateKeyPairSync('ed25519', {
		publicKeyEncoding: { type: 'spki', format: 'pem' },
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
	});
const keys = keyPair();

const contractLoader = new ContractNodeLoader(
	hostRuntime(),
	[],
	[],
	async () => ({ versions: async () => new Map(), credentials: async () => new Map() }),
	[],
	undefined,
	undefined,
	packageOf('httpRequest.get'),
);
Container.set(
	LoadNodesAndCredentials,
	Object.assign(mock<LoadNodesAndCredentials>(), {
		loaders: { [contractLoader.packageName]: contractLoader },
	}),
);
const command = setupTestCommand(ContractsSyncCommand);

const NAME = npmNameOf('httpRequest.get');

const state = { dir: '', manifest: undefined as unknown as Manifest, digest: '' };
/** The configured registry. It has no package. */
const registry = { requests: 0, server: createServer() };
/** Two npm registries, `/signed/` and `/untrusted/`: their packuments and tarballs by URL path. */
const npm = { url: '', server: createServer(), files: new Map<string, Buffer>() };

/** Packs the files of a version in `package/`, as `npm publish` uploads them. */
const tgzOf = async (files: Record<string, string>) => {
	const dir = await mkdtemp(path.join(state.dir, 'pack-'));
	await mkdir(path.join(dir, 'package'));
	await Promise.all(
		Object.entries(files).map(
			async ([file, text]) => await writeFile(path.join(dir, 'package', file), text),
		),
	);
	await create({ gzip: true, cwd: dir, file: path.join(dir, 'package.tgz') }, ['package']);
	return await readFile(path.join(dir, 'package.tgz'));
};

const listen = async (server: ReturnType<typeof createServer>) =>
	await new Promise<number>((resolve) =>
		server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)),
	);

const pinnedWorkflow = async (digest = state.digest) =>
	await createWorkflow({
		nodes: [
			{
				id: 'get',
				name: 'Get',
				type: '@n8n/nodes-core.httpRequestGet',
				typeVersion: 2,
				contract: { version: state.manifest.semver, digest },
				position: [0, 0],
				parameters: {},
			},
		],
	});

beforeAll(async () => {
	state.dir = await mkdtemp(path.join(tmpdir(), 'contracts-sync-'));
	const manifestText = await readFile(path.join(OLDER, 'manifest.json'), 'utf8');
	const bundle = await readFile(path.join(OLDER, 'bundle.cjs'), 'utf8');
	state.manifest = parseManifest(manifestText);
	state.digest = `sha256:${createHash('sha256').update(manifestText).digest('hex')}`;
	await contractLoader.loadAll();
	npm.server.on('request', (request, response) => {
		const body = npm.files.get(decodeURIComponent(request.url ?? ''));
		response.statusCode = body ? 200 : 404;
		response.end(body);
	});
	npm.url = `http://127.0.0.1:${await listen(npm.server)}`;
	const publish = async (prefix: string, key: string) => {
		const route = `/${prefix}/${NAME}/-/${state.manifest.semver}.tgz`;
		const n8n = { id: state.manifest.id, digest: state.digest };
		const packageJson = { name: NAME, version: state.manifest.semver, n8n };
		const signatures = [signStoreManifest(manifestText, key)];
		const files = {
			'package.json': JSON.stringify(packageJson),
			'manifest.json': manifestText,
			'bundle.cjs': bundle,
			'signatures.json': JSON.stringify(signatures),
		};
		npm.files.set(route, await tgzOf(files));
		const version = { ...packageJson, dist: { tarball: `${npm.url}${route}` } };
		const packument = { name: NAME, versions: { [state.manifest.semver]: version } };
		npm.files.set(`/${prefix}/${NAME}`, Buffer.from(JSON.stringify(packument)));
	};
	await publish('signed', keys.privateKey);
	await publish('untrusted', keyPair().privateKey);
	const publicKeyFile = path.join(state.dir, 'publisher.pem');
	await writeFile(publicKeyFile, keys.publicKey);
	registry.server.on('request', (_request, response) => {
		registry.requests += 1;
		response.statusCode = 404;
		response.end();
	});
	Object.assign(Container.get(GlobalConfig).instanceAi, {
		nodeContractsNpmRegistry: `http://127.0.0.1:${await listen(registry.server)}`,
		nodeContractsVettingKeyFile: publicKeyFile,
	});
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'NodeContractVersion']);
});

afterAll(async () => {
	registry.server.close();
	npm.server.close();
	await rm(state.dir, { recursive: true, force: true });
});

const storedVersions = async () =>
	(await Container.get(NodeContractVersionRepository).findManifests()).map(
		({ contractId, version }) => `${contractId}@${version}`,
	);

const other = (prefix: string) => `--registry=${npm.url}/${prefix}/`;

test('contracts:sync --registry adds each signed pinned version to the store', async () => {
	await pinnedWorkflow();

	await command.run([other('signed')]);

	expect(await storedVersions()).toEqual([`httpRequest.get@${state.manifest.semver}`]);
	expect(registry.requests).toBe(0);
});

test('contracts:sync fails when a saved workflow pins a version that the registry does not have', async () => {
	await pinnedWorkflow(`sha256:${'f'.repeat(64)}`);

	await expect(command.run([other('signed')])).rejects.toThrow(
		'Some saved workflows cannot run their pinned node versions',
	);
	expect(registry.requests).toBe(0);
});

test('contracts:sync fetches a missing pinned version from the configured registry', async () => {
	await pinnedWorkflow();
	const before = registry.requests;

	await expect(command.run([])).rejects.toThrow(
		'Some saved workflows cannot run their pinned node versions',
	);
	expect(registry.requests).toBeGreaterThan(before);
});

test('contracts:sync skips a version without the trusted signature', async () => {
	await pinnedWorkflow();

	await expect(command.run([other('untrusted')])).rejects.toThrow(
		'Some saved workflows cannot run their pinned node versions',
	);
	expect(await storedVersions()).toEqual([]);
});
