import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createOwner } from '@test-integration/db/users';

import { EventService } from '@/events/event.service';

import { N8nPackagesService } from '../n8n-packages.service';
import { FORMAT_VERSION } from '../spec/constants';

let service: N8nPackagesService;
let owner: User;
let targetDir: string;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
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
		'ProjectRelation',
		'Project',
	]);
	owner = await createOwner();
	targetDir = await mkdtemp(path.join(tmpdir(), 'n8n-export-dir-'));
});

afterEach(async () => {
	await rm(targetDir, { recursive: true, force: true });
});

async function readJson(...segments: string[]) {
	return JSON.parse(await readFile(path.join(targetDir, ...segments), 'utf-8'));
}

describe('exportPackageToDirectory', () => {
	it('writes the unzipped package straight into the target directory', async () => {
		const project = await createTeamProject('Alpha Project', owner);
		await createWorkflow({ name: 'WF One', nodes: [], connections: {} }, project);

		const result = await service.exportPackageToDirectory(
			{ user: owner, projectIds: [project.id] },
			{ targetDir },
		);

		const manifest = await readJson('manifest.json');
		expect(manifest).toMatchObject({ packageFormatVersion: FORMAT_VERSION });
		expect(manifest.projects).toEqual([
			{ id: project.id, name: 'Alpha Project', target: `projects/alpha-project-${project.id}` },
		]);
		expect(await readJson(`projects/alpha-project-${project.id}/project.json`)).toEqual({
			id: project.id,
			name: 'Alpha Project',
		});
		expect(result.counts.workflows).toBe(1);
	});

	it('writes multiple projects into one combined package', async () => {
		const alpha = await createTeamProject('Alpha Project', owner);
		const beta = await createTeamProject('Beta Project', owner);
		await createWorkflow({ name: 'Alpha Workflow', nodes: [], connections: {} }, alpha);
		await createWorkflow({ name: 'Beta Workflow', nodes: [], connections: {} }, beta);

		const result = await service.exportPackageToDirectory(
			{ user: owner, projectIds: [alpha.id, beta.id] },
			{ targetDir },
		);

		const manifest = await readJson('manifest.json');
		expect(manifest.projects).toEqual([
			{ id: alpha.id, name: 'Alpha Project', target: `projects/alpha-project-${alpha.id}` },
			{ id: beta.id, name: 'Beta Project', target: `projects/beta-project-${beta.id}` },
		]);
		expect(await readdir(targetDir)).toEqual(expect.arrayContaining(['manifest.json', 'projects']));
		expect(result.counts.workflows).toBe(2);
	});

	it('does not emit the user package-export event', async () => {
		const project = await createTeamProject('Alpha Project', owner);
		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		await service.exportPackageToDirectory(
			{ user: owner, projectIds: [project.id] },
			{ targetDir },
		);

		expect(emitSpy).not.toHaveBeenCalledWith('n8n-package-exported', expect.anything());
		emitSpy.mockRestore();
	});
});
