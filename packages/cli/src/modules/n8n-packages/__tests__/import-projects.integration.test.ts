import { LicenseState } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { FolderRepository, ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportPackageRequest } from '../n8n-packages.types';
import {
	buildEntityPackageBuffer,
	serializedFolder,
	serializedProject,
	serializedWorkflow,
} from './fixtures/package-fixtures';

async function importProjects(user: User, packageBuffer: Buffer, apiKeyScopes?: string[]) {
	const request: ImportPackageRequest = {
		user,
		packageBuffer,
		apiKeyScopes,
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'must-preexist',
		workflowConflictPolicy: 'new-version',
		workflowPublishingPolicy: 'preserve-published-state',
		workflowIdPolicy: 'new',
		folderConflictPolicy: 'merge',
	};
	return await Container.get(N8nPackagesService).importPackage(request);
}

const licenseMocker = new LicenseMocker();

async function findProject(id: string) {
	return await Container.get(ProjectRepository).findOne({ where: { id } });
}

async function isAdminOf(projectId: string, userId: string): Promise<boolean> {
	const count = await Container.get(ProjectRelationRepository).count({
		where: { projectId, userId, role: { slug: 'project:admin' } },
	});
	return count > 0;
}

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({
		features: ['feat:projectRole:admin'],
		quotas: { 'quota:maxTeamProjects': 100 },
	});
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'Folder',
		'Project',
		'ProjectRelation',
		'SharedWorkflow',
		'WorkflowEntity',
	]);
	licenseMocker.reset();
});

describe('project shell import', () => {
	let owner: User;

	beforeEach(async () => {
		owner = await createOwner();
	});

	it('creates a team project owned by the importer, reusing the source id', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
			],
		});

		const result = await importProjects(owner, packageBuffer);

		expect(result.projects).toEqual([
			{ sourceProjectId: 'P1', localId: 'P1', name: 'brie', status: 'created' },
		]);
		const project = await findProject('P1');
		expect(project?.name).toBe('brie');
		expect(project?.type).toBe('team');
		expect(await isAdminOf('P1', owner.id)).toBe(true);
	});

	it('creates multiple projects in one package', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
				{ target: 'projects/stilton', project: serializedProject({ id: 'P2', name: 'stilton' }) },
			],
		});

		const result = await importProjects(owner, packageBuffer);

		expect(result.projects.map((p) => p.localId).sort()).toEqual(['P1', 'P2']);
		expect(await findProject('P1')).not.toBeNull();
		expect(await findProject('P2')).not.toBeNull();
	});

	it('creates two distinct projects that share a name but differ by id', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
				{ target: 'projects/brie-1', project: serializedProject({ id: 'P2', name: 'brie' }) },
			],
		});

		await importProjects(owner, packageBuffer);

		expect((await findProject('P1'))?.name).toBe('brie');
		expect((await findProject('P2'))?.name).toBe('brie');
	});

	it('matches an existing project by id on re-import and updates it in place', async () => {
		await importProjects(
			owner,
			await buildEntityPackageBuffer({
				projects: [
					{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
				],
			}),
		);

		const result = await importProjects(
			owner,
			await buildEntityPackageBuffer({
				projects: [
					{
						target: 'projects/brie',
						project: serializedProject({ id: 'P1', name: 'brie renamed' }),
					},
				],
			}),
		);

		expect(result.projects).toEqual([
			{ sourceProjectId: 'P1', localId: 'P1', name: 'brie renamed', status: 'updated' },
		]);
		expect(await Container.get(ProjectRepository).count({ where: { type: 'team' } })).toBe(1);
		expect((await findProject('P1'))?.name).toBe('brie renamed');
	});

	it('rejects a project package when the API key lacks the project:create scope', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
			],
		});

		await expect(importProjects(owner, packageBuffer, ['workflow:import'])).rejects.toBeInstanceOf(
			ForbiddenError,
		);
	});

	it('refuses to import over an existing personal project id', async () => {
		const personal = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: personal.id, name: 'brie' }) },
			],
		});

		await expect(importProjects(owner, packageBuffer)).rejects.toBeInstanceOf(ForbiddenError);
	});

	it('ignores folders and workflows nested inside the project (deferred to a follow-up)', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			projects: [
				{ target: 'projects/brie', project: serializedProject({ id: 'P1', name: 'brie' }) },
			],
			folders: [
				{
					target: 'projects/brie/folders/in_progress',
					folder: serializedFolder({ id: 'NestedFolder', name: 'in_progress' }),
				},
			],
			workflows: [
				{
					target: 'projects/brie/folders/in_progress/workflows/triage',
					workflow: serializedWorkflow({ id: 'NestedWf', name: 'triage' }),
				},
			],
		});

		const result = await importProjects(owner, packageBuffer);

		expect(result.projects.map((p) => p.localId)).toEqual(['P1']);
		expect(result.folders).toEqual([]);
		expect(result.workflows).toEqual([]);
		expect(await Container.get(FolderRepository).findOneBy({ id: 'NestedFolder' })).toBeNull();
	});
});
