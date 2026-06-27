import { createTeamProject, linkUserToProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember, createOwner } from '@test-integration/db/users';

import { N8nPackagesService } from '../n8n-packages.service';
import { FORMAT_VERSION } from '../spec/constants';
import { readExport } from './utils/tar-support';

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'ProjectRelation', 'Project']);
});

describe('project package export', () => {
	let service: N8nPackagesService;

	beforeAll(() => {
		service = Container.get(N8nPackagesService);
	});

	async function exportSingleProject(user: User, projectId: string) {
		const stream = await service.exportPackage({ user, projectIds: [projectId] });
		return await readExport(stream);
	}

	it('emits a tar with manifest.json first and project.json for an empty team project', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Empty Project', owner);

		const { manifest, entries } = await exportSingleProject(owner, project.id);

		expect(entries[0].name).toBe('manifest.json');
		expect(manifest).toMatchObject({
			packageFormatVersion: FORMAT_VERSION,
			exportedAt: expect.any(String),
			sourceN8nVersion: expect.any(String),
			sourceId: expect.any(String),
		});
		expect(manifest.projects).toEqual([
			{ id: project.id, name: 'Empty Project', target: expect.any(String) },
		]);
		expect(manifest.workflows).toBeUndefined();

		const projectFile = entries.find(
			(e) => e.name === `${manifest.projects![0].target}/project.json`,
		);
		expect(projectFile).toBeDefined();
		const serialized = JSON.parse(projectFile!.content.toString());
		expect(serialized).toEqual({
			id: project.id,
			name: 'Empty Project',
		});
	});

	it('allows a project editor to export an empty team project', async () => {
		const owner = await createOwner();
		const editor = await createMember();
		const project = await createTeamProject('Editor Project', owner);
		await linkUserToProject(editor, project, 'project:editor');

		const { manifest } = await exportSingleProject(editor, project.id);

		expect(manifest.projects).toEqual([
			{ id: project.id, name: 'Editor Project', target: expect.any(String) },
		]);
	});

	it('rejects export when the user lacks project access', async () => {
		const owner = await createOwner();
		const outsider = await createMember();
		const project = await createTeamProject('Private Project', owner);

		await expect(exportSingleProject(outsider, project.id)).rejects.toThrow(
			'1 project(s) not found or not accessible. Export aborted.',
		);
	});
});
