import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { RoleMappingRuleRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { RESPONSE_ERROR_MESSAGES } from '@/constants';

import { createMember, createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['role', 'roleMappingRule'],
	enabledFeatures: ['feat:saml'],
});

let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;
let authlessAgent: SuperAgentTest;
let owner: User;

beforeAll(async () => {
	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);
	memberAgent = testServer.authAgentFor(await createMember());
	authlessAgent = testServer.authlessAgent;
});

afterEach(async () => {
	await testDb.truncate(['RoleMappingRule']);
});

describe('POST /role-mapping-rule', () => {
	const validInstancePayload = {
		expression: 'claims.group === "admins"',
		role: 'global:member',
		type: 'instance' as const,
		order: 0,
	};

	it('should return 401 when unauthenticated', async () => {
		await authlessAgent.post('/role-mapping-rule').send(validInstancePayload).expect(401);
	});

	it('should return 403 when user lacks roleMappingRule:create', async () => {
		const response = await memberAgent.post('/role-mapping-rule').send(validInstancePayload);

		expect(response.status).toBe(403);
		expect(response.body.message).toBe(RESPONSE_ERROR_MESSAGES.MISSING_SCOPE);
	});

	it('should return 403 when provisioning is not licensed', async () => {
		testServer.license.disable('feat:saml');
		testServer.license.disable('feat:oidc');

		const response = await ownerAgent.post('/role-mapping-rule').send(validInstancePayload);

		expect(response.status).toBe(403);
		expect(response.body).toEqual({ message: 'Provisioning is not licensed' });
	});

	it('should return 400 when body fails Zod validation', async () => {
		const response = await ownerAgent.post('/role-mapping-rule').send({
			expression: '',
			role: 'global:member',
			type: 'instance',
			order: 0,
		});

		expect(response.status).toBe(400);
	});

	it('should return 400 when type is project but projectIds is missing', async () => {
		const response = await ownerAgent
			.post('/role-mapping-rule')
			.send({
				expression: 'true',
				role: 'project:editor',
				type: 'project',
				order: 0,
			})
			.expect(400);

		expect(response.body.message).toContain('projectIds');
	});

	it('should return 404 when role slug does not exist', async () => {
		const response = await ownerAgent
			.post('/role-mapping-rule')
			.send({
				...validInstancePayload,
				role: 'global:nonexistent-role-slug-xyz',
			})
			.expect(404);

		expect(response.body.message).toContain('Could not find role');
	});

	it('should create an instance mapping rule and persist it', async () => {
		const response = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);

		expect(response.body.data).toMatchObject({
			expression: validInstancePayload.expression,
			role: validInstancePayload.role,
			type: 'instance',
			order: 0,
			projectIds: [],
		});
		expect(response.body.data.id).toEqual(expect.any(String));
		expect(response.body.data.createdAt).toEqual(expect.any(String));
		expect(response.body.data.updatedAt).toEqual(expect.any(String));

		const repo = Container.get(RoleMappingRuleRepository);
		const stored = await repo.findOne({
			where: { id: response.body.data.id },
			relations: ['projects', 'role'],
		});
		expect(stored).not.toBeNull();
		expect(stored!.expression).toBe(validInstancePayload.expression);
		expect(stored!.role.slug).toBe('global:member');
		expect(stored!.projects).toHaveLength(0);
	});

	it('should return 409 when type and order match an existing rule', async () => {
		await ownerAgent.post('/role-mapping-rule').send(validInstancePayload).expect(200);

		const response = await ownerAgent.post('/role-mapping-rule').send({
			...validInstancePayload,
			expression: 'claims.other === true',
		});

		expect(response.status).toBe(409);
		expect(response.body.message).toContain('already exists');
		expect(response.body.message).toContain('order');
	});

	it('should create a project mapping rule linked to team projects', async () => {
		const teamProject = await createTeamProject(undefined, owner);

		const response = await ownerAgent
			.post('/role-mapping-rule')
			.send({
				expression: 'claims.project === "alpha"',
				role: 'project:editor',
				type: 'project',
				order: 3,
				projectIds: [teamProject.id],
			})
			.expect(200);

		expect(response.body.data).toMatchObject({
			type: 'project',
			order: 3,
		});
		expect(response.body.data.projectIds).toContain(teamProject.id);

		const repo = Container.get(RoleMappingRuleRepository);
		const stored = await repo.findOne({
			where: { id: response.body.data.id },
			relations: ['projects'],
		});
		expect(stored?.projects.map((p) => p.id)).toContain(teamProject.id);
	});
});

describe('PATCH /role-mapping-rule/:id', () => {
	const validInstancePayload = {
		expression: 'claims.group === "admins"',
		role: 'global:member',
		type: 'instance' as const,
		order: 0,
	};

	it('should return 401 when unauthenticated', async () => {
		await authlessAgent
			.patch('/role-mapping-rule/00000000-0000-4000-8000-000000000001')
			.send({ expression: 'true' })
			.expect(401);
	});

	it('should return 403 when user lacks roleMappingRule:update', async () => {
		const createRes = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);
		const ruleId = createRes.body.data.id as string;

		const response = await memberAgent
			.patch(`/role-mapping-rule/${ruleId}`)
			.send({ expression: 'member-cannot-patch' });

		expect(response.status).toBe(403);
		expect(response.body.message).toBe(RESPONSE_ERROR_MESSAGES.MISSING_SCOPE);
	});

	it('should return 403 when provisioning is not licensed', async () => {
		const createRes = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);
		const ruleId = createRes.body.data.id as string;

		testServer.license.disable('feat:saml');
		testServer.license.disable('feat:oidc');

		const response = await ownerAgent
			.patch(`/role-mapping-rule/${ruleId}`)
			.send({ expression: 'true' });

		expect(response.status).toBe(403);
		expect(response.body).toEqual({ message: 'Provisioning is not licensed' });
	});

	it('should return 400 when body is empty', async () => {
		const createRes = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);
		const ruleId = createRes.body.data.id as string;

		const response = await ownerAgent.patch(`/role-mapping-rule/${ruleId}`).send({});

		expect(response.status).toBe(400);
	});

	it('should return 404 when rule id does not exist', async () => {
		const response = await ownerAgent
			.patch('/role-mapping-rule/0000000000000099')
			.send({ expression: 'true' })
			.expect(404);

		expect(response.body.message).toContain('Could not find');
	});

	it('should update a rule and persist changes', async () => {
		const createRes = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);
		const ruleId = createRes.body.data.id as string;

		const response = await ownerAgent
			.patch(`/role-mapping-rule/${ruleId}`)
			.send({ expression: 'claims.patched === true' })
			.expect(200);

		expect(response.body.data).toMatchObject({
			id: ruleId,
			expression: 'claims.patched === true',
			role: validInstancePayload.role,
			type: 'instance',
			order: 0,
			projectIds: [],
		});

		const repo = Container.get(RoleMappingRuleRepository);
		const stored = await repo.findOne({ where: { id: ruleId } });
		expect(stored?.expression).toBe('claims.patched === true');
	});

	it('should return 409 when patch sets order used by another rule', async () => {
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, order: 0 })
			.expect(200);
		const second = await ownerAgent
			.post('/role-mapping-rule')
			.send({
				...validInstancePayload,
				expression: 'claims.other',
				order: 1,
			})
			.expect(200);

		const response = await ownerAgent
			.patch(`/role-mapping-rule/${second.body.data.id}`)
			.send({ order: 0 });

		expect(response.status).toBe(409);
		expect(response.body.message).toContain('already exists');
	});
});
