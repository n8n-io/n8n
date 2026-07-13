import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { FolderRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { createFolder } from '@test-integration/db/folders';
import { createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import { N8nPackagesService } from '../n8n-packages.service';
import type { FolderConflictPolicy, ImportPackageRequest } from '../n8n-packages.types';
import {
	buildEntityPackageBuffer,
	credentialRequirementsFromWorkflows,
	serializedFolder,
	serializedWorkflow,
	serializedWorkflowWithCredential,
} from './fixtures/package-fixtures';

type FolderImportParams = {
	user: User;
	projectId?: string;
	folderId?: string;
	packageBuffer: Buffer;
	folderConflictPolicy?: FolderConflictPolicy;
	apiKeyScopes?: string[];
};

async function importFolders(params: FolderImportParams) {
	const request: ImportPackageRequest = {
		user: params.user,
		projectId: params.projectId,
		folderId: params.folderId,
		packageBuffer: params.packageBuffer,
		apiKeyScopes: params.apiKeyScopes,
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'must-preexist',
		workflowConflictPolicy: 'new-version',
		workflowPublishingPolicy: 'preserve-published-state',
		workflowIdPolicy: 'new',
		folderConflictPolicy: params.folderConflictPolicy ?? 'merge',
	};
	return await Container.get(N8nPackagesService).importPackage(request);
}

const licenseMocker = new LicenseMocker();

async function findFolder(id: string) {
	return await Container.get(FolderRepository).findOne({
		where: { id },
		relations: { homeProject: true },
	});
}

async function findWorkflow(id: string) {
	return await Container.get(WorkflowRepository).findOne({
		where: { id },
		relations: { parentFolder: true },
	});
}

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
	licenseMocker.setDefaults({ features: ['feat:folders'] });
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate(['Folder', 'Project', 'SharedWorkflow', 'WorkflowEntity']);
	licenseMocker.reset();
});

describe('folder shell import', () => {
	let owner: User;
	let project: Project;

	beforeEach(async () => {
		owner = await createOwner();
		project = await createTeamProject('Target', owner);
	});

	it('creates a single empty folder at project root', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [
				{
					target: 'folders/to_production',
					folder: serializedFolder({ id: 'F1', name: 'to_production' }),
				},
			],
		});

		const result = await importFolders({ user: owner, projectId: project.id, packageBuffer });

		expect(result.folders).toEqual([
			{
				sourceFolderId: 'F1',
				localId: 'F1',
				name: 'to_production',
				parentFolderId: null,
				status: 'created',
			},
		]);
		expect(result.workflows).toEqual([]);
		const persisted = await findFolder('F1');
		expect(persisted?.name).toBe('to_production');
		expect(persisted?.parentFolderId).toBeNull();
		expect(persisted?.homeProject.id).toBe(project.id);
	});

	it('creates two empty folders at project root', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [
				{
					target: 'folders/to_production',
					folder: serializedFolder({ id: 'F1', name: 'to_production' }),
				},
				{
					target: 'folders/in_progress',
					folder: serializedFolder({ id: 'F2', name: 'in_progress' }),
				},
			],
		});

		const result = await importFolders({ user: owner, projectId: project.id, packageBuffer });

		expect(result.folders.map((f) => f.status)).toEqual(['created', 'created']);
		expect(await findFolder('F1')).not.toBeNull();
		expect(await findFolder('F2')).not.toBeNull();
	});

	it('recreates a nested folder under its parent', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [
				{
					target: 'folders/in_progress',
					folder: serializedFolder({ id: 'P', name: 'in_progress' }),
				},
				{
					target: 'folders/in_progress/nested',
					folder: serializedFolder({ id: 'C', name: 'nested', parentFolderId: 'P' }),
				},
			],
		});

		await importFolders({ user: owner, projectId: project.id, packageBuffer });

		expect((await findFolder('C'))?.parentFolderId).toBe('P');
	});

	it('anchors top-level folders under the request folderId', async () => {
		const anchor = await createFolder(project, { name: 'anchor' });
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [
				{
					target: 'folders/to_production',
					folder: serializedFolder({ id: 'F1', name: 'to_production' }),
				},
			],
		});

		const result = await importFolders({
			user: owner,
			projectId: project.id,
			folderId: anchor.id,
			packageBuffer,
		});

		expect(result.folders[0].parentFolderId).toBe(anchor.id);
		expect((await findFolder('F1'))?.parentFolderId).toBe(anchor.id);
	});

	it('topologically sorts a child listed before its parent', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [
				{
					target: 'folders/in_progress/nested',
					folder: serializedFolder({ id: 'C', name: 'nested', parentFolderId: 'P' }),
				},
				{
					target: 'folders/in_progress',
					folder: serializedFolder({ id: 'P', name: 'in_progress' }),
				},
			],
		});

		await importFolders({ user: owner, projectId: project.id, packageBuffer });

		expect((await findFolder('P'))?.parentFolderId).toBeNull();
		expect((await findFolder('C'))?.parentFolderId).toBe('P');
	});

	it('allows a duplicate name with a different id alongside an existing folder', async () => {
		await createFolder(project, { name: 'in_progress' });
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [
				{
					target: 'folders/in_progress',
					folder: serializedFolder({ id: 'B', name: 'in_progress' }),
				},
			],
		});

		const result = await importFolders({ user: owner, projectId: project.id, packageBuffer });

		expect(result.folders[0]).toMatchObject({ sourceFolderId: 'B', status: 'created' });
		const inProgress = await Container.get(FolderRepository).findBy({ name: 'in_progress' });
		expect(inProgress).toHaveLength(2);
	});

	describe('re-import (matched by id)', () => {
		const packageWith = async (name: string) =>
			await buildEntityPackageBuffer({
				folders: [{ target: 'folders/f', folder: serializedFolder({ id: 'F1', name }) }],
			});

		it('reuses the existing folder untouched under merge', async () => {
			await importFolders({
				user: owner,
				projectId: project.id,
				packageBuffer: await packageWith('old'),
			});
			const result = await importFolders({
				user: owner,
				projectId: project.id,
				packageBuffer: await packageWith('new'),
				folderConflictPolicy: 'merge',
			});

			expect(result.folders[0].status).toBe('skipped');
			expect((await findFolder('F1'))?.name).toBe('old');
		});

		it('blocks under fail', async () => {
			await importFolders({
				user: owner,
				projectId: project.id,
				packageBuffer: await packageWith('old'),
			});
			await expect(
				importFolders({
					user: owner,
					projectId: project.id,
					packageBuffer: await packageWith('new'),
					folderConflictPolicy: 'fail',
				}),
			).rejects.toBeInstanceOf(ConflictError);
			expect((await findFolder('F1'))?.name).toBe('old');
		});
	});

	it('blocks and persists nothing when a matched folder sits under a different parent', async () => {
		// First import places F1 at the project root.
		await importFolders({
			user: owner,
			projectId: project.id,
			packageBuffer: await buildEntityPackageBuffer({
				folders: [{ target: 'folders/f', folder: serializedFolder({ id: 'F1', name: 'f' }) }],
			}),
		});
		const anchor = await createFolder(project, { name: 'anchor' });
		const foldersBefore = await Container.get(FolderRepository).count();

		// Re-import anchored elsewhere: F1 would move → parent-mismatch conflict.
		await expect(
			importFolders({
				user: owner,
				projectId: project.id,
				folderId: anchor.id,
				packageBuffer: await buildEntityPackageBuffer({
					folders: [
						{ target: 'folders/f', folder: serializedFolder({ id: 'F1', name: 'f' }) },
						{ target: 'folders/f2', folder: serializedFolder({ id: 'F2', name: 'f2' }) },
					],
				}),
			}),
		).rejects.toBeInstanceOf(ConflictError);

		expect(await Container.get(FolderRepository).count()).toBe(foldersBefore);
		expect(await findFolder('F2')).toBeNull();
	});

	it('blocks when the folder id already exists in a different project', async () => {
		const otherProject = await createTeamProject('Other', owner);
		await importFolders({
			user: owner,
			projectId: otherProject.id,
			packageBuffer: await buildEntityPackageBuffer({
				folders: [{ target: 'folders/f', folder: serializedFolder({ id: 'F1', name: 'f' }) }],
			}),
		});

		await expect(
			importFolders({
				user: owner,
				projectId: project.id,
				packageBuffer: await buildEntityPackageBuffer({
					folders: [{ target: 'folders/f', folder: serializedFolder({ id: 'F1', name: 'f' }) }],
				}),
			}),
		).rejects.toBeInstanceOf(ConflictError);
	});

	it('rejects a package with folders when folders are not licensed', async () => {
		licenseMocker.disable('feat:folders');
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [{ target: 'folders/f', folder: serializedFolder({ id: 'F1', name: 'f' }) }],
		});

		await expect(
			importFolders({ user: owner, projectId: project.id, packageBuffer }),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it('rejects a folders package when the API key lacks the folder:create scope', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [{ target: 'folders/f', folder: serializedFolder({ id: 'F1', name: 'f' }) }],
		});

		await expect(
			importFolders({
				user: owner,
				projectId: project.id,
				packageBuffer,
				apiKeyScopes: ['workflow:import'],
			}),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it('reports the real parent for a nested folder reused on re-import', async () => {
		const pkg = async () =>
			await buildEntityPackageBuffer({
				folders: [
					{ target: 'folders/p', folder: serializedFolder({ id: 'P', name: 'p' }) },
					{
						target: 'folders/p/c',
						folder: serializedFolder({ id: 'C', name: 'c', parentFolderId: 'P' }),
					},
				],
			});

		await importFolders({ user: owner, projectId: project.id, packageBuffer: await pkg() });
		const result = await importFolders({
			user: owner,
			projectId: project.id,
			packageBuffer: await pkg(),
			folderConflictPolicy: 'merge',
		});

		expect(result.folders.find((f) => f.sourceFolderId === 'C')).toMatchObject({
			status: 'skipped',
			parentFolderId: 'P',
		});
	});

	it('imports a folder-nested workflow into its folder', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [
				{
					target: 'folders/in_progress',
					folder: serializedFolder({ id: 'F1', name: 'in_progress' }),
				},
			],
			workflows: [
				{
					target: 'folders/in_progress/workflows/triage',
					workflow: serializedWorkflow({ id: 'WF', name: 'triage' }),
				},
			],
		});

		const result = await importFolders({ user: owner, projectId: project.id, packageBuffer });

		expect(result.folders[0]).toMatchObject({ sourceFolderId: 'F1', status: 'created' });
		const summary = result.workflows.find((w) => w.sourceWorkflowId === 'WF');
		expect(summary).toMatchObject({ status: 'created', parentFolderId: 'F1' });
		// Assert the persisted row, not just the summary.
		expect((await findWorkflow(summary!.localId))?.parentFolder?.id).toBe('F1');
	});

	it('places each workflow under the folder it belongs to across a nested hierarchy', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [
				{
					target: 'folders/in_progress',
					folder: serializedFolder({ id: 'P', name: 'in_progress' }),
				},
				{
					target: 'folders/in_progress/nested',
					folder: serializedFolder({ id: 'C', name: 'nested', parentFolderId: 'P' }),
				},
			],
			workflows: [
				{
					target: 'folders/in_progress/workflows/triage',
					workflow: serializedWorkflow({ id: 'WF1', name: 'triage' }),
				},
				{
					target: 'folders/in_progress/nested/workflows/playground',
					workflow: serializedWorkflow({ id: 'WF2', name: 'playground' }),
				},
			],
		});

		const result = await importFolders({ user: owner, projectId: project.id, packageBuffer });

		const triage = result.workflows.find((w) => w.sourceWorkflowId === 'WF1')!;
		const playground = result.workflows.find((w) => w.sourceWorkflowId === 'WF2')!;
		expect((await findWorkflow(triage.localId))?.parentFolder?.id).toBe('P');
		expect((await findWorkflow(playground.localId))?.parentFolder?.id).toBe('C');
	});

	it('reuses the folder and updates the nested workflow on re-import', async () => {
		const pkg = async () =>
			await buildEntityPackageBuffer({
				folders: [
					{
						target: 'folders/in_progress',
						folder: serializedFolder({ id: 'F1', name: 'in_progress' }),
					},
				],
				workflows: [
					{
						target: 'folders/in_progress/workflows/triage',
						workflow: serializedWorkflow({ id: 'WF', name: 'triage' }),
					},
				],
			});

		const first = await importFolders({
			user: owner,
			projectId: project.id,
			packageBuffer: await pkg(),
		});
		const localId = first.workflows[0].localId;

		const second = await importFolders({
			user: owner,
			projectId: project.id,
			packageBuffer: await pkg(),
		});

		expect(second.workflows[0]).toMatchObject({ status: 'updated', localId, parentFolderId: 'F1' });
		expect(await Container.get(FolderRepository).countBy({ id: 'F1' })).toBe(1);
		expect(await Container.get(WorkflowRepository).countBy({ id: localId })).toBe(1);
	});

	it('rejects a folder-nested workflow whose folder is missing from the manifest', async () => {
		// Workflow nested under `folders/orphan`, but no such folder is declared.
		const packageBuffer = await buildEntityPackageBuffer({
			workflows: [
				{
					target: 'folders/orphan/workflows/triage',
					workflow: serializedWorkflow({ id: 'WF', name: 'triage' }),
				},
			],
		});

		await expect(
			importFolders({ user: owner, projectId: project.id, packageBuffer }),
		).rejects.toThrow(/missing from the manifest/i);
		expect(await Container.get(WorkflowRepository).countBy({ id: 'WF' })).toBe(0);
	});

	it('rejects a package whose manifest folder id disagrees with its folder.json', async () => {
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [{ target: 'folders/f', folder: serializedFolder({ id: 'real-id', name: 'f' }) }],
			// Manifest points the same target at a different id than folder.json declares.
			manifestExtras: { folders: [{ id: 'manifest-id', name: 'f', target: 'folders/f' }] },
		});

		await expect(
			importFolders({ user: owner, projectId: project.id, packageBuffer }),
		).rejects.toThrow(/declares id "real-id" but the manifest lists it as "manifest-id"/);
	});

	it('blocks when a folder-nested workflow needs a credential missing under must-preexist', async () => {
		const nestedWorkflow = serializedWorkflowWithCredential({
			id: 'WF',
			name: 'triage',
			credentialId: 'missing-cred',
			credentialName: 'Linear',
		});
		const packageBuffer = await buildEntityPackageBuffer({
			folders: [
				{
					target: 'folders/in_progress',
					folder: serializedFolder({ id: 'F1', name: 'in_progress' }),
				},
			],
			workflows: [{ target: 'folders/in_progress/workflows/triage', workflow: nestedWorkflow }],
			manifestExtras: {
				requirements: { credentials: credentialRequirementsFromWorkflows([nestedWorkflow]) },
			},
		});

		// The folder-nested workflow is now imported (LIGO-723), so its missing must-preexist credential
		// resolves through the same gate as a top-level workflow and blocks the import before any writes.
		await expect(
			importFolders({ user: owner, projectId: project.id, packageBuffer }),
		).rejects.toBeInstanceOf(UnprocessableRequestError);
		expect(await findFolder('F1')).toBeNull();
	});
});
