import { LicenseState } from '@n8n/backend-common';
import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Folder, Project } from '@n8n/db';
import {
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { CredentialTypes } from '@/credential-types';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { affixRoleToSaveCredential, saveCredential } from '@test-integration/db/credentials';
import { createFolder } from '@test-integration/db/folders';
import { createMember, createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';
import { initNodeTypes } from '@test-integration/utils';

import { TarPackageWriter } from '../io/tar/tar-package-writer';
import { N8nPackagesService } from '../n8n-packages.service';
import { WorkflowConflictPolicy, type ImportPackageRequest } from '../n8n-packages.types';
import { FORMAT_VERSION } from '../spec/constants';
import {
	buildImportPackageBuffer,
	githubCredentialPayload,
	serializedWorkflow,
	serializedWorkflowWithCredential,
} from './fixtures/package-fixtures';
import { streamToBuffer } from './utils/tar-support';
import type { SerializedWorkflow } from '../spec/serialized/workflow.schema';

type ImportPackageParams = Omit<
	ImportPackageRequest,
	'credentialMatchingMode' | 'credentialMissingMode' | 'workflowConflictPolicy'
> &
	Partial<
		Pick<
			ImportPackageRequest,
			'credentialMatchingMode' | 'credentialMissingMode' | 'workflowConflictPolicy'
		>
	>;

async function importPackage(params: ImportPackageParams) {
	return await Container.get(N8nPackagesService).importPackage({
		credentialMatchingMode: 'id-only',
		credentialMissingMode: 'must-preexist',
		workflowConflictPolicy: WorkflowConflictPolicy.Fail,
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

/**
 * Seeds an owned workflow in a project with a given `sourceWorkflowId` (the
 * `createWorkflow` helper's `Partial<IWorkflowDb>` param doesn't expose that
 * column, so it's set directly after creation).
 */
async function seedExistingWorkflow(
	project: Project,
	name: string,
	sourceWorkflowId: string,
	parentFolder?: Folder,
) {
	const workflow = await createWorkflow({ name }, project);
	await Container.get(WorkflowRepository).update(workflow.id, {
		sourceWorkflowId,
		...(parentFolder ? { parentFolder } : {}),
	});
	workflow.sourceWorkflowId = sourceWorkflowId;
	return workflow;
}

const licenseMocker = new LicenseMocker();
const saveOwnedCredential = affixRoleToSaveCredential('credential:owner');

// Reactivating an active workflow on new-version import calls into the active
// workflow manager; mock it so trigger registration succeeds without real infra.
const activeWorkflowManager = mockInstance(ActiveWorkflowManager);

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	// Register node types so the reactivation path's webhook-conflict check can
	// resolve the trigger nodes used by the seeded/imported workflows.
	await initNodeTypes();
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
		'WorkflowHistory',
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
		expect(result.bindings.credentials).toEqual({});

		const workflowRepo = Container.get(WorkflowRepository);
		const sharedRepo = Container.get(SharedWorkflowRepository);

		expect(await workflowRepo.count()).toBe(2);
		expect(await sharedRepo.count({ where: { projectId: personalProject.id } })).toBe(2);

		const allWorkflows = await workflowRepo.find({ order: { name: 'ASC' } });
		expect(allWorkflows.map((w) => w.sourceWorkflowId)).toEqual(['wf-source-1', 'wf-source-2']);
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

		const result = await importPackage({
			user: owner,
			packageBuffer: await singleWorkflowPackage(),
		});

		const shared = await Container.get(SharedWorkflowRepository).findOneOrFail({
			where: { projectId: personalProject.id },
		});
		expect(shared.role).toBe('workflow:owner');

		const workflow = await Container.get(WorkflowRepository).findOneOrFail({
			where: { name: 'Routed Workflow' },
			relations: ['parentFolder'],
		});
		expect(workflow.parentFolder).toBeNull();

		// The response carries the source→target workflow id binding.
		expect(result.bindings.workflows).toEqual({ 'wf-routed': workflow.id });
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
			where: { name: 'Routed Workflow' },
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
			where: { name: 'Routed Workflow' },
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
			where: { name: 'Routed Workflow' },
			relations: ['parentFolder'],
		});
		expect(workflow.parentFolder?.id).toBe(folder.id);
	});
});

describe('ImportPipeline workflow conflict policy', () => {
	it.each<WorkflowConflictPolicy>([WorkflowConflictPolicy.NewVersion, WorkflowConflictPolicy.Skip])(
		'%s handles matched and fresh workflows in one package',
		async (workflowConflictPolicy) => {
			const owner = await createOwner();
			const personalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(owner.id);
			const folder = await createFolder(personalProject, { name: 'Existing folder' });
			const existing = await seedExistingWorkflow(
				personalProject,
				'Existing workflow',
				'wf-existing',
				folder,
			);

			const baseNodes = serializedWorkflow({
				id: 'wf-existing',
				name: 'Imported replacement',
			}).nodes;

			const result = await importPackage({
				user: owner,
				packageBuffer: await buildImportPackageBuffer([
					serializedWorkflow({
						id: 'wf-existing',
						name: 'Imported replacement',
						nodes: [
							...baseNodes,
							{
								id: 'set-node',
								name: 'Set Data',
								type: 'n8n-nodes-base.set',
								typeVersion: 3,
								position: [200, 0],
								parameters: {},
							},
						],
					}),
					serializedWorkflow({ id: 'wf-fresh', name: 'Fresh workflow' }),
				]),
				workflowConflictPolicy,
			});

			const matchedSummary = result.workflows.find(
				({ sourceWorkflowId }) => sourceWorkflowId === 'wf-existing',
			);
			const freshSummary = result.workflows.find(
				({ sourceWorkflowId }) => sourceWorkflowId === 'wf-fresh',
			);

			expect(matchedSummary).toMatchObject({
				localId: existing.id,
				status:
					workflowConflictPolicy === WorkflowConflictPolicy.NewVersion ? 'updated' : 'skipped',
			});
			expect(freshSummary).toMatchObject({ status: 'created', name: 'Fresh workflow' });

			const workflows = await Container.get(WorkflowRepository).find();
			expect(workflows).toHaveLength(2);

			const storedExisting = await Container.get(WorkflowRepository).findOneOrFail({
				where: { id: existing.id },
				relations: ['parentFolder'],
			});
			expect(storedExisting.name).toBe(
				workflowConflictPolicy === WorkflowConflictPolicy.NewVersion
					? 'Imported replacement'
					: 'Existing workflow',
			);
			// The update path must leave the workflow in its original folder; the
			// handler only patches the response object's `parentFolder`, so assert
			// the persisted row directly rather than trusting that field.
			expect(storedExisting.parentFolder?.id).toBe(folder.id);
		},
	);

	it('new-version reactivates an active workflow and advances its active version', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		const active = await createActiveWorkflow({ name: 'Active workflow' }, personalProject);
		await Container.get(WorkflowRepository).update(active.id, { sourceWorkflowId: 'wf-active' });
		const originalActiveVersionId = active.activeVersionId;
		expect(originalActiveVersionId).not.toBeNull();

		const historyRepo = Container.get(WorkflowHistoryRepository);
		const historyBefore = await historyRepo.count({ where: { workflowId: active.id } });

		const result = await importPackage({
			user: owner,
			// Different nodes than the seeded workflow → saves a new version → republishes.
			// Uses a real trigger node so the reactivation validation passes.
			packageBuffer: await buildImportPackageBuffer([
				serializedWorkflow({
					id: 'wf-active',
					name: 'Active updated',
					nodes: [
						{
							id: 'schedule-trigger',
							name: 'Schedule Trigger',
							type: 'n8n-nodes-base.scheduleTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
				}),
			]),
			workflowConflictPolicy: WorkflowConflictPolicy.NewVersion,
		});

		const summary = result.workflows.find(
			({ sourceWorkflowId }) => sourceWorkflowId === 'wf-active',
		);
		expect(summary).toMatchObject({ localId: active.id, status: 'updated' });
		expect(summary?.activeVersionId).toEqual(expect.any(String));
		expect(summary?.activeVersionId).not.toBe(originalActiveVersionId);

		const stored = await Container.get(WorkflowRepository).findOneByOrFail({ id: active.id });
		expect(stored.active).toBe(true);
		expect(stored.activeVersionId).toBe(summary?.activeVersionId);
		expect(stored.activeVersionId).not.toBe(originalActiveVersionId);

		// A new history version was written for the imported content.
		const historyAfter = await historyRepo.count({ where: { workflowId: active.id } });
		expect(historyAfter).toBe(historyBefore + 1);

		// Reactivation went through the active workflow manager.
		expect(activeWorkflowManager.add).toHaveBeenCalled();
	});

	it('fails before writing any workflows when conflicts exist under fail policy', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		const existing = await seedExistingWorkflow(
			personalProject,
			'Existing workflow',
			'wf-existing',
		);
		const workflowRepo = Container.get(WorkflowRepository);
		const workflowsBefore = await workflowRepo.count();

		await expect(
			importPackage({
				user: owner,
				packageBuffer: await buildImportPackageBuffer([
					serializedWorkflow({ id: 'wf-existing', name: 'Conflicting workflow' }),
					serializedWorkflow({ id: 'wf-fresh', name: 'Fresh workflow' }),
				]),
				workflowConflictPolicy: WorkflowConflictPolicy.Fail,
			}),
		).rejects.toMatchObject({
			message: expect.stringContaining('already exist in the target project'),
			meta: {
				code: 'WORKFLOW_CONFLICT',
				conflicts: [
					{
						sourceWorkflowId: 'wf-existing',
						existingWorkflowId: existing.id,
						name: 'Existing workflow',
					},
				],
			},
		});

		expect(await workflowRepo.count()).toBe(workflowsBefore);
	});

	it('fails fast when duplicate sourceWorkflowId matches exist in the target project', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);
		await seedExistingWorkflow(personalProject, 'First match', 'wf-ambiguous');
		await seedExistingWorkflow(personalProject, 'Second match', 'wf-ambiguous');

		await expect(
			importPackage({
				user: owner,
				packageBuffer: await buildImportPackageBuffer([
					serializedWorkflow({ id: 'wf-ambiguous', name: 'Incoming' }),
				]),
				workflowConflictPolicy: WorkflowConflictPolicy.Skip,
			}),
		).rejects.toMatchObject({
			message: 'Multiple workflows in the target project share the same sourceWorkflowId',
			extra: { projectId: personalProject.id, sourceWorkflowId: 'wf-ambiguous' },
		});
	});

	it('matches a workflow authored on this instance when re-importing the package it exported', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		const original = await createWorkflow({ name: 'Authored here' }, personalProject);
		expect(original.sourceWorkflowId).toBeNull();

		const result = await importPackage({
			user: owner,
			packageBuffer: await buildImportPackageBuffer([
				serializedWorkflow({ id: original.id, name: 'Updated via re-import' }),
			]),
			workflowConflictPolicy: WorkflowConflictPolicy.NewVersion,
		});

		expect(result.workflows).toEqual([
			expect.objectContaining({
				sourceWorkflowId: original.id,
				localId: original.id,
				status: 'updated',
			}),
		]);
		expect(result.bindings.workflows).toEqual({ [original.id]: original.id });

		// Updated in place — no duplicate created.
		const workflows = await Container.get(WorkflowRepository).find();
		expect(workflows).toHaveLength(1);
		expect(workflows[0].name).toBe('Updated via re-import');
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

		expect(result.bindings.credentials).toEqual({
			[ownedCredential.id]: ownedCredential.id,
			[globalCredential.id]: globalCredential.id,
		});
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
