import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { AuthRolesService, RoleRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';

import { RoleCacheService } from '@/services/role-cache.service';

import { createMemberWithApiKey } from './shared/db/users';
import * as utils from './shared/utils/';

describe('N8N_CANVAS_ONLY_PERSONAL_SPACE_SCOPE_DENY_LIST', () => {
	const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });
	const { canvasOnly } = Container.get(GlobalConfig);

	let member: User;

	const credentialPayload = () => ({
		name: 'test credential',
		type: 'githubApi',
		data: { accessToken: 'abcdefghijklmnopqrstuvwxyz', user: 'test', server: 'testServer' },
	});

	const workflowPayload = () => ({
		name: 'test workflow',
		nodes: [],
		connections: {},
		staticData: null,
		settings: { executionOrder: 'v1' },
	});

	const storedScopes = async () => {
		const role = await Container.get(RoleRepository).findBySlug(PROJECT_OWNER_ROLE_SLUG);
		return role?.scopes.map((s) => s.slug) ?? [];
	};

	/** Re-runs the system role sync, as a restart does, and drops the role cache. */
	const syncRoles = async () => {
		await Container.get(AuthRolesService).init();
		await Container.get(RoleCacheService).invalidateCache();
	};

	beforeAll(async () => {
		await testDb.init();
		await utils.initCredentialsTypes();
	});

	beforeEach(async () => {
		await testDb.truncate([
			'SharedCredentials',
			'CredentialsEntity',
			'SharedWorkflow',
			'WorkflowEntity',
			'User',
		]);
		member = await createMemberWithApiKey();
	});

	afterEach(async () => {
		canvasOnly.enabled = false;
		canvasOnly.personalSpaceScopeDenyList = [];
		await syncRoles();
	});

	it('stops credential creation in the personal project but keeps workflows working', async () => {
		const before = await testServer
			.publicApiAgentFor(member)
			.post('/credentials')
			.send(credentialPayload());
		expect(before.status).toBe(200);

		canvasOnly.enabled = true;
		canvasOnly.personalSpaceScopeDenyList = ['credential:create'];
		await syncRoles();

		expect(await storedScopes()).not.toContain('credential:create');

		const after = await testServer
			.publicApiAgentFor(member)
			.post('/credentials')
			.send(credentialPayload());
		expect(after.status).toBe(403);

		const workflow = await testServer
			.publicApiAgentFor(member)
			.post('/workflows')
			.send(workflowPayload());
		expect(workflow.status).toBe(200);
	});

	it('removes every denied scope and keeps the rest of the role', async () => {
		canvasOnly.enabled = true;
		canvasOnly.personalSpaceScopeDenyList = [
			'credential:create',
			'dataTable:create',
			'agent:create',
		];
		await syncRoles();

		const scopes = await storedScopes();
		expect(scopes).not.toContain('credential:create');
		expect(scopes).not.toContain('dataTable:create');
		expect(scopes).not.toContain('agent:create');
		expect(scopes).toContain('workflow:create');
		expect(scopes).toContain('credential:read');
	});

	it('gives the scopes back once the deny list is cleared', async () => {
		canvasOnly.enabled = true;
		canvasOnly.personalSpaceScopeDenyList = ['credential:create'];
		await syncRoles();
		expect(await storedScopes()).not.toContain('credential:create');

		canvasOnly.personalSpaceScopeDenyList = [];
		await syncRoles();

		expect(await storedScopes()).toContain('credential:create');
		const created = await testServer
			.publicApiAgentFor(member)
			.post('/credentials')
			.send(credentialPayload());
		expect(created.status).toBe(200);
	});

	it('ignores the deny list when canvas-only mode is off', async () => {
		canvasOnly.enabled = false;
		canvasOnly.personalSpaceScopeDenyList = ['credential:create'];
		await syncRoles();

		expect(await storedScopes()).toContain('credential:create');
	});
});
