import type { CreateRoleMappingRuleDto, RoleMappingRulePublicDto } from '@n8n/api-types';
import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { ProjectRepository, RoleMappingRuleRepository, type Project, type User } from '@n8n/db';
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

	const createRule = async (payload: Partial<CreateRoleMappingRuleDto>) => {
		const response = await testServer
			.publicApiAgentFor(owner)
			.post('/role-mapping-rules')
			.send(payload);

		expect(response.status).toBe(201);

		return response.body as RoleMappingRulePublicDto;
	};

	const createInstanceRule = async (overrides: Partial<CreateRoleMappingRuleDto> = {}) => {
		const { expression, role, type } = validInstancePayload;

		return await createRule({ expression, role, type, ...overrides });
	};

	const createProjectRule = async (overrides: Partial<CreateRoleMappingRuleDto> = {}) =>
		await createRule({
			expression: 'claims.project === "alpha"',
			role: 'project:editor',
			type: 'project',
			projectIds: [teamProject.id],
			...overrides,
		});

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
			expect(response.body.message).toBe(
				'request/body/expression String must contain at least 1 character(s)',
			);
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
			await createInstanceRule();

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
			await createInstanceRule();
			await createInstanceRule({ expression: `${validInstancePayload.expression} || false` });

			const response = await agent.get('/role-mapping-rules').query({ type: 'instance' });

			expect(response.status).toBe(200);
			expect(response.body.data.map((rule: { order: number }) => rule.order)).toEqual([0, 1]);
		});

		it('filters by type', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			await createInstanceRule();
			await createProjectRule();

			const instanceOnly = await agent.get('/role-mapping-rules').query({ type: 'instance' });
			expect(instanceOnly.body.data).toHaveLength(1);
			expect(instanceOnly.body.data[0].type).toBe('instance');

			const projectOnly = await agent.get('/role-mapping-rules').query({ type: 'project' });
			expect(projectOnly.body.data).toHaveLength(1);
			expect(projectOnly.body.data[0].type).toBe('project');
		});

		it('paginates with cursor and limit', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			await createInstanceRule();
			await createInstanceRule({ expression: `${validInstancePayload.expression} || false` });

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

	describe('POST /role-mapping-rules/{roleMappingRuleId}/move', () => {
		it('moves a rule to an earlier position and returns 200', async () => {
			const agent = testServer.publicApiAgentFor(owner);

			const first = await createInstanceRule();
			const second = await createInstanceRule({
				expression: `${validInstancePayload.expression} || false`,
			});

			const response = await agent
				.post(`/role-mapping-rules/${second.id}/move`)
				.send({ targetIndex: 0 });

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				id: second.id,
				expression: second.expression,
				role: 'global:member',
				type: 'instance',
				order: 0,
				projectIds: [],
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});

			const list = await agent.get('/role-mapping-rules');
			expect(list.body.data.map((rule: { id: string }) => rule.id)).toEqual([second.id, first.id]);
		});

		it('renumbers sibling rules of the same type', async () => {
			const agent = testServer.publicApiAgentFor(owner);

			const first = await createInstanceRule();
			const second = await createInstanceRule({
				expression: `${validInstancePayload.expression} || false`,
			});
			const third = await createInstanceRule({
				expression: `${validInstancePayload.expression} || true`,
			});

			await agent.post(`/role-mapping-rules/${third.id}/move`).send({ targetIndex: 0 });

			const list = await agent.get('/role-mapping-rules');
			expect(
				list.body.data.map((rule: { id: string; order: number }) => ({
					id: rule.id,
					order: rule.order,
				})),
			).toEqual([
				{ id: third.id, order: 0 },
				{ id: first.id, order: 1 },
				{ id: second.id, order: 2 },
			]);
		});

		it("only renumbers the moved rule's own type", async () => {
			const agent = testServer.publicApiAgentFor(owner);

			await createInstanceRule();
			const secondInstance = await createInstanceRule({
				expression: `${validInstancePayload.expression} || false`,
			});

			const firstProject = await createProjectRule();
			const secondProject = await createProjectRule({
				expression: 'claims.project === "beta"',
			});

			await agent.post(`/role-mapping-rules/${secondInstance.id}/move`).send({ targetIndex: 0 });

			const projectRules = await agent.get('/role-mapping-rules').query({ type: 'project' });
			expect(
				projectRules.body.data.map((rule: { id: string; order: number }) => ({
					id: rule.id,
					order: rule.order,
				})),
			).toEqual([
				{ id: firstProject.id, order: 0 },
				{ id: secondProject.id, order: 1 },
			]);
		});

		it('clamps a targetIndex beyond the last position to the end', async () => {
			const agent = testServer.publicApiAgentFor(owner);

			const first = await createInstanceRule();
			const second = await createInstanceRule({
				expression: `${validInstancePayload.expression} || false`,
			});

			const response = await agent
				.post(`/role-mapping-rules/${first.id}/move`)
				.send({ targetIndex: 99 });

			expect(response.status).toBe(200);
			expect(response.body.order).toBe(1);

			const list = await agent.get('/role-mapping-rules');
			expect(list.body.data.map((rule: { id: string }) => rule.id)).toEqual([second.id, first.id]);
		});

		it('rejects a negative targetIndex with 400', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const created = await createInstanceRule();

			const response = await agent
				.post(`/role-mapping-rules/${created.id}/move`)
				.send({ targetIndex: -1 });

			expect(response.status).toBe(400);
		});

		it('rejects a missing targetIndex with 400', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const created = await createInstanceRule();

			const response = await agent.post(`/role-mapping-rules/${created.id}/move`).send({});

			expect(response.status).toBe(400);
		});

		it('rejects an unknown rule id with 404', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/role-mapping-rules/does-not-exist/move')
				.send({ targetIndex: 0 });

			expect(response.status).toBe(404);
		});

		it('rejects with 403 when the key lacks roleMappingRule:update', async () => {
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['user:read'] });
			const created = await createInstanceRule();

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.post(`/role-mapping-rules/${created.id}/move`)
				.send({ targetIndex: 0 });

			expect(response.status).toBe(403);
		});

		it('rejects with 403 when provisioning is not licensed', async () => {
			const agent = testServer.publicApiAgentFor(owner);
			const created = await createInstanceRule();

			testServer.license.disable('feat:saml');
			testServer.license.disable('feat:oidc');

			const response = await agent
				.post(`/role-mapping-rules/${created.id}/move`)
				.send({ targetIndex: 0 });

			expect(response.status).toBe(403);
			expect(response.body.message).toBe('Provisioning is not licensed');

			testServer.license.enable('feat:saml');
		});
	});

	describe('PATCH /role-mapping-rules/{roleMappingRuleId}', () => {
		it('updates all provided fields on an instance rule and returns 200', async () => {
			const rule = await createInstanceRule();

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({
					expression: 'claims.group === "engineers"',
					role: 'global:admin',
					projectIds: [],
				});

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				id: rule.id,
				expression: 'claims.group === "engineers"',
				role: 'global:admin',
				type: 'instance',
				order: 0,
				projectIds: [],
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});

			const stored = await Container.get(RoleMappingRuleRepository).findOne({
				where: { id: rule.id },
				relations: ['projects', 'role'],
			});

			assert(stored, 'Rule should still be stored in the database');

			expect(stored.expression).toBe('claims.group === "engineers"');
			expect(stored.role.slug).toBe('global:admin');
			expect(stored.projects).toHaveLength(0);
		});

		it('replaces the project assignments of a project rule', async () => {
			const rule = await createProjectRule();
			const otherProject = await createTeamProject(undefined, owner);

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({ projectIds: [otherProject.id] });

			expect(response.status).toBe(200);
			expect(response.body.projectIds).toEqual([otherProject.id]);
			expect(response.body.expression).toBe(rule.expression);
			expect(response.body.role).toBe(rule.role);
		});

		it('keeps the rule at its position in the evaluation order', async () => {
			const agent = testServer.publicApiAgentFor(owner);

			const first = await createInstanceRule();
			const second = await createInstanceRule({
				expression: `${validInstancePayload.expression} || false`,
			});

			const response = await agent
				.patch(`/role-mapping-rules/${second.id}`)
				.send({ expression: 'claims.group === "engineers"' });

			expect(response.status).toBe(200);
			expect(response.body.order).toBe(1);

			const list = await agent.get('/role-mapping-rules');
			expect(list.body.data.map((rule: { id: string }) => rule.id)).toEqual([first.id, second.id]);
		});

		it("ignores an attempt to change an instance rule's type", async () => {
			const rule = await createInstanceRule();

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({ expression: 'claims.group === "engineers"', type: 'project' });

			expect(response.status).toBe(200);
			expect(response.body.type).toBe('instance');
			expect(response.body.expression).toBe('claims.group === "engineers"');
		});

		it("ignores an attempt to change a project rule's type", async () => {
			const rule = await createProjectRule();

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({ expression: 'claims.project === "beta"', type: 'instance' });

			expect(response.status).toBe(200);
			expect(response.body.type).toBe('project');
			expect(response.body.expression).toBe('claims.project === "beta"');
		});

		it('rejects with 404 when the rule id is unknown', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.patch('/role-mapping-rules/00000000-0000-4000-8000-000000000000')
				.send({ expression: 'claims.group === "engineers"' });

			expect(response.status).toBe(404);
			expect(response.body.message).toBe('Could not find role mapping rule');
		});

		it('rejects with 404 when the role slug is unknown', async () => {
			const rule = await createInstanceRule();

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({ role: 'global:nonexistent' });

			expect(response.status).toBe(404);
			expect(response.body.message).toBe('Could not find role with slug "global:nonexistent"');
		});

		it('rejects an empty body with 400', async () => {
			const rule = await createInstanceRule();

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('At least one field is required');
		});

		it('rejects a body with only an unsupported field with 400', async () => {
			const rule = await createInstanceRule();

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({ type: 'project' });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('At least one field is required');
		});

		it('rejects a malformed body with 400', async () => {
			const rule = await createInstanceRule();

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({ expression: '' });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'request/body/expression String must contain at least 1 character(s)',
			);
		});

		it('rejects an instance rule carrying projectIds with 400', async () => {
			const rule = await createInstanceRule();

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({ projectIds: [teamProject.id] });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe(
				'projectIds must be omitted or empty when type is instance',
			);
		});

		it('rejects a role incompatible with the rule type with 400', async () => {
			const rule = await createInstanceRule();

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({ role: 'project:editor' });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('Instance mapping rules must use a global role');
		});

		it('rejects an unknown project with 400', async () => {
			const rule = await createProjectRule();

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({ projectIds: ['00000000-0000-4000-8000-000000000000'] });

			expect(response.status).toBe(400);
			expect(response.body.message).toBe('One or more projects were not found');
		});

		it('rejects with 403 when the key lacks roleMappingRule:update', async () => {
			const rule = await createInstanceRule();
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['user:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({ expression: 'claims.group === "engineers"' });

			expect(response.status).toBe(403);
		});

		it('rejects with 403 when provisioning is not licensed', async () => {
			const rule = await createInstanceRule();

			testServer.license.disable('feat:saml');
			testServer.license.disable('feat:oidc');

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/role-mapping-rules/${rule.id}`)
				.send({ expression: 'claims.group === "engineers"' });

			expect(response.status).toBe(403);
			expect(response.body.message).toBe('Provisioning is not licensed');

			testServer.license.enable('feat:saml');
		});
	});

	describe('DELETE /role-mapping-rules/:roleMappingRuleId', () => {
		it('deletes a rule and returns 200 with the deleted rule', async () => {
			const rule = await createInstanceRule(validInstancePayload);

			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/role-mapping-rules/${rule.id}`);

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				id: rule.id,
				expression: rule.expression,
				role: rule.role,
				type: rule.type,
				order: rule.order,
				projectIds: rule.projectIds,
				createdAt: rule.createdAt,
				updatedAt: rule.updatedAt,
			});

			const stored = await Container.get(RoleMappingRuleRepository).findOneBy({ id: rule.id });
			expect(stored).toBeNull();
		});

		it('closes the gap in the evaluation order of the remaining rules', async () => {
			const { expression, role, type } = validInstancePayload;

			const first = await createInstanceRule(validInstancePayload);
			const second = await createInstanceRule({ expression, role, type, order: 1 });
			const third = await createInstanceRule({ expression, role, type, order: 2 });

			await testServer
				.publicApiAgentFor(owner)
				.delete(`/role-mapping-rules/${second.id}`)
				.expect(200);

			const remaining = await testServer
				.publicApiAgentFor(owner)
				.get('/role-mapping-rules?type=instance')
				.expect(200);

			expect(remaining.body.data).toEqual([
				expect.objectContaining({ id: first.id, order: 0 }),
				expect.objectContaining({ id: third.id, order: 1 }),
			]);
		});

		it('deletes a project rule without deleting the projects it referenced', async () => {
			const rule = await createProjectRule({
				expression: 'claims.project === "alpha"',
				role: 'project:editor',
				type: 'project',
				projectIds: [teamProject.id],
			});

			await testServer
				.publicApiAgentFor(owner)
				.delete(`/role-mapping-rules/${rule.id}`)
				.expect(200);

			const stored = await Container.get(RoleMappingRuleRepository).findOneBy({ id: rule.id });
			expect(stored).toBeNull();

			const project = await Container.get(ProjectRepository).findOneBy({ id: teamProject.id });
			expect(project).not.toBeNull();
		});

		it('rejects an unknown rule id with 404', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.delete('/role-mapping-rules/00000000-0000-4000-8000-000000000000');

			expect(response.status).toBe(404);
		});

		it('rejects with 403 when the key lacks roleMappingRule:delete', async () => {
			const rule = await createInstanceRule(validInstancePayload);
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['user:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.delete(`/role-mapping-rules/${rule.id}`);

			expect(response.status).toBe(403);
		});

		it('rejects with 403 when provisioning is not licensed', async () => {
			const rule = await createInstanceRule(validInstancePayload);

			testServer.license.disable('feat:saml');
			testServer.license.disable('feat:oidc');

			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/role-mapping-rules/${rule.id}`);

			expect(response.status).toBe(403);
			expect(response.body.message).toBe('Provisioning is not licensed');

			testServer.license.enable('feat:saml');
		});
	});
});
