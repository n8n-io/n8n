import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { CredentialTypes } from '@/credential-types.js';
import { BadRequestError } from '@/errors/response-errors/bad-request.error.js';
import { EventService } from '@/events/event.service.js';
import { affixRoleToSaveCredential, saveCredential } from '@test-integration/db/credentials.js';
import { createFolder } from '@test-integration/db/folders.js';
import { createMember, createOwner } from '@test-integration/db/users.js';
import { LicenseMocker } from '@test-integration/license.js';

import { TarPackageWriter } from '../io/tar/tar-package-writer.js';
import { N8nPackagesService } from '../n8n-packages.service.js';
import { FORMAT_VERSION } from '../spec/constants.js';
import {
	buildImportPackageBuffer,
	githubCredentialPayload,
	serializedWorkflow,
	serializedWorkflowWithCredential,
} from './fixtures/package-fixtures.js';
import { streamToBuffer } from './utils/tar-support.js';
import type { ImportPackageRequest } from '../n8n-packages.types.js';
import type { SerializedWorkflow } from '../spec/serialized/workflow.schema.js';

type ImportPackageParams = Omit<
	ImportPackageRequest,
	'credentialMatchingMode' | 'credentialMissingMode'
> &
	Partial<Pick<ImportPackageRequest, 'credentialMatchingMode' | 'credentialMissingMode'>>;

async function importPackage(params: ImportPackageParams) {
	return await Container.get(N8nPackagesService).importPackage({
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'must-preexist',
		...params,
	});
}

/**
 * Workflow with a structurally invalid connection: the source node referenced
 * by `connections` does not exist in `nodes`. `validateWorkflowStructure`
 * rejects this during the pipeline's pre-pass.
 */
const brokenWorkflow = (id: string, name: string): SerializedWorkflow =>
	serializedWorkflow({
		id,
		name,
		connections: {
			'Phantom Node That Does Not Exist': {
				main: [[{ node: 'Manual Trigger', type: 'main', index: 0 }]],
			},
		},
	});

const licenseMocker = new LicenseMocker();
const saveOwnedCredential = affixRoleToSaveCredential('credential:owner');

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	licenseMocker.mockLicenseState(Container.get(LicenseState));

	const credentialTypesMock = mockInstance(CredentialTypes);
	credentialTypesMock.recognizes.mockImplementation(
		(type: string) => type !== 'totallyUnknownCredentialType',
	);
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'Folder',
		'Project',
		'CredentialsEntity',
		'SharedCredentials',
	]);
});

describe('ImportPipeline batch validation', () => {
	it('rejects the package before any workflow is persisted when prepare-phase validation fails', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		const tarBuffer = await buildImportPackageBuffer([
			serializedWorkflow({ id: 'wf-source-1', name: 'Good Workflow' }),
			brokenWorkflow('wf-source-2', 'Broken Workflow'),
			serializedWorkflow({ id: 'wf-source-3', name: 'Never Reached' }),
		]);

		const workflowRepo = Container.get(WorkflowRepository);
		const sharedRepo = Container.get(SharedWorkflowRepository);

		const workflowsBefore = await workflowRepo.count();
		const sharedBefore = await sharedRepo.count({ where: { projectId: personalProject.id } });

		await expect(
			importPackage({
				user: owner,
				packageBuffer: tarBuffer,
			}),
		).rejects.toThrow();

		const workflowsAfter = await workflowRepo.count();
		const sharedAfter = await sharedRepo.count({ where: { projectId: personalProject.id } });

		expect(workflowsAfter).toBe(workflowsBefore);
		expect(sharedAfter).toBe(sharedBefore);
	});

	it('persists every workflow when the whole package is valid', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		const tarBuffer = await buildImportPackageBuffer([
			serializedWorkflow({ id: 'wf-source-1', name: 'First' }),
			serializedWorkflow({ id: 'wf-source-2', name: 'Second' }),
		]);

		const result = await importPackage({
			user: owner,
			packageBuffer: tarBuffer,
		});

		expect(result.workflows).toHaveLength(2);
		expect(result.credentials).toEqual({ matched: [] });

		const workflowRepo = Container.get(WorkflowRepository);
		const sharedRepo = Container.get(SharedWorkflowRepository);

		expect(await workflowRepo.count()).toBe(2);
		expect(await sharedRepo.count({ where: { projectId: personalProject.id } })).toBe(2);

		const allWorkflows = await workflowRepo.find({ order: { name: 'ASC' } });
		expect(allWorkflows.map((w) => w.sourceWorkflowId).sort()).toEqual([
			'wf-source-1',
			'wf-source-2',
		]);
	});
});

describe('ImportPipeline routing matrix', () => {
	async function singleWorkflowPackage(): Promise<Buffer> {
		return await buildImportPackageBuffer([
			serializedWorkflow({ id: 'wf-routed', name: 'Routed Workflow' }),
		]);
	}

	it("lands in the importer's personal project root when no projectId is given", async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		await importPackage({
			user: owner,
			packageBuffer: await singleWorkflowPackage(),
		});

		const shared = await Container.get(SharedWorkflowRepository).findOneOrFail({
			where: { projectId: personalProject.id },
		});
		expect(shared.role).toBe('workflow:owner');

		const workflow = await Container.get(WorkflowRepository).findOneOrFail({
			where: { sourceWorkflowId: 'wf-routed' },
			relations: ['parentFolder'],
		});
		expect(workflow.parentFolder).toBeNull();
	});

	it('lands in the requested folder of the personal project when only folderId is given', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const folder = await createFolder(personalProject, { name: 'Imports' });

		await importPackage({
			user: owner,
			folderId: folder.id,
			packageBuffer: await singleWorkflowPackage(),
		});

		const workflow = await Container.get(WorkflowRepository).findOneOrFail({
			where: { sourceWorkflowId: 'wf-routed' },
			relations: ['parentFolder'],
		});
		expect(workflow.parentFolder?.id).toBe(folder.id);
	});

	it('lands in the team project root when projectId is given and the user has scope', async () => {
		const owner = await createOwner();
		const teamProject = await createTeamProject('Team Project', owner);

		await importPackage({
			user: owner,
			projectId: teamProject.id,
			packageBuffer: await singleWorkflowPackage(),
		});

		const shared = await Container.get(SharedWorkflowRepository).findOneOrFail({
			where: { projectId: teamProject.id },
		});
		expect(shared.role).toBe('workflow:owner');

		const workflow = await Container.get(WorkflowRepository).findOneOrFail({
			where: { sourceWorkflowId: 'wf-routed' },
			relations: ['parentFolder'],
		});
		expect(workflow.parentFolder).toBeNull();
	});

	it('lands in the requested folder of the team project when both projectId and folderId are given', async () => {
		const owner = await createOwner();
		const teamProject = await createTeamProject('Team Project', owner);
		const folder = await createFolder(teamProject, { name: 'Team Imports' });

		await importPackage({
			user: owner,
			projectId: teamProject.id,
			folderId: folder.id,
			packageBuffer: await singleWorkflowPackage(),
		});

		const workflow = await Container.get(WorkflowRepository).findOneOrFail({
			where: { sourceWorkflowId: 'wf-routed' },
			relations: ['parentFolder'],
		});
		expect(workflow.parentFolder?.id).toBe(folder.id);
	});
});

describe('ImportPipeline rejection cases', () => {
	async function singleWorkflowPackage(): Promise<Buffer> {
		return await buildImportPackageBuffer([serializedWorkflow({ id: 'wf-x', name: 'X' })]);
	}

	it('rejects packages with an invalid manifest', async () => {
		const owner = await createOwner();
		const writer = new TarPackageWriter();
		writer.writeFile(
			'manifest.json',
			JSON.stringify({
				packageFormatVersion: '99',
				exportedAt: new Date().toISOString(),
				sourceN8nVersion: '1.0.0',
				sourceId: 'bad-manifest',
			}),
		);
		const tarBuffer = await streamToBuffer(writer.finalize());

		await expect(
			importPackage({
				user: owner,
				packageBuffer: tarBuffer,
			}),
		).rejects.toThrow(BadRequestError);
	});

	it('rejects when the requested projectId does not exist', async () => {
		const owner = await createOwner();

		await expect(
			importPackage({
				user: owner,
				projectId: 'does-not-exist',
				packageBuffer: await singleWorkflowPackage(),
			}),
		).rejects.toThrow(/Project not found/i);
	});

	it('rejects when the user lacks workflow:import on the target project', async () => {
		const owner = await createOwner();
		const teamProject = await createTeamProject('Owner-Only Project', owner);
		const outsider = await createMember();

		await expect(
			importPackage({
				user: outsider,
				projectId: teamProject.id,
				packageBuffer: await singleWorkflowPackage(),
			}),
		).rejects.toThrow();
	});

	it('rejects when the requested folder is not in the target project', async () => {
		const owner = await createOwner();
		const teamProject = await createTeamProject('Team Project', owner);
		// Folder lives in a *different* project.
		const otherProject = await createTeamProject('Other Project', owner);
		const strayFolder = await createFolder(otherProject, { name: 'Wrong Place' });

		await expect(
			importPackage({
				user: owner,
				projectId: teamProject.id,
				folderId: strayFolder.id,
				packageBuffer: await singleWorkflowPackage(),
			}),
		).rejects.toThrow(/folder/i);
	});

	it('rejects packages with a mismatched packageFormatVersion', async () => {
		const owner = await createOwner();
		const writer = new TarPackageWriter();
		writer.writeFile(
			'manifest.json',
			JSON.stringify({
				packageFormatVersion: '99',
				exportedAt: new Date().toISOString(),
				sourceN8nVersion: '1.0.0',
				sourceId: 'integration-test-source',
				workflows: [{ id: 'wf-x', name: 'X', target: 'workflows/wf-x' }],
			}),
		);
		writer.writeDirectory('workflows/wf-x');
		writer.writeFile(
			'workflows/wf-x/workflow.json',
			JSON.stringify(serializedWorkflow({ id: 'wf-x', name: 'X' })),
		);

		await expect(
			importPackage({
				user: owner,
				packageBuffer: await streamToBuffer(writer.finalize()),
			}),
		).rejects.toThrow(BadRequestError);
	});

	it('rejects when the manifest references a workflow file that is not in the tar', async () => {
		const owner = await createOwner();
		const writer = new TarPackageWriter();
		writer.writeFile(
			'manifest.json',
			JSON.stringify({
				packageFormatVersion: FORMAT_VERSION,
				exportedAt: new Date().toISOString(),
				sourceN8nVersion: '1.0.0',
				sourceId: 'integration-test-source',
				workflows: [{ id: 'wf-missing', name: 'Missing', target: 'workflows/nowhere-to-be-found' }],
			}),
		);
		// Intentionally NOT writing workflows/nowhere-to-be-found/workflow.json

		await expect(
			importPackage({
				user: owner,
				packageBuffer: await streamToBuffer(writer.finalize()),
			}),
		).rejects.toThrow(/missing/i);
	});
});

describe('ImportPipeline event emission', () => {
	it('emits workflow-created per workflow plus one workflows-imported on success', async () => {
		const owner = await createOwner();
		const eventService = Container.get(EventService);
		const emitSpy = jest.spyOn(eventService, 'emit');

		try {
			await importPackage({
				user: owner,
				packageBuffer: await buildImportPackageBuffer([
					serializedWorkflow({ id: 'wf-event-1', name: 'Event One' }),
					serializedWorkflow({ id: 'wf-event-2', name: 'Event Two' }),
				]),
			});

			const createdEvents = emitSpy.mock.calls.filter(([name]) => name === 'workflow-created');
			const importedEvents = emitSpy.mock.calls.filter(([name]) => name === 'workflows-imported');

			expect(createdEvents).toHaveLength(2);
			expect(
				createdEvents.every(([, payload]) => (payload as { source: string }).source === 'import'),
			).toBe(true);
			expect(importedEvents).toHaveLength(1);

			const importedPayload = importedEvents[0][1] as {
				workflowIds: string[];
				matchedCredentialIds: string[];
			};
			expect(importedPayload.workflowIds).toHaveLength(2);
			expect(importedPayload.matchedCredentialIds).toEqual([]);
		} finally {
			emitSpy.mockRestore();
		}
	});

	it('emits no events when the prepare-phase validation rejects the package', async () => {
		const owner = await createOwner();
		const eventService = Container.get(EventService);
		const emitSpy = jest.spyOn(eventService, 'emit');

		try {
			await expect(
				importPackage({
					user: owner,
					packageBuffer: await buildImportPackageBuffer([
						serializedWorkflow({ id: 'wf-good', name: 'Good' }),
						brokenWorkflow('wf-broken', 'Broken'),
					]),
				}),
			).rejects.toThrow();

			const created = emitSpy.mock.calls.filter(([name]) => name === 'workflow-created');
			const imported = emitSpy.mock.calls.filter(([name]) => name === 'workflows-imported');

			expect(created).toHaveLength(0);
			expect(imported).toHaveLength(0);
		} finally {
			emitSpy.mockRestore();
		}
	});
});

describe('ImportPipeline credential resolution', () => {
	const sourceId = 'credential-resolution-test';

	it('imports when credentials are accessible to the importer', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		const ownedCredential = await saveOwnedCredential(
			githubCredentialPayload({ name: 'GitHub Auth' }),
			{
				project: personalProject,
			},
		);
		const globalCredential = await saveCredential(
			githubCredentialPayload({ name: 'Global GitHub', isGlobal: true }),
			{ user: owner, role: 'credential:owner' },
		);

		const result = await importPackage({
			user: owner,
			packageBuffer: await buildImportPackageBuffer(
				[
					serializedWorkflowWithCredential({
						id: 'wf-with-owned-cred',
						name: 'With owned cred',
						credentialId: ownedCredential.id,
						credentialName: ownedCredential.name,
					}),
					serializedWorkflowWithCredential({
						id: 'wf-with-global-cred',
						name: 'With global cred',
						credentialId: globalCredential.id,
						credentialName: globalCredential.name,
					}),
				],
				{ sourceId },
			),
		});

		expect(result.credentials.matched).toHaveLength(2);
		expect(result.credentials.matched).toEqual(
			expect.arrayContaining([
				{ sourceId: ownedCredential.id, targetId: ownedCredential.id },
				{ sourceId: globalCredential.id, targetId: globalCredential.id },
			]),
		);
		expect(await Container.get(WorkflowRepository).count()).toBe(2);
	});

	it('reports mixed unknown_type and not_found failures in one response', async () => {
		const owner = await createOwner();

		await expect(
			importPackage({
				user: owner,
				packageBuffer: await buildImportPackageBuffer(
					[
						serializedWorkflowWithCredential({
							id: 'wf-unknown-type',
							name: 'Unknown Type',
							credentialId: 'cred-unknown',
							credentialName: 'Bad Type',
							credentialType: 'totallyUnknownCredentialType',
						}),
						serializedWorkflowWithCredential({
							id: 'wf-missing',
							name: 'Missing',
							credentialId: 'missing-a',
							credentialName: 'A',
						}),
					],
					{ sourceId },
				),
			}),
		).rejects.toMatchObject({
			meta: {
				failures: expect.arrayContaining([
					expect.objectContaining({ kind: 'unknown_type', sourceId: 'cred-unknown' }),
					expect.objectContaining({ kind: 'not_found', sourceId: 'missing-a' }),
				]),
			},
		});

		expect(await Container.get(WorkflowRepository).count()).toBe(0);
	});
});
