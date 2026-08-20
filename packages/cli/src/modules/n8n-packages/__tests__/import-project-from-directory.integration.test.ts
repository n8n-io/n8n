import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportRequest } from '../n8n-packages.types';

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);

let service: N8nPackagesService;
let owner: User;
let sourceDir: string;

// The fixed "git folder is source of truth, overwrite" policy the pull uses.
const importPolicy: Omit<ImportRequest, 'user'> = {
	projectConflictPolicy: 'overwrite',
	workflowConflictPolicy: 'new-version',
	workflowIdPolicy: 'source',
	workflowPublishingPolicy: 'match-source',
	missingNodeTypeMode: 'fail',
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'create-stub',
	folderConflictPolicy: 'merge',
	overwriteDeletionPolicy: 'archive',
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

		// Wipe the instance so the import recreates the project from the directory.
		await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'ProjectRelation', 'Project']);

		const result = await service.importPackageFromDirectory(
			{ user: owner, ...importPolicy },
			{ sourceDir },
		);

		expect(result.projects).toHaveLength(1);
		expect(result.projects[0]).toMatchObject({ name: 'Alpha Project', status: 'created' });
		expect(result.workflows.map((w) => w.name)).toEqual(['WF One']);
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
