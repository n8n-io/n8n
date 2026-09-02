import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Folder, Project, User, WorkflowEntity } from '@n8n/db';
import { FolderRepository, ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { mockDataTableSizeValidator } from '@/modules/data-table/__tests__/test-helpers';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { saveCredential } from '@test-integration/db/credentials';
import { createFolder } from '@test-integration/db/folders';
import { createTag } from '@test-integration/db/tags';
import { createOwner } from '@test-integration/db/users';
import { createVariable } from '@test-integration/db/variables';
import { LicenseMocker } from '@test-integration/license';
import { initCredentialsTypes, initNodeTypes } from '@test-integration/utils';

import { N8nPackagesService } from '../n8n-packages.service';
import type { ImportRequest } from '../n8n-packages.types';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';
import {
	buildWorkflowReferencingCredential,
	buildWorkflowReferencingDataTables,
	buildWorkflowReferencingVariables,
} from './utils/test-builders';

const licenseMocker = new LicenseMocker();

mockInstance(ActiveWorkflowManager);

let service: N8nPackagesService;
let dataTableService: DataTableService;
let owner: User;
let project: Project;
let exportDir: string;

/** Reimporting the package it just produced must put everything back where it was. */
const importPolicy: Omit<ImportRequest, 'user'> = {
	projectConflictPolicy: 'overwrite',
	workflowConflictPolicy: 'new-version',
	workflowIdPolicy: 'source',
	workflowPublishingPolicy: 'match-source',
	missingNodeTypeMode: 'import-anyway',
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

// One project holding every entity type a package can carry, with names that
// collide where the old numeric suffix used to decide the file.
let sharedFolder: Folder;
let siblingFolder: Folder;
let nestedFolder: Folder;
let rootWorkflow: WorkflowEntity;
let duplicateRootWorkflow: WorkflowEntity;
let nestedWorkflow: WorkflowEntity;
let tableWorkflow: WorkflowEntity;
let credentialId: string;
let variableId: string;
let dataTableId: string;
let tagId: string;

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages', 'data-table']);
	await testDb.init();
	await initNodeTypes();
	await initCredentialsTypes();
	mockDataTableSizeValidator();
	service = Container.get(N8nPackagesService);
	dataTableService = Container.get(DataTableService);
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({
		features: ['feat:projectRole:admin', 'feat:folders', 'feat:variables', 'feat:sharing'],
		quotas: { 'quota:maxTeamProjects': 100, 'quota:maxVariables': 100 },
	});
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowTagMapping',
		'TagEntity',
		'Folder',
		'WorkflowEntity',
		'SharedWorkflow',
		'SharedCredentials',
		'CredentialsEntity',
		'DataTable',
		'DataTableColumn',
		'Variables',
		'ProjectRelation',
		'Project',
	]);
	// The variables cache outlives the truncate above.
	await Container.get(VariablesService).updateCache();
	licenseMocker.reset();
	exportDir = await mkdtemp(path.join(tmpdir(), 'n8n-stable-targets-'));

	owner = await createOwner();
	project = await createTeamProject('Payments', owner);

	sharedFolder = await createFolder(project, { name: 'Q3 Reports' });
	siblingFolder = await createFolder(project, { name: 'Q3 Reports' });
	nestedFolder = await createFolder(project, { name: 'Drafts', parentFolder: sharedFolder });

	const variable = await createVariable('API_URL', 'https://api.example.com');
	variableId = variable.id;
	rootWorkflow = await buildWorkflowReferencingVariables({
		name: 'Daily Report',
		project,
		variableNames: ['API_URL'],
	});
	duplicateRootWorkflow = await createWorkflow({ name: 'Daily Report' }, project);

	const credential = await saveCredential(
		{ name: 'Stripe API', type: 'httpHeaderAuth', data: { name: 'X', value: 'y' } },
		{ project, role: 'credential:owner' },
	);
	credentialId = credential.id;
	nestedWorkflow = await buildWorkflowReferencingCredential({
		name: 'Nested Flow',
		project,
		credential,
		parentFolder: nestedFolder,
	});

	const dataTable = await dataTableService.createDataTable(project.id, {
		name: 'Customers',
		columns: [{ name: 'email', type: 'string' }],
	});
	dataTableId = dataTable.id;
	tableWorkflow = await buildWorkflowReferencingDataTables({
		name: 'Customer Sync',
		project,
		references: [{ dataTableId: dataTable.id }],
		parentFolder: siblingFolder,
	});

	const tag = await createTag({ name: 'production' }, rootWorkflow);
	tagId = tag.id;
});

afterEach(async () => {
	await rm(exportDir, { recursive: true, force: true });
});

async function exportTo(targetDir: string): Promise<PackageManifest> {
	await service.exportPackageToDirectory(
		{
			user: owner,
			projectIds: [project.id],
			includeTags: true,
			includeVariableValues: true,
			canExportVariableValues: true,
			workflowVersionPolicy: 'latest',
		},
		{ targetDir },
	);
	const raw = await readFile(path.join(targetDir, 'manifest.json'), 'utf-8');
	return JSON.parse(raw) as PackageManifest;
}

function allEntries(manifest: PackageManifest): ManifestEntry[] {
	return [
		...(manifest.projects ?? []),
		...(manifest.folders ?? []),
		...(manifest.workflows ?? []),
		...(manifest.credentials ?? []),
		...(manifest.variables ?? []),
		...(manifest.dataTables ?? []),
		...(manifest.tags ?? []),
	];
}

function targetsById(manifest: PackageManifest): Map<string, string> {
	return new Map(allEntries(manifest).map((entry) => [entry.id, entry.target]));
}

/** Entity ids carry no hyphen, so the id is the leaf's final hyphen-separated segment. */
function idFromTarget(target: string): string {
	return target.split('/').at(-1)!.split('-').at(-1)!;
}

async function parentFolderIdOf(workflowId: string): Promise<string | null> {
	const found = await Container.get(WorkflowRepository).findOne({
		where: { id: workflowId },
		relations: ['parentFolder'],
	});
	return found?.parentFolder?.id ?? null;
}

describe('stable export targets', () => {
	it('names every entity directory after its slug and its id', async () => {
		const manifest = await exportTo(exportDir);
		const targets = targetsById(manifest);

		expect(targets.get(project.id)).toBe(`projects/payments-${project.id}`);
		expect(targets.get(sharedFolder.id)).toBe(
			`projects/payments-${project.id}/folders/q3-reports-${sharedFolder.id}`,
		);
		expect(targets.get(nestedFolder.id)).toBe(
			`projects/payments-${project.id}/folders/q3-reports-${sharedFolder.id}/drafts-${nestedFolder.id}`,
		);
		expect(targets.get(nestedWorkflow.id)).toBe(
			`${targets.get(nestedFolder.id)!}/workflows/nested-flow-${nestedWorkflow.id}`,
		);
		expect(targets.get(credentialId)).toBe(
			`projects/payments-${project.id}/credentials/stripe-api-${credentialId}`,
		);
		expect(targets.get(dataTableId)).toBe(
			`projects/payments-${project.id}/data-tables/customers-${dataTableId}`,
		);
		expect(targets.get(variableId)).toBe(`variables/apiurl-${variableId}`);
		expect(targets.get(tagId)).toBe(`tags/production-${tagId}`);

		// Nothing may fall back to a bare slug, whatever the entity type.
		for (const entry of allEntries(manifest)) {
			expect(idFromTarget(entry.target)).toBe(entry.id);
		}
	});

	it('gives same-named siblings their own directories', async () => {
		const manifest = await exportTo(exportDir);
		const targets = targetsById(manifest);

		expect(targets.get(sharedFolder.id)).not.toBe(targets.get(siblingFolder.id));
		expect(targets.get(rootWorkflow.id)).not.toBe(targets.get(duplicateRootWorkflow.id));
		// Both share the slug, so only the id tells the two files apart.
		expect(targets.get(rootWorkflow.id)).toBe(
			`projects/payments-${project.id}/workflows/daily-report-${rootWorkflow.id}`,
		);
		expect(targets.get(duplicateRootWorkflow.id)).toBe(
			`projects/payments-${project.id}/workflows/daily-report-${duplicateRootWorkflow.id}`,
		);
	});

	it('writes the same targets when the project is exported again unchanged', async () => {
		const first = await exportTo(exportDir);

		const secondDir = await mkdtemp(path.join(tmpdir(), 'n8n-stable-targets-again-'));
		try {
			const second = await exportTo(secondDir);
			expect(targetsById(second)).toEqual(targetsById(first));
		} finally {
			await rm(secondDir, { recursive: true, force: true });
		}
	});

	it('keeps every id segment when entities are renamed', async () => {
		const before = await exportTo(exportDir);

		await Container.get(ProjectRepository).update(project.id, { name: 'Payments EMEA' });
		await Container.get(FolderRepository).update(sharedFolder.id, { name: 'Q4 Reports' });
		await Container.get(WorkflowRepository).update(rootWorkflow.id, { name: 'Daily Digest' });

		const renamedDir = await mkdtemp(path.join(tmpdir(), 'n8n-stable-targets-renamed-'));
		try {
			const after = await exportTo(renamedDir);
			const targets = targetsById(after);

			// The slug follows the new name, so the paths do move.
			expect(targets.get(project.id)).toBe(`projects/payments-emea-${project.id}`);
			expect(targets.get(rootWorkflow.id)).toBe(
				`projects/payments-emea-${project.id}/workflows/daily-digest-${rootWorkflow.id}`,
			);
			expect(targets.get(sharedFolder.id)).toBe(
				`projects/payments-emea-${project.id}/folders/q4-reports-${sharedFolder.id}`,
			);

			// What must not move is the identity: every entity, including the ones
			// only dragged along by a renamed ancestor, still resolves to its own id.
			for (const [id, target] of targets) {
				expect(idFromTarget(target)).toBe(id);
			}
			expect([...targets.keys()].sort()).toEqual([...targetsById(before).keys()].sort());
		} finally {
			await rm(renamedDir, { recursive: true, force: true });
		}
	});

	it('puts every workflow back in its own folder when the package is imported again', async () => {
		await exportTo(exportDir);

		const result = await service.importPackageFromDirectory(
			{ user: owner, ...importPolicy },
			{ sourceDir: exportDir },
		);

		expect(result.projects).toHaveLength(1);
		// A workflow's parent folder is derived from its path, so a broken layout
		// would silently land these at the project root instead.
		expect(await parentFolderIdOf(nestedWorkflow.id)).toBe(nestedFolder.id);
		expect(await parentFolderIdOf(tableWorkflow.id)).toBe(siblingFolder.id);
		expect(await parentFolderIdOf(rootWorkflow.id)).toBeNull();
		expect(await parentFolderIdOf(duplicateRootWorkflow.id)).toBeNull();
	});
});
