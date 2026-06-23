import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { createFolder } from '@test-integration/db/folders';
import { createMember, createOwner } from '@test-integration/db/users';

import { N8nPackagesService } from '../n8n-packages.service';
import { readExport } from './utils/tar-support';

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'ProjectRelation',
		'Project',
	]);
});

describe('folder package export', () => {
	let service: N8nPackagesService;

	beforeAll(() => {
		service = Container.get(N8nPackagesService);
	});

	it('exports an empty folder as a folder.json shell with a manifest pointer', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const folder = await createFolder(project, { name: 'to_production' });

		const stream = await service.exportWorkflows({
			user: owner,
			workflowIds: [],
			folderIds: [folder.id],
		});
		const { manifest, entries } = await readExport(stream);

		expect(manifest.folders).toHaveLength(1);
		expect(manifest.folders![0]).toMatchObject({ id: folder.id, name: 'to_production' });
		const target = manifest.folders![0].target;
		expect(target).toMatch(/^folders\//);

		const folderFile = entries.find((e) => e.name === `${target}/folder.json`);
		expect(folderFile).toBeDefined();
		expect(jsonParse(folderFile!.content.toString())).toEqual({
			id: folder.id,
			name: 'to_production',
			parentFolderId: null,
		});
	});

	it('aborts the export when the user cannot access the folder', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Project A', owner);
		const folder = await createFolder(project, { name: 'to_production' });
		const outsider = await createMember();

		await expect(
			service.exportWorkflows({ user: outsider, workflowIds: [], folderIds: [folder.id] }),
		).rejects.toThrow(/not found or not accessible/);
	});
});
