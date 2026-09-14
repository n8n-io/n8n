import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { AuthRolesService, RoleRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { PERSONAL_SPACE_REMOVABLE_SCOPES, PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';

import { RoleService } from '@/services/role.service';

import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import * as utils from '../shared/utils/';

describe('PUT /roles/project:personalOwner in canvas-only mode', () => {
	const testServer = utils.setupTestServer({
		endpointGroups: ['publicApi'],
		enabledFeatures: ['feat:customRoles'],
	});
	const globalConfig = Container.get(GlobalConfig);

	let owner: User;
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

	/** The current role as a PUT body, with `scopes` mapped. */
	const bodyFromCurrentRole = async (mapScopes: (scopes: string[]) => string[]) => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.get(`/roles/${PROJECT_OWNER_ROLE_SLUG}`);
		expect(response.status).toBe(200);
		return {
			displayName: response.body.displayName,
			description: response.body.description,
			scopes: mapScopes(response.body.scopes as string[]),
		};
	};

	const put = async (slug: string, body: object) =>
		await testServer.publicApiAgentFor(owner).put(`/roles/${slug}`).send(body);

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
		owner = await createOwnerWithApiKey();
		member = await createMemberWithApiKey();
		globalConfig.canvasOnly = true;
	});

	afterEach(async () => {
		globalConfig.canvasOnly = false;
		// Give the role its default scopes back, so the next test starts clean.
		await Container.get(RoleService).addScopesToRole(PROJECT_OWNER_ROLE_SLUG, [
			...PERSONAL_SPACE_REMOVABLE_SCOPES,
		]);
	});

	it('stops credential creation in the personal project but keeps workflows working', async () => {
		const before = await testServer
			.publicApiAgentFor(member)
			.post('/credentials')
			.send(credentialPayload());
		expect(before.status).toBe(200);

		const response = await put(
			PROJECT_OWNER_ROLE_SLUG,
			await bodyFromCurrentRole((scopes) => scopes.filter((s) => s !== 'credential:create')),
		);

		expect(response.status).toBe(200);
		expect(response.body.scopes).not.toContain('credential:create');

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

		// A restart re-syncs the system roles. It must keep the scope removed.
		await Container.get(AuthRolesService).init();
		expect(await storedScopes()).not.toContain('credential:create');
	});

	it('adds credential:create back', async () => {
		const removed = await put(
			PROJECT_OWNER_ROLE_SLUG,
			await bodyFromCurrentRole((scopes) => scopes.filter((s) => s !== 'credential:create')),
		);
		expect(removed.status).toBe(200);

		const response = await put(
			PROJECT_OWNER_ROLE_SLUG,
			await bodyFromCurrentRole((scopes) => [...scopes, 'credential:create']),
		);

		expect(response.status).toBe(200);
		expect(response.body.scopes).toContain('credential:create');

		const created = await testServer
			.publicApiAgentFor(member)
			.post('/credentials')
			.send(credentialPayload());
		expect(created.status).toBe(200);
	});

	it('rejects the request with 400 when canvas-only mode is off', async () => {
		const body = await bodyFromCurrentRole((scopes) =>
			scopes.filter((s) => s !== 'credential:create'),
		);
		globalConfig.canvasOnly = false;

		const response = await put(PROJECT_OWNER_ROLE_SLUG, body);

		expect(response.status).toBe(400);
		expect(response.body.message).toContain('Cannot update system roles');
		expect(await storedScopes()).toContain('credential:create');
	});

	it('rejects a scope that is not a default scope of the role with 400', async () => {
		const response = await put(
			PROJECT_OWNER_ROLE_SLUG,
			await bodyFromCurrentRole((scopes) => [...scopes, 'user:create']),
		);

		expect(response.status).toBe(400);
		expect(await storedScopes()).toContain('credential:create');
	});

	it('rejects removing any other default scope with 400', async () => {
		const response = await put(
			PROJECT_OWNER_ROLE_SLUG,
			await bodyFromCurrentRole((scopes) => scopes.filter((s) => s !== 'workflow:create')),
		);

		expect(response.status).toBe(400);
		expect(await storedScopes()).toContain('workflow:create');
	});

	it('rejects a changed display name with 400', async () => {
		const body = await bodyFromCurrentRole((scopes) => scopes);

		const response = await put(PROJECT_OWNER_ROLE_SLUG, {
			...body,
			displayName: 'Renamed personal owner',
		});

		expect(response.status).toBe(400);
	});

	it('rejects a changed description with 400', async () => {
		const body = await bodyFromCurrentRole((scopes) => scopes);

		const response = await put(PROJECT_OWNER_ROLE_SLUG, {
			...body,
			description: 'A new description',
		});

		expect(response.status).toBe(400);
	});

	it('still rejects updating another system role with 400', async () => {
		const response = await put('project:admin', {
			displayName: 'Project admin',
			description: null,
			scopes: ['workflow:create'],
		});

		expect(response.status).toBe(400);
		expect(response.body.message).toContain('Cannot update system roles');
	});
});
