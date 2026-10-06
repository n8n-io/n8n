import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { hostRuntime } from '@n8n/node-sdk/host';
import { packageOf, versionsOf } from '@test/first-party-contracts';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { ContractsExportCommand } from '@/commands/contracts/export';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { ContractNodeLoader, NodeContractsStore } from '@/node-contracts-registry';
import { setupTestCommand } from '@test-integration/utils/test-command';

const OLDER = path.resolve(
	__dirname,
	'../../../../@n8n/nodes-core/fixtures/versions/httpRequest.get@2.0.0',
);

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
const command = setupTestCommand(ContractsExportCommand);

const state = { dir: '' };

interface Manifest {
	readonly id: string;
	readonly semver: string;
}

const pinnedWorkflow = async ({ semver, digest }: Manifest & { digest: string }) =>
	await createWorkflow({
		nodes: [
			{
				id: 'get',
				name: 'Get',
				type: '@n8n/nodes-core.httpRequestGet',
				typeVersion: 2,
				contract: { version: semver, digest },
				position: [0, 0],
				parameters: {},
			},
		],
	});

const store = async (manifestText: string, bundle: string) => {
	const manifest = JSON.parse(manifestText) as Manifest;
	const digest = `sha256:${createHash('sha256').update(manifestText).digest('hex')}`;
	await Container.get(NodeContractsStore).rows.insert([
		{
			id: manifest.id,
			version: manifest.semver,
			kind: 'action',
			manifest: digest,
			manifestText,
			bundle,
			origin: 'private',
		},
	]);
	return { ...manifest, digest };
};

beforeAll(async () => {
	state.dir = await mkdtemp(path.join(tmpdir(), 'contracts-export-'));
	await contractLoader.loadAll();
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'NodeContractVersion']);
});

afterAll(async () => {
	await rm(state.dir, { recursive: true, force: true });
});

test('contracts:export --pinned writes only the stored versions that saved workflows pin', async () => {
	const older = await store(
		await readFile(path.join(OLDER, 'manifest.json'), 'utf8'),
		await readFile(path.join(OLDER, 'bundle.cjs'), 'utf8'),
	);
	const [head] = versionsOf('httpRequest.get');
	if (!head) throw new Error('httpRequest.get is not bundled');
	await store(`${JSON.stringify(head.manifest, null, '\t')}\n`, await head.readBundle());
	await pinnedWorkflow(older);
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
