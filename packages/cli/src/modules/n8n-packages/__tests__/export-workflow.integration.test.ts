import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	shareWorkflowWithUsers,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { createMember, createOwner } from '@test-integration/db/users';

import { N8nPackagesService } from '../n8n-packages.service';
import { FORMAT_VERSION } from '../spec/constants';
import { readExport } from './utils/tar-support';

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
		const stream = await service.exportWorkflows({ user, workflowIds: [workflowId] });
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

			const stream = await service.exportWorkflows({
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

			const stream = await service.exportWorkflows({
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
	});

	describe('authorization', () => {
		it('lists every unexportable id in the error', async () => {
			const owner = await createOwner();
			const project = await createTeamProject('Project A', owner);
			const wf = await createWorkflow({ name: 'Alpha', nodes: [], connections: {} }, project);

			await expect(
				service.exportWorkflows({
					user: owner,
					workflowIds: [wf.id, 'missing-1', 'missing-2'],
				}),
			).rejects.toThrow(/missing-1.*missing-2/);
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
				service.exportWorkflows({ user: outsider, workflowIds: [ownerWorkflow.id] }),
			).rejects.toThrow(ownerWorkflow.id);
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
				.exportWorkflows({
					user: member,
					workflowIds: [memberWorkflow.id, ownerWorkflow.id],
				})
				.catch((e: Error) => e)) as Error;

			expect(error).toBeInstanceOf(Error);
			expect(error.message).toContain(ownerWorkflow.id);
			// Accessible ids must not appear in the error — otherwise the response itself
			// becomes an oracle ("these are yours; this one isn't") for batched probes.
			expect(error.message).not.toContain(memberWorkflow.id);
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

			await expect(
				service.exportWorkflows({ user: memberB, workflowIds: [wf.id] }),
			).rejects.toThrow(wf.id);
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
				service.exportWorkflows({ user: bystander, workflowIds: [wf.id] }),
			).rejects.toThrow(wf.id);
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
