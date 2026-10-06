import {
	addToStore,
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
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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

const state = { dir: '', manifest: undefined as unknown as Manifest, digest: '' };
const registry = { requests: 0, server: createServer() };

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
	const publish = async (dir: string, key: string) =>
		await addToStore(path.join(state.dir, dir), [
			{ manifestText, bundle, signatures: [signStoreManifest(manifestText, key)] },
		]);
	await publish('signed', keys.privateKey);
	await publish('untrusted', keyPair().privateKey);
	const publicKeyFile = path.join(state.dir, 'publisher.pem');
	await writeFile(publicKeyFile, keys.publicKey);
	registry.server.on('request', (_request, response) => {
		registry.requests += 1;
		response.statusCode = 404;
		response.end();
	});
	const port = await new Promise<number>((resolve) =>
		registry.server.listen(0, '127.0.0.1', () =>
			resolve((registry.server.address() as AddressInfo).port),
		),
	);
	Object.assign(Container.get(GlobalConfig).instanceAi, {
		nodeContractsRegistryUrl: `http://127.0.0.1:${port}`,
		nodeContractsVettingKeyFile: publicKeyFile,
	});
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'NodeContractVersion']);
});

afterAll(async () => {
	registry.server.close();
	await rm(state.dir, { recursive: true, force: true });
});

const storedVersions = async () =>
	(await Container.get(NodeContractVersionRepository).findManifests()).map(
		({ contractId, version }) => `${contractId}@${version}`,
	);

const folder = (name: string) => `--registry=${pathToFileURL(path.join(state.dir, name)).href}`;

test('contracts:sync --registry=file://… adds each signed pinned version to the store', async () => {
	await pinnedWorkflow();

	await command.run([folder('signed')]);

	expect(await storedVersions()).toEqual([`httpRequest.get@${state.manifest.semver}`]);
	expect(registry.requests).toBe(0);
});

test('contracts:sync fails when a saved workflow pins a version that the registry does not have', async () => {
	await pinnedWorkflow(`sha256:${'f'.repeat(64)}`);

	await expect(command.run([folder('signed')])).rejects.toThrow(
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

	await expect(command.run([folder('untrusted')])).rejects.toThrow(
		'Some saved workflows cannot run their pinned node versions',
	);
	expect(await storedVersions()).toEqual([]);
});
