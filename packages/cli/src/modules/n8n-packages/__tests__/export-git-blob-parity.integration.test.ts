import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { EventService } from '@/events/event.service';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { saveCredential } from '@test-integration/db/credentials';
import { createFolder } from '@test-integration/db/folders';
import { createTag } from '@test-integration/db/tags';
import { createOwner } from '@test-integration/db/users';
import { createProjectVariable } from '@test-integration/db/variables';

import { DirectoryPackageWriter } from '../io/directory/directory-package-writer';
import { HashingPackageWriter } from '../io/hashing-package-writer';
import { N8nPackagesService } from '../n8n-packages.service';
import { packageManifestSchema } from '../spec/manifest.schema';

async function readGitFileHashes() {
	const git = simpleGit(repoDir);
	await git.init(['--object-format=sha1']);
	await git.addConfig('core.autocrlf', 'false');
	await git.add('.');
	const tree = (await git.raw(['write-tree'])).trim();
	const entries = await git.raw(['ls-tree', '-r', '-z', tree]);
	return entries
		.split('\0')
		.filter(Boolean)
		.map((entry) => {
			const [metadata, path] = entry.split('\t');
			return { path, blobSha: metadata.split(' ')[2] };
		});
}

let service: N8nPackagesService;
let owner: User;
let repoDir: string;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'data-table']);
	await testDb.init();
	service = Container.get(N8nPackagesService);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'CredentialsEntity',
		'SharedCredentials',
		'DataTable',
		'DataTableColumn',
		'Variables',
		'TagEntity',
		'ProjectRelation',
		'Project',
	]);
	await Container.get(VariablesService).updateCache();
	mockDataTableSizeValidator();
	owner = await createOwner();
	repoDir = await mkdtemp(join(tmpdir(), 'n8n-export-parity-'));
});

afterEach(async () => {
	vi.restoreAllMocks();
	await rm(repoDir, { recursive: true, force: true, maxRetries: 3 });
});

describe('exported files vs git blob hashes', () => {
	it('matches Git for every file in a project export and returns its manifest and counts', async () => {
		const project = await createTeamProject('Parity Project', owner);
		const folder = await createFolder(project, { name: 'Nested' });
		await createProjectVariable('API_URL', 'https://example.com', project);
		const credential = await saveCredential(
			{ name: 'Header', type: 'httpHeaderAuth', data: { name: 'X-Auth', value: 'secret' } },
			{ project, role: 'credential:owner' },
		);
		const table = await Container.get(DataTableService).createDataTable(project.id, {
			name: 'Customers',
			columns: [{ name: 'email', type: 'string' }],
		});
		const workflow = await createWorkflow(
			{
				name: 'Zürich Parity Flow',
				parentFolder: folder,
				nodes: [
					{
						id: 'http',
						name: 'HTTP',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [200, 0],
						parameters: { url: '={{ $vars.API_URL }}', body: 'grüße ✓' },
						credentials: { httpHeaderAuth: { id: credential.id, name: credential.name } },
					},
					{
						id: 'table',
						name: 'Table',
						type: 'n8n-nodes-base.dataTable',
						typeVersion: 1,
						position: [400, 0],
						parameters: {
							operation: 'get',
							dataTableId: { __rl: true, mode: 'id', value: table.id },
						},
					},
				],
				connections: {},
			},
			project,
		);
		await createTag({ name: 'Production' }, workflow);
		const emit = vi.spyOn(Container.get(EventService), 'emit');
		const writer = new HashingPackageWriter();
		const directoryWriter = new DirectoryPackageWriter(repoDir);

		const result = await service.exportPackageToWriter(
			{ user: owner, projectIds: [project.id] },
			{
				async writeFile(path, content) {
					writer.writeFile(path, content);
					await directoryWriter.writeFile(path, content);
				},
				async writeDirectory(path) {
					writer.writeDirectory(path);
					await directoryWriter.writeDirectory(path);
				},
			},
		);

		expect(result.counts).toEqual({
			workflows: 1,
			folders: 1,
			credentials: 1,
			dataTables: 1,
			variables: 1,
			tags: 1,
		});
		expect(result.manifest).toEqual(
			packageManifestSchema.parse(
				jsonParse(await readFile(join(repoDir, 'manifest.json'), 'utf-8')),
			),
		);
		const files = writer.finalize();
		const gitFiles = await readGitFileHashes();
		expect(files).toHaveLength(gitFiles.length);
		expect(files).toEqual(expect.arrayContaining(gitFiles));
		expect(files).toContainEqual({
			path: `${result.manifest.workflows![0].target}/workflow-lifecycle.json`,
			blobSha: expect.any(String),
		});
		expect(emit).not.toHaveBeenCalledWith('n8n-package-exported', expect.anything());
	});

	it('matches Git for empty and binary files and replaces hashes only at the same path', async () => {
		const writer = new HashingPackageWriter();
		const directoryWriter = new DirectoryPackageWriter(repoDir);
		const files = [
			{ path: './projects/one/shared-id/data.json', content: 'first' },
			{ path: 'projects/one/shared-id/data.json', content: Buffer.from([0, 255, 13, 10]) },
			{ path: 'projects/two/shared-id/data.json', content: '' },
		];
		for (const { path, content } of files) {
			writer.writeFile(path, content);
			await directoryWriter.writeFile(path, content);
		}

		expect(writer.finalize()).toEqual(await readGitFileHashes());
	});
});
