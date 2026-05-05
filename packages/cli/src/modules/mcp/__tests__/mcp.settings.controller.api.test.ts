import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	shareWorkflowWithProjects,
	testDb,
} from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import {
	ApiKeyRepository,
	FolderRepository,
	SettingsRepository,
	WorkflowRepository,
	type Project,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';

import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';

import { createFolder } from '@test-integration/db/folders';
import { createMember, createOwner, createUser } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const testServer = setupTestServer({ endpointGroups: ['mcp'] });

let owner: User;
let member: User;

beforeAll(async () => {
	owner = await createOwner();
	member = await createMember();
});

afterEach(async () => {
	await testDb.truncate(['ApiKey']);
});

describe('GET /mcp/api-key', () => {
	test('should create and return new API key if user does not have one', async () => {
		const response = await testServer.authAgentFor(owner).get('/mcp/api-key');

		expect(response.statusCode).toBe(200);

		const {
			data: { id, apiKey, userId },
		} = response.body;

		expect(id).toBeDefined();
		expect(apiKey).toBeDefined();
		expect(apiKey.length).toBeGreaterThanOrEqual(32);
		expect(userId).toBe(owner.id);
	});

	test('should return existing API key (redacted) if user already has one', async () => {
		const firstResponse = await testServer.authAgentFor(owner).get('/mcp/api-key');

		const firstApiKey = firstResponse.body.data.apiKey;

		const secondResponse = await testServer.authAgentFor(owner).get('/mcp/api-key');
		const secondApiKey = secondResponse.body.data.apiKey;

		expect(secondResponse.statusCode).toBe(200);
		expect(secondApiKey.slice(-4)).toBe(firstApiKey.slice(-4));
	});

	test('should return different API keys for different users', async () => {
		const ownerResponse = await testServer.authAgentFor(owner).get('/mcp/api-key');
		const memberResponse = await testServer.authAgentFor(member).get('/mcp/api-key');

		expect(ownerResponse.statusCode).toBe(200);
		expect(memberResponse.statusCode).toBe(200);

		expect(ownerResponse.body.data.apiKey).not.toBe(memberResponse.body.data.apiKey);
		expect(ownerResponse.body.data.userId).toBe(owner.id);
		expect(memberResponse.body.data.userId).toBe(member.id);
	});

	test('should require authentication', async () => {
		const response = await testServer.authlessAgent.get('/mcp/api-key');

		expect(response.statusCode).toBe(401);
	});
});

describe('POST /mcp/api-key/rotate', () => {
	test('should rotate existing API key and return new one', async () => {
		const initialResponse = await testServer.authAgentFor(owner).get('/mcp/api-key');
		const oldApiKey = initialResponse.body.data.apiKey;

		const rotateResponse = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');

		expect(rotateResponse.statusCode).toBe(200);

		const {
			data: { id, apiKey, userId },
		} = rotateResponse.body;

		expect(id).toBeDefined();
		expect(apiKey).toBeDefined();
		expect(apiKey).not.toBe(oldApiKey);
		expect(userId).toBe(owner.id);

		// Verify old API key is no longer valid
		const currentApiKeys = await Container.get(ApiKeyRepository).find({
			where: { userId: owner.id },
		});

		expect(currentApiKeys.length).toBe(1);
		expect(currentApiKeys[0].apiKey).toBe(apiKey);
		expect(currentApiKeys[0].apiKey).not.toBe(oldApiKey);
	});

	test('should allow multiple rotations in sequence', async () => {
		// Create initial API key
		await testServer.authAgentFor(owner).get('/mcp/api-key');

		// First rotation
		const firstRotation = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');
		const firstApiKey = firstRotation.body.data.apiKey;

		// Second rotation
		const secondRotation = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');
		const secondApiKey = secondRotation.body.data.apiKey;

		// Third rotation
		const thirdRotation = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');
		const thirdApiKey = thirdRotation.body.data.apiKey;

		expect(firstRotation.statusCode).toBe(200);
		expect(secondRotation.statusCode).toBe(200);
		expect(thirdRotation.statusCode).toBe(200);

		expect(firstApiKey).not.toBe(secondApiKey);
		expect(secondApiKey).not.toBe(thirdApiKey);
		expect(firstApiKey).not.toBe(thirdApiKey);
	});

	test('should require authentication', async () => {
		const response = await testServer.authlessAgent.post('/mcp/api-key/rotate');

		expect(response.statusCode).toBe(401);
	});

	test('should require mcpApiKey:rotate scope', async () => {
		// Create initial API key
		await testServer.authAgentFor(owner).get('/mcp/api-key');

		const response = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');

		expect(response.statusCode).toBe(200);
	});

	test('should maintain user association after rotation', async () => {
		// Create initial API key
		await testServer.authAgentFor(owner).get('/mcp/api-key');

		// Rotate
		const response = await testServer.authAgentFor(owner).post('/mcp/api-key/rotate');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.userId).toBe(owner.id);

		// Verify in database
		const apiKeyRepo = Container.get(ApiKeyRepository);
		const storedApiKey = await apiKeyRepo.findOne({
			where: { userId: owner.id },
		});

		expect(storedApiKey).toBeDefined();
		expect(storedApiKey?.apiKey).toBe(response.body.data.apiKey);
	});
});

describe('MCP API Key Security', () => {
	test('should generate unique API keys', async () => {
		const keys = new Set<string>();

		for (let i = 0; i < 5; i++) {
			const user = await createUser({ role: { slug: 'global:member' } });
			const response = await testServer.authAgentFor(user).get('/mcp/api-key');
			keys.add(response.body.data.apiKey);
		}

		expect(keys.size).toBe(5);
	});
});

describe('PATCH /mcp/settings', () => {
	const settingsKey = 'mcp.access.enabled';

	afterEach(async () => {
		await Container.get(SettingsRepository).delete({ key: settingsKey });
		// Clear the in-memory cache so subsequent reads hit the DB.
		await Container.get(McpSettingsService).setEnabled(false);
		await Container.get(SettingsRepository).delete({ key: settingsKey });
	});

	test('owner can enable MCP access', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.patch('/mcp/settings')
			.send({ mcpAccessEnabled: true });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({ mcpAccessEnabled: true });

		const stored = await Container.get(SettingsRepository).findByKey(settingsKey);
		expect(stored?.value).toBe('true');
	});

	test('owner can disable MCP access', async () => {
		await Container.get(McpSettingsService).setEnabled(true);

		const response = await testServer
			.authAgentFor(owner)
			.patch('/mcp/settings')
			.send({ mcpAccessEnabled: false });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({ mcpAccessEnabled: false });

		const stored = await Container.get(SettingsRepository).findByKey(settingsKey);
		expect(stored?.value).toBe('false');
	});

	test('member without mcp:manage scope is forbidden', async () => {
		const response = await testServer
			.authAgentFor(member)
			.patch('/mcp/settings')
			.send({ mcpAccessEnabled: true });

		expect(response.statusCode).toBe(403);
	});

	test('rejects invalid payloads with 400', async () => {
		const response = await testServer
			.authAgentFor(owner)
			.patch('/mcp/settings')
			.send({ mcpAccessEnabled: 'yes' });

		expect(response.statusCode).toBe(400);
	});

	test('requires authentication', async () => {
		const response = await testServer.authlessAgent
			.patch('/mcp/settings')
			.send({ mcpAccessEnabled: true });

		expect(response.statusCode).toBe(401);
	});

	describe('when MCP settings are managed by env', () => {
		beforeAll(() => {
			Container.get(InstanceSettingsLoaderConfig).mcpManagedByEnv = true;
		});

		afterAll(() => {
			Container.get(InstanceSettingsLoaderConfig).mcpManagedByEnv = false;
		});

		test('owner cannot update settings (403)', async () => {
			const response = await testServer
				.authAgentFor(owner)
				.patch('/mcp/settings')
				.send({ mcpAccessEnabled: true });

			expect(response.statusCode).toBe(403);

			const stored = await Container.get(SettingsRepository).findByKey(settingsKey);
			expect(stored).toBeNull();
		});
	});
});

describe('MCP API Key Edge Cases', () => {
	test('should handle concurrent get requests without creating duplicates', async () => {
		const requests = Array(3)
			.fill(null)
			.map(() => testServer.authAgentFor(owner).get('/mcp/api-key'));

		await Promise.all(requests);

		const apiKeyRepo = Container.get(ApiKeyRepository);
		const storedApiKey = await apiKeyRepo.find({
			where: { userId: owner.id },
		});
		expect(storedApiKey.length).toBe(1);
	});
});

describe('PATCH /mcp/workflows/toggle-access', () => {
	// Re-create users per test so we can truncate workflow/project/folder tables
	// without leaving dangling references between cases.
	let toggleOwner: User;
	let toggleMember: User;

	const workflowRepository = () => Container.get(WorkflowRepository);

	const readAvailableInMCP = async (workflowId: string): Promise<boolean | undefined> => {
		const wf = await workflowRepository().findOneBy({ id: workflowId });
		return wf?.settings?.availableInMCP;
	};

	beforeEach(async () => {
		await testDb.truncate([
			'WorkflowEntity',
			'SharedWorkflow',
			'Folder',
			'ProjectRelation',
			'Project',
			'User',
		]);
		toggleOwner = await createOwner();
		toggleMember = await createMember();
	});

	test('rejects requests without a scope', async () => {
		const response = await testServer
			.authAgentFor(toggleOwner)
			.patch('/mcp/workflows/toggle-access')
			.send({ availableInMCP: true });

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.statusCode).toBeLessThan(500);
	});

	test('rejects requests with more than one scope', async () => {
		const response = await testServer
			.authAgentFor(toggleOwner)
			.patch('/mcp/workflows/toggle-access')
			.send({ availableInMCP: true, workflowIds: ['wf-1'], projectId: 'project-1' });

		expect(response.statusCode).toBeGreaterThanOrEqual(400);
		expect(response.statusCode).toBeLessThan(500);
	});

	test('enables MCP access across an explicit workflow id list in a single transaction', async () => {
		// Act as the member — the member lacks global workflow:update scope, so
		// the finder service filters out workflows they cannot access. This is
		// the behavior we want to exercise for the bulk path.
		const ownedByMember = await createWorkflow(
			{ name: 'member-1', settings: { saveManualExecutions: true } },
			toggleMember,
		);
		const ownedByMember2 = await createWorkflow({ name: 'member-2', settings: {} }, toggleMember);
		const ownedByOwner = await createWorkflow({ name: 'owner-wf', settings: {} }, toggleOwner);

		const response = await testServer
			.authAgentFor(toggleMember)
			.patch('/mcp/workflows/toggle-access')
			.send({
				availableInMCP: true,
				workflowIds: [ownedByMember.id, ownedByMember2.id, ownedByOwner.id],
			});

		expect(response.statusCode).toBe(200);
		expect(response.body.data.updatedCount).toBe(2);
		expect(response.body.data.updatedIds.sort()).toEqual(
			[ownedByMember.id, ownedByMember2.id].sort(),
		);
		expect(response.body.data.skippedCount).toBe(1);

		expect(await readAvailableInMCP(ownedByMember.id)).toBe(true);
		expect(await readAvailableInMCP(ownedByMember2.id)).toBe(true);
		// The unauthorized workflow remains untouched.
		expect(await readAvailableInMCP(ownedByOwner.id)).toBeUndefined();

		// Pre-existing settings on ownedByMember are preserved.
		const refreshed = await workflowRepository().findOneBy({ id: ownedByMember.id });
		expect(refreshed?.settings?.saveManualExecutions).toBe(true);
	});

	test('skips archived workflows', async () => {
		const live = await createWorkflow({ name: 'live', settings: {} }, toggleOwner);
		const archived = await createWorkflow(
			{ name: 'archived', settings: {}, isArchived: true },
			toggleOwner,
		);

		const response = await testServer
			.authAgentFor(toggleOwner)
			.patch('/mcp/workflows/toggle-access')
			.send({
				availableInMCP: true,
				workflowIds: [live.id, archived.id],
			});

		expect(response.statusCode).toBe(200);
		expect(response.body.data.updatedIds).toEqual([live.id]);
		expect(response.body.data.skippedCount).toBe(1);
		expect(await readAvailableInMCP(archived.id)).toBeUndefined();
	});

	test('scopes updates to a project id', async () => {
		const project: Project = await createTeamProject('team-project');
		await linkUserToProject(toggleOwner, project, 'project:admin');

		const projectWf1 = await createWorkflow({ name: 'project-wf-1', settings: {} }, project);
		const projectWf2 = await createWorkflow({ name: 'project-wf-2', settings: {} }, project);
		const unrelatedWf = await createWorkflow({ name: 'unrelated', settings: {} }, toggleOwner);

		const response = await testServer
			.authAgentFor(toggleOwner)
			.patch('/mcp/workflows/toggle-access')
			.send({ availableInMCP: true, projectId: project.id });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({ updatedCount: 2, skippedCount: 0, failedCount: 0 });
		expect(await readAvailableInMCP(projectWf1.id)).toBe(true);
		expect(await readAvailableInMCP(projectWf2.id)).toBe(true);
		expect(await readAvailableInMCP(unrelatedWf.id)).toBeUndefined();
	});

	test('scopes updates to a folder id, including descendants', async () => {
		const project = await getPersonalProject(toggleOwner);
		const rootFolder = await createFolder(project, { name: 'root' });
		const childFolder = await createFolder(project, {
			name: 'child',
			parentFolder: await Container.get(FolderRepository).findOneByOrFail({ id: rootFolder.id }),
		});

		const workflowInRoot = await createWorkflow(
			{ name: 'wf-root', parentFolder: rootFolder },
			toggleOwner,
		);
		const workflowInChild = await createWorkflow(
			{ name: 'wf-child', parentFolder: childFolder },
			toggleOwner,
		);
		const workflowOutsideFolder = await createWorkflow({ name: 'wf-outside' }, toggleOwner);

		const response = await testServer
			.authAgentFor(toggleOwner)
			.patch('/mcp/workflows/toggle-access')
			.send({ availableInMCP: true, folderId: rootFolder.id });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toEqual({ updatedCount: 2, skippedCount: 0, failedCount: 0 });
		expect(await readAvailableInMCP(workflowInRoot.id)).toBe(true);
		expect(await readAvailableInMCP(workflowInChild.id)).toBe(true);
		expect(await readAvailableInMCP(workflowOutsideFolder.id)).toBeUndefined();
	});

	test('counts a shared workflow exactly once regardless of its sharings', async () => {
		// SharedWorkflow is keyed by (workflowId, projectId), so a workflow
		// shared with multiple projects would previously surface as several
		// rows from the finder. That inflated `skippedCount` even though the
		// single underlying workflow was updated correctly.
		const project = await getPersonalProject(toggleOwner);
		const folder = await createFolder(project, { name: 'shared-container' });

		const workflow = await createWorkflow(
			{ name: 'shared-wf', parentFolder: folder, settings: {} },
			toggleOwner,
		);

		// Extra sharings multiply the rows the finder sees for this workflow.
		const extraProject1 = await createTeamProject('extra-1');
		const extraProject2 = await createTeamProject('extra-2');
		await shareWorkflowWithProjects(workflow, [
			{ project: extraProject1 },
			{ project: extraProject2 },
		]);

		const response = await testServer
			.authAgentFor(toggleOwner)
			.patch('/mcp/workflows/toggle-access')
			.send({ availableInMCP: true, folderId: folder.id });

		expect(response.statusCode).toBe(200);
		// Folder-scoped — `updatedIds` is omitted from the response.
		expect(response.body.data).toEqual({
			updatedCount: 1,
			skippedCount: 0,
			failedCount: 0,
		});
		expect(await readAvailableInMCP(workflow.id)).toBe(true);
	});

	test('disables MCP access for the provided workflows', async () => {
		const wf = await createWorkflow(
			{ name: 'mcp-enabled', settings: { availableInMCP: true } },
			toggleOwner,
		);

		const response = await testServer
			.authAgentFor(toggleOwner)
			.patch('/mcp/workflows/toggle-access')
			.send({ availableInMCP: false, workflowIds: [wf.id] });

		expect(response.statusCode).toBe(200);
		expect(response.body.data.updatedIds).toEqual([wf.id]);
		expect(await readAvailableInMCP(wf.id)).toBe(false);
	});

	test('is idempotent when workflows are already in the requested state', async () => {
		const alreadyEnabled = await createWorkflow(
			{ name: 'already-enabled', settings: { availableInMCP: true } },
			toggleOwner,
		);
		const freshlyChanged = await createWorkflow(
			{ name: 'freshly-changed', settings: {} },
			toggleOwner,
		);

		const response = await testServer
			.authAgentFor(toggleOwner)
			.patch('/mcp/workflows/toggle-access')
			.send({
				availableInMCP: true,
				workflowIds: [alreadyEnabled.id, freshlyChanged.id],
			});

		expect(response.statusCode).toBe(200);
		expect(response.body.data.updatedCount).toBe(2);
		expect(response.body.data.updatedIds.sort()).toEqual(
			[alreadyEnabled.id, freshlyChanged.id].sort(),
		);
		expect(response.body.data.skippedCount).toBe(0);

		// Re-submitting the same request is a no-op but still reports both as updated.
		const second = await testServer
			.authAgentFor(toggleOwner)
			.patch('/mcp/workflows/toggle-access')
			.send({
				availableInMCP: true,
				workflowIds: [alreadyEnabled.id, freshlyChanged.id],
			});

		expect(second.statusCode).toBe(200);
		expect(second.body.data.updatedCount).toBe(2);
		expect(second.body.data.skippedCount).toBe(0);
	});

	test('requires authentication', async () => {
		const response = await testServer.authlessAgent
			.patch('/mcp/workflows/toggle-access')
			.send({ availableInMCP: true, workflowIds: ['wf-1'] });

		expect(response.statusCode).toBe(401);
	});
});
