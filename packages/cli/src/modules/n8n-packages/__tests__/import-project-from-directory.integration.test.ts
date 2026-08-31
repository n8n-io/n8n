import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { EventService } from '@/events/event.service';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import { PackageImportConfig } from '../n8n-packages.config';
import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportRequest } from '../n8n-packages.types';

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);

let service: N8nPackagesService;
let owner: User;
let sourceDir: string;

const importPolicy: Omit<ImportRequest, 'user'> = {
	projectConflictPolicy: 'overwrite',
	workflowConflictPolicy: 'new-version',
	workflowIdPolicy: 'source',
	workflowPublishingPolicy: 'match-source',
	missingNodeTypeMode: 'fail',
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'create-stub',
	folderConflictPolicy: 'overwrite',
	overwriteDeletionPolicy: 'hard-delete',
	dataTableMatchingMode: 'by-id',
	dataTableMissingMode: 'create',
	dataTableSchemaConflictPolicy: 'keep-existing',
	variableMissingMode: 'create-with-value',
	variableConflictPolicy: 'overwrite',
	tagMissingMode: 'create',
	tagConflictPolicy: 'rename',
};

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	service = Container.get(N8nPackagesService);
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({
		features: ['feat:projectRole:admin', 'feat:folders'],
		quotas: { 'quota:maxTeamProjects': 100 },
	});
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
	licenseMocker.reset();
	owner = await createOwner();
	sourceDir = await mkdtemp(path.join(tmpdir(), 'n8n-import-dir-'));
});

afterEach(async () => {
	await rm(sourceDir, { recursive: true, force: true });
});

describe('importPackageFromDirectory', () => {
	it('imports the projects an exported directory contains', async () => {
		const project = await createTeamProject('Alpha Project', owner);
		await createWorkflow({ name: 'WF One', nodes: [], connections: {} }, project);
		await service.exportPackageToDirectory(
			{ user: owner, projectIds: [project.id] },
			{ targetDir: sourceDir },
		);

		// Force the create path.
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'ProjectRelation', 'Project']);

		const result = await service.importPackageFromDirectory(
			{ user: owner, ...importPolicy },
			{ sourceDir },
		);

		expect(result.projects).toHaveLength(1);
		expect(result.projects[0]).toMatchObject({ name: 'Alpha Project', status: 'created' });
		expect(result.workflows.map((w) => w.name)).toEqual(['WF One']);
	});

	it('overwrites an existing project and workflow to match the directory', async () => {
		const project = await createTeamProject('Alpha Project', owner);
		const workflow = await createWorkflow({ name: 'WF One', nodes: [], connections: {} }, project);
		await service.exportPackageToDirectory(
			{ user: owner, projectIds: [project.id] },
			{ targetDir: sourceDir },
		);

		// Drift existing rows to exercise overwrite.
		await Container.get(ProjectRepository).update(project.id, { name: 'Alpha Project (edited)' });
		await Container.get(WorkflowRepository).update(workflow.id, { name: 'WF One (edited)' });

		const result = await service.importPackageFromDirectory(
			{ user: owner, ...importPolicy },
			{ sourceDir },
		);

		expect(result.projects).toHaveLength(1);
		expect(result.projects[0]).toMatchObject({
			localId: project.id,
			name: 'Alpha Project',
			status: 'updated',
		});
		expect(result.workflows).toHaveLength(1);
		expect(result.workflows[0]).toMatchObject({
			localId: workflow.id,
			name: 'WF One',
			status: 'updated',
		});

		expect(await Container.get(ProjectRepository).count({ where: { type: 'team' } })).toBe(1);
		expect((await Container.get(ProjectRepository).findOneBy({ id: project.id }))?.name).toBe(
			'Alpha Project',
		);
		expect(await Container.get(WorkflowRepository).count()).toBe(1);
		expect((await Container.get(WorkflowRepository).findOneBy({ id: workflow.id }))?.name).toBe(
			'WF One',
		);
	});

	it('does not emit the user package-import event', async () => {
		const project = await createTeamProject('Alpha Project', owner);
		await createWorkflow({ name: 'WF One', nodes: [], connections: {} }, project);
		await service.exportPackageToDirectory(
			{ user: owner, projectIds: [project.id] },
			{ targetDir: sourceDir },
		);
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'ProjectRelation', 'Project']);

		const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

		await service.importPackageFromDirectory({ user: owner, ...importPolicy }, { sourceDir });

		expect(emitSpy).not.toHaveBeenCalledWith('n8n-package-imported', expect.anything());
		emitSpy.mockRestore();
	});

	it('rejects a working copy that exceeds the package-wide entry limit', async () => {
		const project = await createTeamProject('Alpha Project', owner);
		await createWorkflow({ name: 'WF One', nodes: [], connections: {} }, project);
		await service.exportPackageToDirectory(
			{ user: owner, projectIds: [project.id] },
			{ targetDir: sourceDir },
		);
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'ProjectRelation', 'Project']);

		const config = Container.get(PackageImportConfig);
		const originalMaxEntries = config.maxEntries;
		config.maxEntries = 1;
		try {
			await expect(
				service.importPackageFromDirectory({ user: owner, ...importPolicy }, { sourceDir }),
			).rejects.toThrow('too many entries');
		} finally {
			config.maxEntries = originalMaxEntries;
		}
	});

	it('is a no-op for a working copy with no projects', async () => {
		await service.exportPackageToDirectory(
			{ user: owner, projectIds: [] },
			{ targetDir: sourceDir },
		);

		const result = await service.importPackageFromDirectory(
			{ user: owner, ...importPolicy },
			{ sourceDir },
		);

		expect(result.projects).toHaveLength(0);
		expect(result.workflows).toHaveLength(0);
	});
});
