import type { CreateRoleMappingRuleDto } from '@n8n/api-types';
import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { RoleMappingRuleRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import assert from 'node:assert';

import { createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

describe('Role mapping rules in Public API', () => {
	let owner: User;
	let teamProject: Project;

	const testServer = setupTestServer({
		endpointGroups: ['publicApi'],
		enabledFeatures: ['feat:saml'],
	});

	const validInstancePayload: CreateRoleMappingRuleDto = {
		expression: 'claims.group === "admins"',
		role: 'global:member',
		type: 'instance' as const,
		order: 0,
	};

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['RoleMappingRule', 'Project', 'User']);
		owner = await createOwnerWithApiKey();
		teamProject = await createTeamProject(undefined, owner);
	});

	describe('POST /role-mapping-rules', () => {
		it('creates an instance rule and returns 201', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/role-mapping-rules')
				.send(validInstancePayload);

			expect(response.status).toBe(201);
			expect(response.body).toEqual({
				id: expect.any(String),
				expression: validInstancePayload.expression,
				role: 'global:member',
				type: 'instance',
				order: 0,
				projectIds: [],
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});

			const stored = await Container.get(RoleMappingRuleRepository).findOne({
				where: { id: response.body.id },
				relations: ['projects', 'role'],
			});

			assert(stored, 'Rule should be stored in the database');

			expect(stored.expression).toBe(validInstancePayload.expression);
			expect(stored.role.slug).toBe('global:member');
			expect(stored.projects).toHaveLength(0);
		});

		it('creates a project rule linked to the given projects and returns 201', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/role-mapping-rules')
				.send({
					expression: 'claims.project === "alpha"',
					role: 'project:editor',
					type: 'project',
					projectIds: [teamProject.id],
				});

			expect(response.status).toBe(201);
			expect(response.body.type).toBe('project');
			expect(response.body.projectIds).toEqual([teamProject.id]);
		});

		it('appends the rule when order is omitted', async () => {
			const agent = testServer.publicApiAgentFor(owner);

			const { expression, role, type } = validInstancePayload;
			await agent.post('/role-mapping-rules').send(validInstancePayload).expect(201);

			const appended = await agent
				.post('/role-mapping-rules')
				.send({ expression: `${expression} || false`, role, type });

			expect(appended.status).toBe(201);
			expect(appended.body.order).toBe(1);
		});

		it('rejects a malformed body with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/role-mapping-rules')
				.send({ ...validInstancePayload, expression: '' });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('String must contain at least 1 character(s)');
		});

		it('rejects a project rule without projectIds with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/role-mapping-rules')
				.send({ expression: 'true', role: 'project:editor', type: 'project' });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('projectIds is required when type is project');
		});

		it('rejects an instance rule carrying projectIds with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/role-mapping-rules')
				.send({ ...validInstancePayload, projectIds: [teamProject.id] });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'projectIds must be omitted or empty when type is instance',
			);
		});

		it('rejects a role incompatible with the rule type with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/role-mapping-rules')
				.send({ ...validInstancePayload, role: 'project:editor' });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Instance mapping rules must use a global role');
		});

		it('rejects an unknown project id with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/role-mapping-rules')
				.send({
					expression: 'true',
					role: 'project:editor',
					type: 'project',
					projectIds: ['does-not-exist'],
				});

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('One or more projects were not found');
		});

		it('rejects an unknown role slug with 404', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/role-mapping-rules')
				.send({ ...validInstancePayload, role: 'global:nonexistent-role-slug-xyz' });

			expect(response.status).toBe(404);
			expect(response.body.message).toBe(
				'Could not find role with slug "global:nonexistent-role-slug-xyz"',
			);
		});

		it('rejects with 401 without an API key', async () => {
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.post('/role-mapping-rules')
				.send(validInstancePayload);

			expect(response.status).toBe(401);
		});

		it('rejects with 401 with an invalid API key', async () => {
			const response = await testServer
				.publicApiAgentWithApiKey('invalid-key')
				.post('/role-mapping-rules')
				.send(validInstancePayload);

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when the key lacks roleMappingRule:create', async () => {
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['user:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.post('/role-mapping-rules')
				.send(validInstancePayload);

			expect(response.status).toBe(403);
		});

		it('rejects with 403 when provisioning is not licensed', async () => {
			testServer.license.disable('feat:saml');
			testServer.license.disable('feat:oidc');

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/role-mapping-rules')
				.send(validInstancePayload);

			expect(response.status).toBe(403);
			expect(response.body.message).toBe('Provisioning is not licensed');

			testServer.license.enable('feat:saml');
		});
	});

	describe('GET /role-mapping-rules', () => {
		it('returns an empty list with a null cursor when no rules exist', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/role-mapping-rules');

			expect(response.status).toBe(200);
			expect(response.body.nextCursor).toBeNull();
			expect(response.body.data).toEqual([]);
		});

		it('returns the configured rules with the full public field set', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			await agent.post('/role-mapping-rules').send(validInstancePayload).expect(201);

			const response = await agent.get('/role-mapping-rules');

			expect(response.status).toBe(200);
			expect(response.body.nextCursor).toBeNull();
			expect(response.body.data).toEqual([
				{
					id: expect.any(String),
					expression: validInstancePayload.expression,
					role: 'global:member',
					type: 'instance',
					order: 0,
					projectIds: [],
					createdAt: expect.any(String),
					updatedAt: expect.any(String),
				},
			]);
		});

		it('returns rules for a type in evaluation order', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const { expression, role, type } = validInstancePayload;
			await agent.post('/role-mapping-rules').send(validInstancePayload).expect(201);
			await agent
				.post('/role-mapping-rules')
				.send({ expression: `${expression} || false`, role, type })
				.expect(201);

			const response = await agent.get('/role-mapping-rules').query({ type: 'instance' });

			expect(response.status).toBe(200);
			expect(response.body.data.map((rule: { order: number }) => rule.order)).toEqual([0, 1]);
		});

		it('filters by type', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			await agent.post('/role-mapping-rules').send(validInstancePayload).expect(201);
			await agent
				.post('/role-mapping-rules')
				.send({
					expression: 'claims.project === "alpha"',
					role: 'project:editor',
					type: 'project',
					projectIds: [teamProject.id],
				})
				.expect(201);

			const instanceOnly = await agent.get('/role-mapping-rules').query({ type: 'instance' });
			expect(instanceOnly.body.data).toHaveLength(1);
			expect(instanceOnly.body.data[0].type).toBe('instance');

			const projectOnly = await agent.get('/role-mapping-rules').query({ type: 'project' });
			expect(projectOnly.body.data).toHaveLength(1);
			expect(projectOnly.body.data[0].type).toBe('project');
		});

		it('paginates with cursor and limit', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const { expression, role, type } = validInstancePayload;
			await agent.post('/role-mapping-rules').send(validInstancePayload).expect(201);
			await agent
				.post('/role-mapping-rules')
				.send({ expression: `${expression} || false`, role, type })
				.expect(201);

			const firstPage = await agent.get('/role-mapping-rules').query({ limit: 1 });
			expect(firstPage.status).toBe(200);
			expect(firstPage.body.data).toHaveLength(1);
			expect(firstPage.body.data[0].order).toBe(0);
			expect(firstPage.body.nextCursor).toEqual(expect.any(String));

			const secondPage = await agent
				.get('/role-mapping-rules')
				.query({ cursor: firstPage.body.nextCursor });
			expect(secondPage.status).toBe(200);
			expect(secondPage.body.data).toHaveLength(1);
			expect(secondPage.body.data[0].order).toBe(1);
			expect(secondPage.body.nextCursor).toBeNull();
		});

		it('rejects an undecodable cursor with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/role-mapping-rules')
				.query({ cursor: 'not-a-valid-cursor' });

			expect(response.status).toBe(400);
		});

		it('rejects an invalid type filter with 400', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/role-mapping-rules')
				.query({ type: 'bogus' });

			expect(response.status).toBe(400);
		});

		it('rejects with 401 without an API key', async () => {
			const response = await testServer.publicApiAgentWithoutApiKey().get('/role-mapping-rules');

			expect(response.status).toBe(401);
		});

		it('rejects with 401 with an invalid API key', async () => {
			const response = await testServer
				.publicApiAgentWithApiKey('invalid-key')
				.get('/role-mapping-rules');

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when the key lacks roleMappingRule:list', async () => {
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['user:read'] });

			const response = await testServer.publicApiAgentFor(scopedOwner).get('/role-mapping-rules');

			expect(response.status).toBe(403);
		});

		it('rejects with 403 when provisioning is not licensed', async () => {
			testServer.license.disable('feat:saml');
			testServer.license.disable('feat:oidc');

			const response = await testServer.publicApiAgentFor(owner).get('/role-mapping-rules');

			expect(response.status).toBe(403);
			expect(response.body.message).toBe('Provisioning is not licensed');

			testServer.license.enable('feat:saml');
		});
	});
});
