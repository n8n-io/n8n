import { createTeamProject, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { FolderRepository, ProjectRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { PROJECT_ROOT } from 'n8n-workflow';

import { AgentFolderService } from '@/modules/agents/agent-folder.service';
import { FolderContentService } from '@/services/folder-content.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { FolderService } from '@/services/folder.service';
import { createFolder } from '@test-integration/db/folders';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createOwner, createMember } from '@test-integration/db/users';
import { linkUserToProject } from '@n8n/backend-test-utils';
import { setupTestServer } from '@test-integration/utils';

beforeAll(async () => await testModules.loadModules(['agents']));

const server = setupTestServer({ endpointGroups: ['folder'] });
mockInstance(AgentUpdateBroadcaster);
let owner: User;
let project: Project;
let agents: AgentRepository;
let folders: FolderRepository;
let service: FolderService;

beforeEach(async () => {
	server.license.enable('feat:folders');
	agents = Container.get(AgentRepository);
	folders = Container.get(FolderRepository);
	service = Container.get(FolderService);
	Container.get(FolderContentService).register('agent', Container.get(AgentFolderService));
	await agents.delete({});
	await testDb.truncate(['Folder', 'ProjectRelation', 'Project']);
	owner = await createOwner();
	project = await createTeamProject('Agent folders', owner);
	await Container.get(AgentsSettingsService).setEnabled(true);
});

afterEach(() => vi.restoreAllMocks());

it('keeps project deletion compatible with Agent folder membership', async () => {
	const folder = await createFolder(project, { resourceType: 'agent' });
	await agents.save({
		id: 'support',
		name: 'Support',
		projectId: project.id,
		parentFolderId: folder.id,
	});

	await Container.get(ProjectRepository).delete(project.id);

	expect(await agents.existsBy({ id: 'support' })).toBe(false);
	expect(await folders.existsBy({ id: folder.id })).toBe(false);
});

it('keeps the default workflow tree separate and derives the tree from folder IDs', async () => {
	const http = server.authAgentFor(owner);
	const workflow = await createFolder(project, { name: 'Workflows' });
	const created = await http
		.post(`/projects/${project.id}/folders`)
		.send({ name: 'Agents', resourceType: 'agent' })
		.expect(200);
	const folderId = String(created.body.data.id);

	const workflowList = await http.get(`/projects/${project.id}/folders`).expect(200);
	expect(workflowList.body.data.map((folder: { id: string }) => folder.id)).toEqual([workflow.id]);
	const agentList = await http
		.get(`/projects/${project.id}/folders`)
		.query({ resourceType: 'agent' })
		.expect(200);
	expect(agentList.body.data.map((folder: { id: string }) => folder.id)).toEqual([folderId]);
	await http
		.patch(`/projects/${project.id}/folders/${folderId}`)
		.send({ name: 'Renamed' })
		.expect(200);
	await http
		.patch(`/projects/${project.id}/folders/${folderId}`)
		.send({ resourceType: 'workflow' })
		.expect(400);
	await http
		.patch(`/projects/${project.id}/folders/${folderId}`)
		.send({ parentFolderId: workflow.id })
		.expect(400);
	expect(await folders.findOneByOrFail({ id: folderId })).toMatchObject({
		name: 'Renamed',
		resourceType: 'agent',
		parentFolderId: null,
	});
});

it('requires Agent access before it returns Agent content counts', async () => {
	const folder = await createFolder(project, { resourceType: 'agent' });
	const member = await createMember();
	const role = await createCustomRoleWithScopeSlugs(['folder:read', 'folder:list']);
	await linkUserToProject(member, project, role.slug);
	const http = server.authAgentFor(member);

	await http.get(`/projects/${project.id}/folders/${folder.id}/content`).expect(403);
	await http.get(`/projects/${project.id}/folders`).query({ resourceType: 'agent' }).expect(403);
});

it('moves direct Agents and child folders together and keeps nested membership', async () => {
	const source = await createFolder(project, { resourceType: 'agent' });
	const child = await createFolder(project, { resourceType: 'agent', parentFolder: source });
	const target = await createFolder(project, { resourceType: 'agent' });
	const direct = await agents.save({
		id: 'direct',
		name: 'Direct',
		projectId: project.id,
		parentFolderId: source.id,
		versionId: 'saved-version',
	});
	const nested = await agents.save({
		id: 'nested',
		name: 'Nested',
		projectId: project.id,
		parentFolderId: child.id,
	});

	expect(await service.findFolderWithContentCounts(source.id, project.id)).toMatchObject({
		totalAgents: 2,
		totalSubFolders: 1,
		totalWorkflows: 0,
	});
	await expect(
		service.deleteFolder(owner, source.id, project.id, { transferToFolderId: child.id }),
	).rejects.toThrow('descendant');
	await service.deleteFolder(owner, source.id, project.id, { transferToFolderId: target.id });

	expect(await agents.findOneByOrFail({ id: direct.id })).toMatchObject({
		parentFolderId: target.id,
		versionId: 'saved-version',
	});
	expect(await agents.findOneByOrFail({ id: nested.id })).toMatchObject({
		parentFolderId: child.id,
	});
	expect(await folders.findOneByOrFail({ id: child.id })).toMatchObject({
		parentFolderId: target.id,
	});
	expect(await folders.existsBy({ id: source.id })).toBe(false);
	await service.deleteFolder(owner, target.id, project.id, { transferToFolderId: PROJECT_ROOT });
	expect(await agents.findOneByOrFail({ id: direct.id })).toMatchObject({ parentFolderId: null });
});

it('rolls back content moves if the folder write fails', async () => {
	const folder = await createFolder(project, { resourceType: 'agent' });
	const agent = await agents.save({
		id: 'support',
		name: 'Support',
		projectId: project.id,
		parentFolderId: folder.id,
	});
	vi.spyOn(folders, 'relocateChildrenAndDelete').mockRejectedValueOnce(new Error('Write failed'));

	await expect(
		service.deleteFolder(owner, folder.id, project.id, { transferToFolderId: PROJECT_ROOT }),
	).rejects.toThrow('Write failed');
	expect(await agents.findOneByOrFail({ id: agent.id })).toMatchObject({
		parentFolderId: folder.id,
	});
	expect(await folders.existsBy({ id: folder.id })).toBe(true);
});

it('retains folders when Agent lifecycle cleanup fails', async () => {
	const folder = await createFolder(project, { resourceType: 'agent' });
	await agents.save({
		id: 'support',
		name: 'Support',
		projectId: project.id,
		parentFolderId: folder.id,
	});
	vi.spyOn(Container.get(AgentsService), 'delete').mockRejectedValueOnce(
		new Error('Cleanup failed'),
	);

	await expect(service.deleteFolder(owner, folder.id, project.id, {})).rejects.toThrow(
		'Cleanup failed',
	);
	expect(await folders.existsBy({ id: folder.id })).toBe(true);
});

it('filters direct and descendant contents and validates placement before a move', async () => {
	const root = await createFolder(project, { resourceType: 'agent' });
	const nested = await createFolder(project, { resourceType: 'agent', parentFolder: root });
	const workflow = await createFolder(project);
	const otherProject = await createTeamProject();
	const otherFolder = await createFolder(otherProject, { resourceType: 'agent' });
	const agent = await agents.save({
		id: 'support',
		name: 'Support',
		projectId: project.id,
		parentFolderId: nested.id,
		versionId: 'draft-version',
	});
	const agentService = Container.get(AgentsService);

	expect(
		(
			await agentService.findByProjectIdPaginated(project.id, {
				skip: 0,
				take: 20,
				filter: { parentFolderId: root.id },
			})
		).data,
	).toEqual([]);
	expect(
		(
			await agentService.findByProjectIdPaginated(project.id, {
				skip: 0,
				take: 20,
				filter: { parentFolderId: root.id, includeDescendants: true },
			})
		).data.map(({ id }) => id),
	).toEqual([agent.id]);
	await expect(agentService.move(agent.id, project.id, workflow.id)).rejects.toThrow(
		'resource tree',
	);
	await expect(agentService.move(agent.id, project.id, otherFolder.id)).rejects.toThrow(
		'Could not find',
	);
	await agentService.move(agent.id, project.id, null);
	expect(await agents.findOneByOrFail({ id: agent.id })).toMatchObject({
		parentFolderId: null,
		versionId: 'draft-version',
	});
});
