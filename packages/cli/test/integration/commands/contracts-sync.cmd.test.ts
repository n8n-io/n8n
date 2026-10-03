import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { IWorkflowBase } from 'n8n-workflow';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { ContractsSyncCommand } from '@/commands/contracts/sync';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

interface Manifest {
	readonly id: string;
	readonly semver: string;
	readonly bundleHash: string;
	readonly contractHash: string;
}

// The cli does not depend on the node-sdk, so load it through the package that does.
const sdkRequire = createRequire(createRequire(__filename).resolve('@n8n/nodes-base-next'));
const sdk = sdkRequire('@n8n/node-sdk/registry') as {
	parseManifest(text: string): Manifest;
	addToStore(
		dir: string,
		versions: Array<{ manifestText: string; bundle: string; signatures: unknown[] }>,
	): Promise<unknown>;
	signStoreManifest(manifestText: string, privateKey: string): unknown;
};

const OLDER = path.resolve(
	__dirname,
	'../../../../@n8n/nodes-base-next/fixtures/versions/httpRequest.get@2.0.0',
);

const keyPair = () =>
	generateKeyPairSync('ed25519', {
		publicKeyEncoding: { type: 'spki', format: 'pem' },
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
	});
const keys = keyPair();

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(ContractsSyncCommand);

const state = { dir: '', storeDir: '', manifest: undefined as unknown as Manifest };
const registry = { requests: 0, server: createServer() };

const lockedWorkflow = async ({ id, semver, bundleHash, contractHash }: Manifest) =>
	await createWorkflow({
		nodes: [
			{
				id: 'get',
				name: 'Get',
				type: '@n8n/nodes-base-next.httpRequestGet',
				typeVersion: 2,
				position: [0, 0],
				parameters: {},
			},
		],
		meta: {
			nodeContracts: { Get: { action: id, version: semver, bundleHash, contractHash } },
		} as IWorkflowBase['meta'],
	});

beforeAll(async () => {
	state.dir = await mkdtemp(path.join(tmpdir(), 'contracts-sync-'));
	state.storeDir = path.join(Container.get(InstanceSettings).n8nFolder, 'node-contracts');
	const manifestText = await readFile(path.join(OLDER, 'manifest.json'), 'utf8');
	const bundle = await readFile(path.join(OLDER, 'bundle.cjs'), 'utf8');
	state.manifest = sdk.parseManifest(manifestText);
	const publish = async (dir: string, key: string) =>
		await sdk.addToStore(path.join(state.dir, dir), [
			{ manifestText, bundle, signatures: [sdk.signStoreManifest(manifestText, key)] },
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
		nodeContractsPublicKeyFile: publicKeyFile,
	});
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity']);
	await rm(state.storeDir, { recursive: true, force: true });
});

afterAll(async () => {
	registry.server.close();
	await rm(state.dir, { recursive: true, force: true });
	await rm(state.storeDir, { recursive: true, force: true });
});

const folder = (name: string) => `--registry=${pathToFileURL(path.join(state.dir, name)).href}`;

test('contracts:sync --registry=file://… adds each signed locked version to the store', async () => {
	await lockedWorkflow(state.manifest);

	await command.run([folder('signed')]);

	expect(await readdir(path.join(state.storeDir, 'index'))).toEqual(['httpRequest.get.ndjson']);
	expect(await readdir(path.join(state.storeDir, 'blobs/sha256'))).toContain(
		state.manifest.bundleHash,
	);
	expect(registry.requests).toBe(0);
});

test('contracts:sync fails when a saved workflow locks a version that the registry does not have', async () => {
	await lockedWorkflow({ ...state.manifest, bundleHash: 'f'.repeat(64) });

	await expect(command.run([folder('signed')])).rejects.toThrow(
		'Some saved workflows cannot run their locked node versions',
	);
	expect(registry.requests).toBe(0);
});

test('contracts:sync fetches a missing locked version from the configured registry', async () => {
	await lockedWorkflow(state.manifest);
	const before = registry.requests;

	await expect(command.run([])).rejects.toThrow(
		'Some saved workflows cannot run their locked node versions',
	);
	expect(registry.requests).toBeGreaterThan(before);
});

test('contracts:sync skips a version without the trusted signature', async () => {
	await lockedWorkflow(state.manifest);

	await expect(command.run([folder('untrusted')])).rejects.toThrow(
		'Some saved workflows cannot run their locked node versions',
	);
	expect(await readdir(state.storeDir).catch(() => [])).toEqual([]);
});
