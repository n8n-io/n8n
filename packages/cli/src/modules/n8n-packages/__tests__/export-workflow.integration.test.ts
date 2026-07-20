import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	shareWorkflowWithUsers,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ProjectRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember, createOwner } from '@test-integration/db/users';

import { PackageExportBlockedError } from '../entities/package-export.errors';
import { N8nPackagesService } from '../n8n-packages.service';
import { FORMAT_VERSION } from '../spec/constants';
import { readExport } from './utils/tar-support';
import { buildWorkflowCallingSubWorkflow } from './utils/test-builders';

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

describe('workflow package export', () => {
	let service: N8nPackagesService;

	beforeAll(() => {
		service = Container.get(N8nPackagesService);
	});

	async function exportSingleWorkflow(user: User, workflowId: string) {
		const stream = await service.exportPackage({ user, workflowIds: [workflowId] });
		return await readExport(stream);
	}

	describe('package contents', () => {
		it('emits a tar with manifest.json first and a workflow.json per requested workflow', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const workflow = await createWorkflow(
				{
					name: 'My Workflow',
					nodes: [
						{
							id: 'n1',
							name: 'Start',
							type: 'n8n-nodes-base.manualTrigger',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
				},
				project,
			);

			const { manifest, entries } = await exportSingleWorkflow(owner, workflow.id);

			expect(entries[0].name).toBe('manifest.json');
			expect(manifest).toMatchObject({
				packageFormatVersion: FORMAT_VERSION,
				exportedAt: expect.any(String),
				sourceN8nVersion: expect.any(String),
				sourceId: expect.any(String),
			});
			expect(manifest.workflows).toEqual([
				{ id: workflow.id, name: 'My Workflow', target: expect.any(String) },
			]);

			const workflowFile = entries.find(
				(e) => e.name === `${manifest.workflows![0].target}/workflow.json`,
			);
			expect(workflowFile).toBeDefined();
			const serialized = JSON.parse(workflowFile!.content.toString());
			expect(serialized.id).toBe(workflow.id);
			expect(serialized.nodes).toHaveLength(1);
		});

		it('writes each workflow under a distinct slugged target', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const wfA = await createWorkflow({ name: 'Alpha', nodes: [], connections: {} }, project);
			const wfB = await createWorkflow({ name: 'Beta', nodes: [], connections: {} }, project);

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [wfA.id, wfB.id],
			});
			const { manifest, entries } = await readExport(stream);

			expect(manifest.workflows).toHaveLength(2);
			expect(manifest.workflows!.map((w) => w.id).sort()).toEqual([wfA.id, wfB.id].sort());
			expect(new Set(manifest.workflows!.map((w) => w.target)).size).toBe(2);

			for (const entry of manifest.workflows!) {
				expect(entries.find((e) => e.name === `${entry.target}/workflow.json`)).toBeDefined();
			}
		});

		it('disambiguates targets when two workflows share a name', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const wfA = await createWorkflow({ name: 'Duplicate', nodes: [], connections: {} }, project);
			const wfB = await createWorkflow({ name: 'Duplicate', nodes: [], connections: {} }, project);

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [wfA.id, wfB.id],
			});
			const { manifest, entries } = await readExport(stream);

			const targetsById = new Map(manifest.workflows!.map((w) => [w.id, w.target]));
			expect(targetsById.get(wfA.id)).toBeDefined();
			expect(targetsById.get(wfB.id)).toBeDefined();
			expect(targetsById.get(wfA.id)).not.toBe(targetsById.get(wfB.id));

			// Cross-paste guard: each target's workflow.json must serialize the
			// matching workflow id, proving slug collision didn't swap contents.
			for (const [id, target] of targetsById) {
				const file = entries.find((e) => e.name === `${target}/workflow.json`);
				expect(file).toBeDefined();
				expect(JSON.parse(file!.content.toString()).id).toBe(id);
			}
		});

		it('blocks workflow exports when static sub-workflows are not explicitly selected', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const workflowC = await createWorkflow(
				{ name: 'Workflow C', nodes: [], connections: {} },
				project,
			);
			const workflowB = await buildWorkflowCallingSubWorkflow({
				name: 'Workflow B',
				project,
				subWorkflowId: workflowC.id,
			});
			const workflowA = await buildWorkflowCallingSubWorkflow({
				name: 'Workflow A',
				project,
				subWorkflowId: workflowB.id,
			});

			const missingDependencyExport = service.exportPackage({
				user: owner,
				workflowIds: [workflowA.id],
			});
			await expect(missingDependencyExport).rejects.toThrow(PackageExportBlockedError);
			await expect(missingDependencyExport).rejects.toThrow(
				'2 sub-workflow dependencies not included in the package',
			);

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [workflowA.id, workflowB.id, workflowC.id],
			});
			const { manifest, entries } = await readExport(stream);

			expect(manifest.workflows!.map(({ id }) => id).sort()).toEqual(
				[workflowA.id, workflowB.id, workflowC.id].sort(),
			);
			for (const entry of manifest.workflows!) {
				expect(entries.find((e) => e.name === `${entry.target}/workflow.json`)).toBeDefined();
			}
			expect(manifest.requirements?.workflows).toHaveLength(2);
			expect(manifest.requirements?.workflows).toEqual(
				expect.arrayContaining([
					{ id: workflowB.id, name: workflowB.name, usedByWorkflows: [workflowA.id] },
					{ id: workflowC.id, name: workflowC.name, usedByWorkflows: [workflowB.id] },
				]),
			);
		});

		it('exports Tool Workflow requirements and blocks when the target workflow is missing', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const child = await createWorkflow(
				{ name: 'Tool Child', nodes: [], connections: {} },
				project,
			);
			const parent = await createWorkflow(
				{
					name: 'Tool Parent',
					nodes: [
						{
							id: 'tool-workflow',
							name: 'Call workflow',
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							typeVersion: 2.2,
							position: [0, 0],
							parameters: {
								workflowId: { __rl: true, mode: 'list', value: child.id },
							},
						},
					],
					connections: {},
				},
				project,
			);

			await expect(
				service.exportPackage({ user: owner, workflowIds: [parent.id] }),
			).rejects.toThrow(PackageExportBlockedError);
			await expect(
				service.exportPackage({ user: owner, workflowIds: [parent.id] }),
			).rejects.toThrow('sub-workflow dependency not included in the package');

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [parent.id, child.id],
			});
			const { manifest } = await readExport(stream);

			expect(manifest.requirements).toEqual({
				workflows: [{ id: child.id, name: child.name, usedByWorkflows: [parent.id] }],
			});
		});

		it('groups workflow requirements by referenced workflow', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const child = await createWorkflow(
				{ name: 'Shared Child', nodes: [], connections: {} },
				project,
			);
			const parentA = await buildWorkflowCallingSubWorkflow({
				name: 'Parent A',
				project,
				subWorkflowId: child.id,
			});
			const parentB = await buildWorkflowCallingSubWorkflow({
				name: 'Parent B',
				project,
				subWorkflowId: child.id,
			});

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [parentA.id, parentB.id, child.id],
			});
			const { manifest } = await readExport(stream);
			const expectedUsedByWorkflows = manifest
				.workflows!.map(({ id }) => id)
				.filter((id) => id === parentA.id || id === parentB.id);

			expect(manifest.requirements).toEqual({
				workflows: [{ id: child.id, name: child.name, usedByWorkflows: expectedUsedByWorkflows }],
			});
		});

		it('allows circular sub-workflow references when both workflows are selected', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const workflowA = await createWorkflow(
				{ name: 'Workflow A', nodes: [], connections: {} },
				project,
			);
			const workflowB = await buildWorkflowCallingSubWorkflow({
				name: 'Workflow B',
				project,
				subWorkflowId: workflowA.id,
			});
			workflowA.nodes = [
				{
					id: 'execute-b',
					name: 'Execute B',
					type: 'n8n-nodes-base.executeWorkflow',
					typeVersion: 1,
					position: [0, 0],
					parameters: { workflowId: { __rl: true, mode: 'list', value: workflowB.id } },
				},
			];
			await Container.get(WorkflowRepository).save(workflowA);

			const stream = await service.exportPackage({
				user: owner,
				workflowIds: [workflowA.id, workflowB.id],
			});
			const { manifest } = await readExport(stream);

			expect(manifest.workflows!.map(({ id }) => id).sort()).toEqual(
				[workflowA.id, workflowB.id].sort(),
			);
			expect(manifest.requirements?.workflows).toEqual([
				{ id: workflowB.id, name: workflowB.name, usedByWorkflows: [workflowA.id] },
				{ id: workflowA.id, name: workflowA.name, usedByWorkflows: [workflowB.id] },
			]);
		});
	});

	describe('authorization', () => {
		it('Lists count of workflows inaccessible', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const wf = await createWorkflow({ name: 'Alpha', nodes: [], connections: {} }, project);

			await expect(
				service.exportPackage({
					user: owner,
					workflowIds: [wf.id, 'missing-1', 'missing-2'],
				}),
			).rejects.toThrow('2 workflow(s) not found or not accessible. Export aborted.');
		});

		it('denies a caller with no access', async () => {
			// Unauthorized and truly-missing ids surface with the same message so a caller
			// can't probe whether a workflow exists outside their permission scope.
			const owner = await createOwner();
			const ownerProject = await createTeamProject('Owner Project', owner);
			const ownerWorkflow = await createWorkflow(
				{ name: 'Owners Workflow', nodes: [], connections: {} },
				ownerProject,
			);
			const outsider = await createMember();

			await expect(
				service.exportPackage({ user: outsider, workflowIds: [ownerWorkflow.id] }),
			).rejects.toThrow('1 workflow(s) not found or not accessible. Export aborted.');
		});

		it('fails the whole batch and only names the inaccessible ids when mixed with accessible ones', async () => {
			const owner = await createOwner();
			const ownerProject = await createTeamProject('Owner Project', owner);
			const ownerWorkflow = await createWorkflow(
				{ name: 'Owner Only', nodes: [], connections: {} },
				ownerProject,
			);
			const member = await createMember();
			const memberPersonal = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
				member.id,
			);
			const memberWorkflow = await createWorkflow(
				{ name: 'Member Workflow', nodes: [], connections: {} },
				memberPersonal,
			);

			const error = (await service
				.exportPackage({
					user: member,
					workflowIds: [memberWorkflow.id, ownerWorkflow.id],
				})
				.catch((e: Error) => e)) as Error;

			expect(error).toBeInstanceOf(Error);
			expect(error.message).toContain('1 workflow(s) not found or not accessible. Export aborted.');
		});

		it("denies one member access to another member's personal workflow", async () => {
			const memberA = await createMember();
			const memberB = await createMember();
			const memberAPersonal = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(memberA.id);
			const wf = await createWorkflow(
				{ name: 'Member A Workflow', nodes: [], connections: {} },
				memberAPersonal,
			);

			await expect(service.exportPackage({ user: memberB, workflowIds: [wf.id] })).rejects.toThrow(
				'1 workflow(s) not found or not accessible. Export aborted.',
			);
		});

		it('denies a member access to a workflow shared only with someone else', async () => {
			const owner = await createOwner();
			const ownerProject = await createTeamProject('Source Project', owner);
			const wf = await createWorkflow(
				{ name: 'Shared Workflow', nodes: [], connections: {} },
				ownerProject,
			);
			const sharee = await createMember();
			const bystander = await createMember();
			await shareWorkflowWithUsers(wf, [sharee]);

			await expect(
				service.exportPackage({ user: bystander, workflowIds: [wf.id] }),
			).rejects.toThrow('1 workflow(s) not found or not accessible. Export aborted.');
		});

		it('allows a personal-project owner to export their own workflows', async () => {
			const member = await createMember();
			const personal = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
				member.id,
			);
			const wf = await createWorkflow(
				{ name: 'Member Workflow', nodes: [], connections: {} },
				personal,
			);

			const { manifest } = await exportSingleWorkflow(member, wf.id);
			expect(manifest.workflows![0].id).toBe(wf.id);
		});

		it('allows a project editor to export team project workflows', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Editor Project', owner);
			const editor = await createMember();
			await linkUserToProject(editor, project, 'project:editor');
			const wf = await createWorkflow({ name: 'Editable', nodes: [], connections: {} }, project);

			const { manifest } = await exportSingleWorkflow(editor, wf.id);
			expect(manifest.workflows![0].id).toBe(wf.id);
		});

		it('allows a project viewer to export team project workflows', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Viewer Project', owner);
			const viewer = await createMember();
			await linkUserToProject(viewer, project, 'project:viewer');
			const wf = await createWorkflow({ name: 'Viewable', nodes: [], connections: {} }, project);

			const { manifest } = await exportSingleWorkflow(viewer, wf.id);
			expect(manifest.workflows![0].id).toBe(wf.id);
		});

		it("allows a global owner to export a team project's workflows without being a member", async () => {
			// Global owners bypass the per-project scope check, so the typical operator
			// path — exporting a workflow from a project they have no relation to — must work.
			const projectAdmin = await createMember();
			const project = await createTeamProject('Foreign Project', projectAdmin);
			const wf = await createWorkflow(
				{ name: 'Foreign Workflow', nodes: [], connections: {} },
				project,
			);
			const globalOwner = await createOwner();

			const { manifest } = await exportSingleWorkflow(globalOwner, wf.id);
			expect(manifest.workflows![0].id).toBe(wf.id);
		});

		it('allows a direct-share recipient to export the shared workflow', async () => {
			const owner = await createOwner();
			const ownerProject = await createTeamProject('Source Project', owner);
			const wf = await createWorkflow(
				{ name: 'Shared Workflow', nodes: [], connections: {} },
				ownerProject,
			);
			const sharee = await createMember();
			await shareWorkflowWithUsers(wf, [sharee]);

			const { manifest } = await exportSingleWorkflow(sharee, wf.id);
			expect(manifest.workflows![0].id).toBe(wf.id);
		});
	});
});
