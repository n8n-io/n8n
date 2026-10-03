import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { versionsOf } from '@n8n/nodes-base-next';
import type { IWorkflowBase } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ContractsExportCommand } from '@/commands/contracts/export';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeContractsStore } from '@/node-contracts-registry';
import { setupTestCommand } from '@test-integration/utils/test-command';

const OLDER = path.resolve(
	__dirname,
	'../../../../@n8n/nodes-base-next/fixtures/versions/httpRequest.get@2.0.0',
);

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(ContractsExportCommand);

const state = { dir: '' };

interface Manifest {
	readonly id: string;
	readonly semver: string;
	readonly bundleHash: string;
	readonly contractHash: string;
}

const lockedWorkflow = async ({ id, semver, bundleHash, contractHash }: Manifest) =>
	await createWorkflow({
		nodes: [],
		meta: {
			nodeContracts: { Get: { action: id, version: semver, bundleHash, contractHash } },
		} as IWorkflowBase['meta'],
	});

const store = async (manifestText: string, bundle: string) => {
	const manifest = JSON.parse(manifestText) as Manifest;
	await Container.get(NodeContractsStore).rows.insert([
		{
			id: manifest.id,
			version: manifest.semver,
			kind: 'action',
			manifest: `sha256:${createHash('sha256').update(manifestText).digest('hex')}`,
			manifestText,
			bundle,
			origin: 'private',
		},
	]);
	return manifest;
};

beforeAll(async () => {
	state.dir = await mkdtemp(path.join(tmpdir(), 'contracts-export-'));
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'NodeContractVersion']);
});

afterAll(async () => {
	await rm(state.dir, { recursive: true, force: true });
});

test('contracts:export --pinned writes only the stored versions that saved workflows lock', async () => {
	const older = await store(
		await readFile(path.join(OLDER, 'manifest.json'), 'utf8'),
		await readFile(path.join(OLDER, 'bundle.cjs'), 'utf8'),
	);
	const [head] = versionsOf('httpRequest.get');
	if (!head) throw new Error('httpRequest.get is not bundled');
	await store(`${JSON.stringify(head.manifest, null, '\t')}\n`, await head.readBundle());
	await lockedWorkflow(older);
	const output = path.join(state.dir, 'pinned');

	await command.run([`--output=${output}`, '--pinned']);

	const index = await readFile(path.join(output, 'index/httpRequest.get.ndjson'), 'utf8');
	expect(
		index
			.trim()
			.split('\n')
			.map((line) => (JSON.parse(line) as Manifest & { version: string }).version),
	).toEqual([older.semver]);
});

test('contracts:export writes every stored version', async () => {
	await store(
		await readFile(path.join(OLDER, 'manifest.json'), 'utf8'),
		await readFile(path.join(OLDER, 'bundle.cjs'), 'utf8'),
	);
	const output = path.join(state.dir, 'all');

	await command.run([`--output=${output}`]);

	expect(await readFile(path.join(output, 'catalog.json'), 'utf8')).toContain('"version":"2.0.0"');
});
