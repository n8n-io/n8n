import { createTeamProject, mockInstance, testDb, testModules } from '@n8n/backend-test-utils';
import { FolderRepository, ProjectRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { PROJECT_ROOT } from 'n8n-workflow';

import { AgentFolderService } from '@/modules/agents/agent-folder.service';
import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { ChatIntegrationService } from '@/modules/agents/integrations/chat-integration.service';
import { FolderContentService } from '@/services/folder-content.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentThreadRepository } from '@/modules/agents/repositories/agent-thread.repository';
import { storedAgentConfig } from '@/modules/agents/__tests__/test-utils/stored-agent-config';
import { FolderService } from '@/services/folder.service';
import { Telemetry } from '@/telemetry';
import { createFolder } from '@test-integration/db/folders';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createOwner, createMember } from '@test-integration/db/users';
import { linkUserToProject } from '@n8n/backend-test-utils';
import { setupTestServer } from '@test-integration/utils';

beforeAll(async () => await testModules.loadModules(['agents']));

const server = setupTestServer({ endpointGroups: ['folder'] });
mockInstance(AgentUpdateBroadcaster);
const channels = mockInstance(ChatIntegrationService);
const tasks = mockInstance(AgentTaskService);
const telemetry = mockInstance(Telemetry);
let owner: User;
let project: Project;
let agents: AgentRepository;
let folders: FolderRepository;
let service: FolderService;

beforeEach(async () => {
	server.license.enable('feat:folders');
	tasks.requestReconcile.mockResolvedValue();
	agents = Container.get(AgentRepository);
	folders = Container.get(FolderRepository);
	service = Container.get(FolderService);
	Container.get(FolderContentService).setAgentHandler(Container.get(AgentFolderService));
	await agents.delete({});
	await Container.get(AgentThreadRepository).delete({});
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

it('keeps workflow-only actions outside the Agent folder tree', async () => {
	const folder = await createFolder(project, { resourceType: 'agent' });
	const destination = await createTeamProject('Destination', owner);
	const http = server.authAgentFor(owner);

	await http.get(`/projects/${project.id}/folders/${folder.id}/credentials`).expect(404);
	await http
		.get(`/projects/${project.id}/folders/${folder.id}/transfer-preview`)
		.query({ destinationProjectId: destination.id })
		.expect(404);
	await http
		.put(`/projects/${project.id}/folders/${folder.id}/transfer`)
		.send({
			destinationProjectId: destination.id,
			destinationParentFolderId: PROJECT_ROOT,
		})
		.expect(400);

	expect(await folders.findOneOrFailFolderInProject(folder.id, project.id)).toMatchObject({
		id: folder.id,
		resourceType: 'agent',
	});
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

it('retains folders and membership when Agent archival fails', async () => {
	const folder = await createFolder(project, { resourceType: 'agent' });
	await agents.save({
		id: 'support',
		name: 'Support',
		projectId: project.id,
		parentFolderId: folder.id,
	});
	vi.spyOn(Container.get(AgentPublishService), 'archiveAgent').mockRejectedValueOnce(
		new Error('Archive failed'),
	);

	await expect(service.deleteFolder(owner, folder.id, project.id, {})).rejects.toThrow(
		'Archive failed',
	);
	expect(await folders.existsBy({ id: folder.id })).toBe(true);
	expect(await agents.findOneByOrFail({ id: 'support' })).toMatchObject({
		parentFolderId: folder.id,
		isArchived: false,
	});
});

it('archives a folder tree at root and preserves Agent definitions, versions, sessions, and channels', async () => {
	const folder = await createFolder(project, { resourceType: 'agent' });
	const child = await createFolder(project, { resourceType: 'agent', parentFolder: folder });
	const empty = await createFolder(project, { resourceType: 'agent', parentFolder: child });
	const unrelated = await createFolder(project, { resourceType: 'agent' });
	const schema = storedAgentConfig({
		name: 'Support',
		model: 'openai/gpt-4.1-mini',
		instructions: 'Answer support requests',
	});
	const integrations = [{ type: 'slack' as const, credentialId: 'channel-credential' }];
	const direct = await agents.save({
		id: 'support',
		name: 'Support',
		projectId: project.id,
		parentFolderId: folder.id,
		versionId: 'saved-version',
		schema,
		integrations,
	});
	await Container.get(AgentHistoryRepository).saveVersion(
		{
			agentId: direct.id,
			versionId: 'saved-version',
			publishedBy: 'Folder test',
			schema,
			tools: {},
		},
		{},
	);
	await agents.setActiveVersionFenced(direct.id, direct.publicationRevision, 'saved-version');
	const archived = await agents.save({
		id: 'already-archived',
		name: 'Archived',
		projectId: project.id,
		parentFolderId: child.id,
		isArchived: true,
	});
	const untouched = await agents.save({
		id: 'untouched',
		name: 'Untouched',
		projectId: project.id,
		parentFolderId: unrelated.id,
	});
	const threads = Container.get(AgentThreadRepository);
	const thread = await threads.save({
		id: 'folder-session',
		resourceId: direct.id,
		title: 'Saved support session',
		metadata: '{"source":"test"}',
	});
	const publish = Container.get(AgentPublishService);
	const archive = vi.spyOn(publish, 'archiveAgent');
	const hardDelete = vi.spyOn(Container.get(AgentsService), 'delete');

	expect(await service.findFolderWithContentCounts(folder.id, project.id)).toMatchObject({
		totalAgents: 1,
		totalSubFolders: 2,
	});
	const [listed] = await service.getManyAndCount(project.id, { resourceType: 'agent' });

	expect(listed.find(({ id }) => id === folder.id)?.agentCount).toBe(1);
	expect(listed.find(({ id }) => id === child.id)?.agentCount).toBe(0);

	const countContents = vi.spyOn(service, 'findFolderWithContentCounts');

	await server
		.authAgentFor(owner)
		.delete(`/projects/${project.id}/folders/${folder.id}`)
		.expect(200);

	expect(countContents).not.toHaveBeenCalled();
	expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.PLATFORM.RESOURCE_FOLDER_CHANGED, {
		user_id: owner.id,
		project_id: project.id,
		resource_type: 'agent',
		action: 'deleted',
		source: 'rest',
		folder_id: folder.id,
		target_folder_id: null,
	});

	for (const id of [direct.id, archived.id]) {
		expect(await agents.findOneByOrFail({ id })).toMatchObject({
			parentFolderId: null,
			isArchived: true,
			activeVersionId: null,
		});
	}

	expect(await agents.findOneByOrFail({ id: direct.id })).toMatchObject({
		schema,
		integrations,
		versionId: 'saved-version',
	});
	expect(
		await Container.get(AgentHistoryRepository).findByVersionAndAgentId(
			'saved-version',
			direct.id,
			{},
		),
	).toMatchObject({ schema, versionId: 'saved-version' });
	expect(await threads.findOneByOrFail({ id: thread.id })).toMatchObject({
		resourceId: direct.id,
		title: thread.title,
		metadata: thread.metadata,
	});
	expect(archive).toHaveBeenCalledExactlyOnceWith(
		direct.id,
		project.id,
		expect.objectContaining({ id: owner.id }),
	);
	expect(hardDelete).not.toHaveBeenCalled();
	expect(channels.disconnectChannel).toHaveBeenCalledWith(direct.id, integrations[0], {
		deleteSubscriptions: false,
	});

	for (const id of [folder.id, child.id, empty.id]) {
		expect(await folders.existsBy({ id })).toBe(false);
	}

	expect(await folders.existsBy({ id: unrelated.id })).toBe(true);
	expect(await agents.findOneByOrFail({ id: untouched.id })).toMatchObject({
		parentFolderId: unrelated.id,
		isArchived: false,
	});
	const agentService = Container.get(AgentsService);
	const options = { skip: 0, take: 20, filter: { parentFolderId: null } };
	expect((await agentService.findByProjectIdPaginated(project.id, options)).data).toEqual([]);
	expect(
		(
			await agentService.findByProjectIdPaginated(project.id, {
				...options,
				filter: { parentFolderId: null, includeArchived: true },
			})
		).data.map(({ id }) => id),
	).toEqual(expect.arrayContaining([direct.id, archived.id]));

	await publish.unarchiveAgent(direct.id, project.id, owner);

	expect(await agents.findOneByOrFail({ id: direct.id })).toMatchObject({
		parentFolderId: null,
		isArchived: false,
		activeVersionId: null,
		schema,
	});
});

it.each([false, true])(
	'requires Agent delete permission for folder archival: %s',
	async (allowed) => {
		const folder = await createFolder(project, { resourceType: 'agent' });
		await agents.save({
			id: 'support',
			name: 'Support',
			projectId: project.id,
			parentFolderId: folder.id,
		});
		const member = await createMember();
		const role = await createCustomRoleWithScopeSlugs([
			'folder:delete',
			allowed ? 'agent:delete' : 'agent:update',
		]);
		await linkUserToProject(member, project, role.slug);

		await server
			.authAgentFor(member)
			.delete(`/projects/${project.id}/folders/${folder.id}`)
			.expect(allowed ? 200 : 403);

		expect(await folders.existsBy({ id: folder.id })).toBe(!allowed);
		expect(await agents.findOneByOrFail({ id: 'support' })).toMatchObject({
			parentFolderId: allowed ? null : folder.id,
			isArchived: allowed,
		});
	},
);

it('rolls back root placement when folder removal fails and permits a retry after archival', async () => {
	const folder = await createFolder(project, { resourceType: 'agent' });
	await agents.save({
		id: 'support',
		name: 'Support',
		projectId: project.id,
		parentFolderId: folder.id,
	});
	vi.spyOn(folders, 'deleteFolderSubtree').mockRejectedValueOnce(new Error('Write failed'));
	const archive = vi.spyOn(Container.get(AgentPublishService), 'archiveAgent');

	await expect(service.deleteFolder(owner, folder.id, project.id, {})).rejects.toThrow(
		'Write failed',
	);

	expect(await agents.findOneByOrFail({ id: 'support' })).toMatchObject({
		parentFolderId: folder.id,
		isArchived: true,
	});
	expect(await folders.existsBy({ id: folder.id })).toBe(true);

	await service.deleteFolder(owner, folder.id, project.id, {});

	expect(archive).toHaveBeenCalledOnce();
	expect(await agents.findOneByOrFail({ id: 'support' })).toMatchObject({
		parentFolderId: null,
		isArchived: true,
	});
	expect(await folders.existsBy({ id: folder.id })).toBe(false);
});

it('retains a folder when an active Agent arrives after archival', async () => {
	const folder = await createFolder(project, { resourceType: 'agent' });
	await agents.save({
		id: 'support',
		name: 'Support',
		projectId: project.id,
		parentFolderId: folder.id,
	});
	const handler = Container.get(AgentFolderService);
	const archiveContents = handler.archiveContents.bind(handler);
	vi.spyOn(handler, 'archiveContents').mockImplementationOnce(async (...args) => {
		await archiveContents(...args);
		await agents.save({
			id: 'new-agent',
			name: 'New Agent',
			projectId: project.id,
			parentFolderId: folder.id,
		});
	});

	await expect(service.deleteFolder(owner, folder.id, project.id, {})).rejects.toThrow();

	expect(await folders.existsBy({ id: folder.id })).toBe(true);
	expect(await agents.findOneByOrFail({ id: 'support' })).toMatchObject({
		parentFolderId: folder.id,
		isArchived: true,
	});
	expect(await agents.findOneByOrFail({ id: 'new-agent' })).toMatchObject({
		parentFolderId: folder.id,
		isArchived: false,
	});

	await service.deleteFolder(owner, folder.id, project.id, {});

	expect(await folders.existsBy({ id: folder.id })).toBe(false);
	expect(await agents.findOneByOrFail({ id: 'new-agent' })).toMatchObject({
		parentFolderId: null,
		isArchived: true,
	});
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

it('loads search paths for all result folders together', async () => {
	const parent = await createFolder(project, { name: 'Support', resourceType: 'agent' });
	const nested = await createFolder(project, {
		name: 'Triage',
		resourceType: 'agent',
		parentFolder: parent,
	});
	const other = await createFolder(project, { name: 'Sales', resourceType: 'agent' });

	await agents.save([
		{ id: 'root', name: 'Support root', projectId: project.id },
		{ id: 'triage', name: 'Support triage', projectId: project.id, parentFolderId: nested.id },
		{ id: 'backup', name: 'Support backup', projectId: project.id, parentFolderId: nested.id },
		{ id: 'sales', name: 'Support sales', projectId: project.id, parentFolderId: other.id },
	]);
	const loadPaths = vi.spyOn(folders, 'getFolderPathsToRoot');
	const result = await Container.get(AgentsService).findByProjectIdPaginated(project.id, {
		skip: 0,
		take: 20,
		filter: { query: 'Support' },
	});

	expect(loadPaths).toHaveBeenCalledExactlyOnceWith(expect.arrayContaining([nested.id, other.id]));
	expect(loadPaths.mock.calls[0][0]).toHaveLength(2);
	expect(result.count).toBe(4);
	expect(result.data).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ id: 'root', folderPath: [] }),
			expect.objectContaining({ id: 'triage', folderPath: ['Support', 'Triage'] }),
			expect.objectContaining({ id: 'backup', folderPath: ['Support', 'Triage'] }),
			expect.objectContaining({ id: 'sales', folderPath: ['Sales'] }),
		]),
	);
});
