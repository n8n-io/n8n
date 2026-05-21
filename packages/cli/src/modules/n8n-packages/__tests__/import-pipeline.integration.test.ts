import { LicenseState } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Readable } from 'node:stream';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';

import { createFolder } from '@test-integration/db/folders';
import { createMember, createOwner } from '@test-integration/db/users';
import { LicenseMocker } from '@test-integration/license';

import { N8nPackagesService } from '../n8n-packages.service';
import { TarPackageWriter } from '../io/tar/tar-package-writer';
import { FORMAT_VERSION } from '../spec/constants';
import type { PackageManifest } from '../spec/manifest.schema';
import type { SerializedWorkflow } from '../spec/serialized/workflow.schema';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
	}
	return Buffer.concat(chunks);
}

const validWorkflow = (id: string, name: string): SerializedWorkflow => ({
	id,
	name,
	nodes: [
		{
			id: 'manual-trigger',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
	versionId: 'wire-version-id',
	parentFolderId: null,
	active: false,
	isArchived: false,
});

/**
 * Workflow with a structurally invalid connection: the source node referenced
 * by `connections` does not exist in `nodes`. `validateWorkflowStructure`
 * rejects this during the pipeline's pre-pass.
 */
const brokenWorkflow = (id: string, name: string): SerializedWorkflow => ({
	id,
	name,
	nodes: [
		{
			id: 'manual-trigger',
			name: 'Manual Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {
		'Phantom Node That Does Not Exist': {
			main: [[{ node: 'Manual Trigger', type: 'main', index: 0 }]],
		},
	},
	versionId: 'wire-version-id',
	parentFolderId: null,
	active: false,
	isArchived: false,
});

async function buildPackage(workflows: SerializedWorkflow[]): Promise<Buffer> {
	const writer = new TarPackageWriter();

	const manifest: PackageManifest = {
		packageFormatVersion: FORMAT_VERSION,
		exportedAt: new Date().toISOString(),
		sourceN8nVersion: '1.0.0',
		sourceId: 'integration-test-source',
		workflows: workflows.map((w, idx) => ({
			id: w.id,
			name: w.name,
			target: `workflows/wf-${idx}`,
		})),
	};

	writer.writeFile('manifest.json', JSON.stringify(manifest));
	workflows.forEach((wf, idx) => {
		writer.writeDirectory(`workflows/wf-${idx}`);
		writer.writeFile(`workflows/wf-${idx}/workflow.json`, JSON.stringify(wf));
	});

	return await streamToBuffer(writer.finalize());
}

const licenseMocker = new LicenseMocker();

beforeAll(async () => {
	await testModules.loadModules(['n8n-packages']);
	await testDb.init();
	licenseMocker.mockLicenseState(Container.get(LicenseState));
});

afterAll(async () => {
	await testDb.terminate();
});

beforeEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'Folder', 'Project']);
});

describe('ImportPipeline transactional atomicity', () => {
	it('persists nothing when prepare-phase validation fails before any create', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		const tarBuffer = await buildPackage([
			validWorkflow('wf-source-1', 'Good Workflow'),
			brokenWorkflow('wf-source-2', 'Broken Workflow'),
			validWorkflow('wf-source-3', 'Never Reached'),
		]);

		const workflowRepo = Container.get(WorkflowRepository);
		const sharedRepo = Container.get(SharedWorkflowRepository);

		const workflowsBefore = await workflowRepo.count();
		const sharedBefore = await sharedRepo.count({ where: { projectId: personalProject.id } });

		await expect(
			Container.get(N8nPackagesService).importPackage({
				user: owner,
				packageBuffer: tarBuffer,
			}),
		).rejects.toThrow();

		const workflowsAfter = await workflowRepo.count();
		const sharedAfter = await sharedRepo.count({ where: { projectId: personalProject.id } });

		expect(workflowsAfter).toBe(workflowsBefore);
		expect(sharedAfter).toBe(sharedBefore);
	});

	it('rolls back workflows already created in the batch when a later create fails', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		const tarBuffer = await buildPackage([
			validWorkflow('wf-source-1', 'First Saved Then Rolled Back'),
			validWorkflow('wf-source-2', 'Fails On Create'),
			validWorkflow('wf-source-3', 'Never Reached'),
		]);

		const workflowRepo = Container.get(WorkflowRepository);
		const sharedRepo = Container.get(SharedWorkflowRepository);
		const workflowCreationService = Container.get(WorkflowCreationService);
		const originalCreate = workflowCreationService.createWorkflow.bind(workflowCreationService);

		let createCallCount = 0;
		const createSpy = jest
			.spyOn(workflowCreationService, 'createWorkflow')
			.mockImplementation(async (user, workflow, options) => {
				createCallCount += 1;
				if (createCallCount === 2) {
					throw new BadRequestError('Simulated mid-batch create failure');
				}
				return await originalCreate(user, workflow, options);
			});

		const workflowsBefore = await workflowRepo.count();
		const sharedBefore = await sharedRepo.count({ where: { projectId: personalProject.id } });

		try {
			await expect(
				Container.get(N8nPackagesService).importPackage({
					user: owner,
					packageBuffer: tarBuffer,
				}),
			).rejects.toThrow('Simulated mid-batch create failure');

			expect(createSpy).toHaveBeenCalledTimes(2);

			expect(await workflowRepo.count()).toBe(workflowsBefore);
			expect(await sharedRepo.count({ where: { projectId: personalProject.id } })).toBe(
				sharedBefore,
			);
			expect(await workflowRepo.countBy({ sourceWorkflowId: 'wf-source-1' })).toBe(0);
			expect(await workflowRepo.countBy({ sourceWorkflowId: 'wf-source-2' })).toBe(0);
		} finally {
			createSpy.mockRestore();
		}
	});

	it('persists every workflow when the whole package is valid', async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		const tarBuffer = await buildPackage([
			validWorkflow('wf-source-1', 'First'),
			validWorkflow('wf-source-2', 'Second'),
		]);

		const result = await Container.get(N8nPackagesService).importPackage({
			user: owner,
			packageBuffer: tarBuffer,
		});

		expect(result.workflows).toHaveLength(2);

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
		return await buildPackage([validWorkflow('wf-routed', 'Routed Workflow')]);
	}

	it("lands in the importer's personal project root when no projectId is given", async () => {
		const owner = await createOwner();
		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
			owner.id,
		);

		await Container.get(N8nPackagesService).importPackage({
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

		await Container.get(N8nPackagesService).importPackage({
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

		await Container.get(N8nPackagesService).importPackage({
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

		await Container.get(N8nPackagesService).importPackage({
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
		return await buildPackage([validWorkflow('wf-x', 'X')]);
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
			Container.get(N8nPackagesService).importPackage({
				user: owner,
				packageBuffer: tarBuffer,
			}),
		).rejects.toThrow(BadRequestError);
	});

	it('rejects when the requested projectId does not exist', async () => {
		const owner = await createOwner();

		await expect(
			Container.get(N8nPackagesService).importPackage({
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
			Container.get(N8nPackagesService).importPackage({
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
			Container.get(N8nPackagesService).importPackage({
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
		writer.writeFile('workflows/wf-x/workflow.json', JSON.stringify(validWorkflow('wf-x', 'X')));

		await expect(
			Container.get(N8nPackagesService).importPackage({
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
			Container.get(N8nPackagesService).importPackage({
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
			await Container.get(N8nPackagesService).importPackage({
				user: owner,
				packageBuffer: await buildPackage([
					validWorkflow('wf-event-1', 'Event One'),
					validWorkflow('wf-event-2', 'Event Two'),
				]),
			});

			const createdEvents = emitSpy.mock.calls.filter(([name]) => name === 'workflow-created');
			const importedEvents = emitSpy.mock.calls.filter(([name]) => name === 'workflows-imported');

			expect(createdEvents).toHaveLength(2);
			expect(
				createdEvents.every(([, payload]) => (payload as { source: string }).source === 'import'),
			).toBe(true);
			expect(importedEvents).toHaveLength(1);

			const importedPayload = importedEvents[0][1] as { workflowIds: string[] };
			expect(importedPayload.workflowIds).toHaveLength(2);
		} finally {
			emitSpy.mockRestore();
		}
	});

	it('emits no events when the import rolls back', async () => {
		const owner = await createOwner();
		const eventService = Container.get(EventService);
		const emitSpy = jest.spyOn(eventService, 'emit');

		try {
			await expect(
				Container.get(N8nPackagesService).importPackage({
					user: owner,
					packageBuffer: await buildPackage([
						validWorkflow('wf-good', 'Good'),
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
