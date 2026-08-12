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

	it('should shift existing rules down when a new rule is created at an occupied order', async () => {
		const first = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);

		const second = await ownerAgent
			.post('/role-mapping-rule')
			.send({
				...validInstancePayload,
				expression: 'claims.other === true',
				order: 0,
			})
			.expect(200);

		expect(second.body.data.order).toBe(0);

		const repo = Container.get(RoleMappingRuleRepository);
		const all = await repo.find({ where: { type: 'instance' }, order: { order: 'ASC' } });
		expect(all.map((r) => r.id)).toEqual([second.body.data.id, first.body.data.id]);
		expect(all.map((r) => r.order)).toEqual([0, 1]);
	});

	it('should insert at position 0 and shift all existing rules down', async () => {
		const first = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);
		const second = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.b', order: 1 })
			.expect(200);

		const inserted = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.new-head', order: 0 })
			.expect(200);

		expect(inserted.body.data.order).toBe(0);

		const list = await ownerAgent.get('/role-mapping-rule').expect(200);
		expect(list.body.data.items.map((r: { id: string }) => r.id)).toEqual([
			inserted.body.data.id,
			first.body.data.id,
			second.body.data.id,
		]);
		expect(list.body.data.items.map((r: { order: number }) => r.order)).toEqual([0, 1, 2]);
	});

	it('should append when order is omitted', async () => {
		await ownerAgent.post('/role-mapping-rule').send(validInstancePayload).expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.b', order: 1 })
			.expect(200);

		const { role, type } = validInstancePayload;
		const appended = await ownerAgent
			.post('/role-mapping-rule')
			.send({ expression: 'claims.appended', role, type })
			.expect(200);

		expect(appended.body.data.order).toBe(2);
	});

	it('should clamp order to list length when supplied value is too high', async () => {
		await ownerAgent.post('/role-mapping-rule').send(validInstancePayload).expect(200);

		const tooHigh = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.b', order: 999 })
			.expect(200);

		expect(tooHigh.body.data.order).toBe(1);
	});

	it('should insert at a middle position and shift subsequent rules down', async () => {
		const first = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.a', order: 0 })
			.expect(200);
		const second = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.b', order: 1 })
			.expect(200);
		const third = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.c', order: 2 })
			.expect(200);

		const inserted = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.middle', order: 1 })
			.expect(200);

		expect(inserted.body.data.order).toBe(1);

		const list = await ownerAgent.get('/role-mapping-rule').expect(200);
		expect(list.body.data.items.map((r: { id: string }) => r.id)).toEqual([
			first.body.data.id,
			inserted.body.data.id,
			second.body.data.id,
			third.body.data.id,
		]);
		expect(list.body.data.items.map((r: { order: number }) => r.order)).toEqual([0, 1, 2, 3]);
	});

	it('should allow instance and project rules to share the same order value', async () => {
		const teamProject = await createTeamProject(undefined, owner);

		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, order: 0 })
			.expect(200);

		const projectRule = await ownerAgent
			.post('/role-mapping-rule')
			.send({
				expression: 'claims.project',
				role: 'project:editor',
				type: 'project',
				order: 0,
				projectIds: [teamProject.id],
			})
			.expect(200);

		expect(projectRule.body.data.order).toBe(0);
		expect(projectRule.body.data.type).toBe('project');
	});

	it('should normalize order when created with an abnormally high order value', async () => {
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, order: 0 })
			.expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.b', order: 1 })
			.expect(200);

		const response = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.c', order: 100 })
			.expect(200);

		expect(response.body.data.order).toBe(2);

		const repo = Container.get(RoleMappingRuleRepository);
		const all = await repo.find({ where: { type: 'instance' }, order: { order: 'ASC' } });
		expect(all.map((r) => r.order)).toEqual([0, 1, 2]);
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
			order: 0,
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

describe('GET /role-mapping-rule', () => {
	it('should return 401 when unauthenticated', async () => {
		await authlessAgent.get('/role-mapping-rule').expect(401);
	});

	it('should return 403 when user lacks roleMappingRule:list', async () => {
		const response = await memberAgent.get('/role-mapping-rule');

		expect(response.status).toBe(403);
		expect(response.body.message).toBe(RESPONSE_ERROR_MESSAGES.MISSING_SCOPE);
	});

	it('should return 403 when provisioning is not licensed', async () => {
		testServer.license.disable('feat:saml');
		testServer.license.disable('feat:oidc');

		const response = await ownerAgent.get('/role-mapping-rule');

		expect(response.status).toBe(403);
		expect(response.body).toEqual({ message: 'Provisioning is not licensed' });
	});

	it('should return 400 when sortBy is invalid', async () => {
		const response = await ownerAgent.get('/role-mapping-rule').query({ sortBy: 'expression:asc' });

		expect(response.status).toBe(400);
	});

	it('should return an empty list when there are no rules', async () => {
		const response = await ownerAgent.get('/role-mapping-rule').expect(200);

		expect(response.body.data).toEqual({ count: 0, items: [] });
	});

	it('should return rules ordered by order ascending by default', async () => {
		await ownerAgent
			.post('/role-mapping-rule')
			.send({
				expression: 'claims.first',
				role: 'global:member',
				type: 'instance',
				order: 0,
			})
			.expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({
				expression: 'claims.second',
				role: 'global:member',
				type: 'instance',
				order: 1,
			})
			.expect(200);

		const response = await ownerAgent.get('/role-mapping-rule').expect(200);

		expect(response.body.data.count).toBe(2);
		expect(response.body.data.items.map((r: { order: number }) => r.order)).toEqual([0, 1]);
		expect(response.body.data.items[0].expression).toBe('claims.first');
	});

	it('should filter by type', async () => {
		const teamProject = await createTeamProject(undefined, owner);

		await ownerAgent
			.post('/role-mapping-rule')
			.send({
				expression: 'claims.instance',
				role: 'global:member',
				type: 'instance',
				order: 0,
			})
			.expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({
				expression: 'claims.project',
				role: 'project:editor',
				type: 'project',
				order: 0,
				projectIds: [teamProject.id],
			})
			.expect(200);

		const response = await ownerAgent
			.get('/role-mapping-rule')
			.query({ type: 'project' })
			.expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.items[0].type).toBe('project');
	});

	it('should paginate with skip and take', async () => {
		await ownerAgent
			.post('/role-mapping-rule')
			.send({
				expression: 'claims.a',
				role: 'global:member',
				type: 'instance',
				order: 0,
			})
			.expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({
				expression: 'claims.b',
				role: 'global:member',
				type: 'instance',
				order: 1,
			})
			.expect(200);

		const page = await ownerAgent
			.get('/role-mapping-rule')
			.query({ skip: '1', take: '1' })
			.expect(200);

		expect(page.body.data.count).toBe(2);
		expect(page.body.data.items).toHaveLength(1);
		expect(page.body.data.items[0].order).toBe(1);
	});

	it('should order by sortBy when provided', async () => {
		await ownerAgent
			.post('/role-mapping-rule')
			.send({
				expression: 'claims.low',
				role: 'global:member',
				type: 'instance',
				order: 0,
			})
			.expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({
				expression: 'claims.high',
				role: 'global:member',
				type: 'instance',
				order: 1,
			})
			.expect(200);

		const response = await ownerAgent
			.get('/role-mapping-rule')
			.query({ sortBy: 'order:desc' })
			.expect(200);

		expect(response.body.data.items.map((r: { order: number }) => r.order)).toEqual([1, 0]);
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

	it('should normalize order when patched to an abnormally high order value', async () => {
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, order: 0 })
			.expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.b', order: 1 })
			.expect(200);
		const third = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.c', order: 2 })
			.expect(200);

		const response = await ownerAgent
			.patch(`/role-mapping-rule/${third.body.data.id}`)
			.send({ order: 100 })
			.expect(200);

		expect(response.body.data.order).toBe(2);

		const repo = Container.get(RoleMappingRuleRepository);
		const all = await repo.find({ where: { type: 'instance' }, order: { order: 'ASC' } });
		expect(all.map((r) => r.order)).toEqual([0, 1, 2]);
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

describe('POST /role-mapping-rule/:id/move', () => {
	const validInstancePayload = {
		expression: 'claims.group === "admins"',
		role: 'global:member',
		type: 'instance' as const,
		order: 0,
	};

	it('should return 401 when unauthenticated', async () => {
		await authlessAgent
			.post('/role-mapping-rule/00000000-0000-4000-8000-000000000001/move')
			.send({ targetIndex: 0 })
			.expect(401);
	});

	it('should return 403 when user lacks roleMappingRule:update', async () => {
		const createRes = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);
		const ruleId = createRes.body.data.id as string;

		const response = await memberAgent
			.post(`/role-mapping-rule/${ruleId}/move`)
			.send({ targetIndex: 0 });

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
			.post(`/role-mapping-rule/${ruleId}/move`)
			.send({ targetIndex: 0 });

		expect(response.status).toBe(403);
		expect(response.body).toEqual({ message: 'Provisioning is not licensed' });
	});

	it('should return 400 when body is invalid (missing targetIndex)', async () => {
		const createRes = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);
		const ruleId = createRes.body.data.id as string;

		const response = await ownerAgent.post(`/role-mapping-rule/${ruleId}/move`).send({});

		expect(response.status).toBe(400);
	});

	it('should return 400 when targetIndex is negative', async () => {
		const createRes = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);
		const ruleId = createRes.body.data.id as string;

		const response = await ownerAgent
			.post(`/role-mapping-rule/${ruleId}/move`)
			.send({ targetIndex: -1 });

		expect(response.status).toBe(400);
	});

	it('should return 404 when rule id does not exist', async () => {
		const response = await ownerAgent
			.post('/role-mapping-rule/0000000000000099/move')
			.send({ targetIndex: 0 })
			.expect(404);

		expect(response.body.message).toContain('Could not find');
	});

	it('should move first rule to last and return correct order', async () => {
		const first = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, order: 0 })
			.expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.b', order: 1 })
			.expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.c', order: 2 })
			.expect(200);

		const response = await ownerAgent
			.post(`/role-mapping-rule/${first.body.data.id}/move`)
			.send({ targetIndex: 2 })
			.expect(200);

		expect(response.body.data.order).toBe(2);

		const list = await ownerAgent.get('/role-mapping-rule').expect(200);
		expect(list.body.data.items.map((r: { order: number }) => r.order)).toEqual([0, 1, 2]);
		expect(list.body.data.items[2].expression).toBe(validInstancePayload.expression);
	});

	it('should move last rule to first position', async () => {
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, order: 0 })
			.expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.b', order: 1 })
			.expect(200);
		const third = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.c', order: 2 })
			.expect(200);

		const response = await ownerAgent
			.post(`/role-mapping-rule/${third.body.data.id}/move`)
			.send({ targetIndex: 0 })
			.expect(200);

		expect(response.body.data.order).toBe(0);

		const list = await ownerAgent.get('/role-mapping-rule').expect(200);
		expect(list.body.data.items.map((r: { order: number }) => r.order)).toEqual([0, 1, 2]);
		expect(list.body.data.items[0].expression).toBe('claims.c');
	});

	it('should clamp targetIndex when it exceeds list length', async () => {
		const first = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, order: 0 })
			.expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.b', order: 1 })
			.expect(200);

		const response = await ownerAgent
			.post(`/role-mapping-rule/${first.body.data.id}/move`)
			.send({ targetIndex: 999 })
			.expect(200);

		expect(response.body.data.order).toBe(1);

		const list = await ownerAgent.get('/role-mapping-rule').expect(200);
		expect(list.body.data.items.map((r: { order: number }) => r.order)).toEqual([0, 1]);
		expect(list.body.data.items[1].expression).toBe(validInstancePayload.expression);
	});
});

describe('DELETE /role-mapping-rule/:id', () => {
	const validInstancePayload = {
		expression: 'claims.group === "admins"',
		role: 'global:member',
		type: 'instance' as const,
		order: 0,
	};

	it('should return 401 when unauthenticated', async () => {
		await authlessAgent
			.delete('/role-mapping-rule/00000000-0000-4000-8000-000000000001')
			.expect(401);
	});

	it('should return 403 when user lacks roleMappingRule:delete', async () => {
		const createRes = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);
		const ruleId = createRes.body.data.id as string;

		const response = await memberAgent.delete(`/role-mapping-rule/${ruleId}`);

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

		const response = await ownerAgent.delete(`/role-mapping-rule/${ruleId}`);

		expect(response.status).toBe(403);
		expect(response.body).toEqual({ message: 'Provisioning is not licensed' });
	});

	it('should return 404 when rule id does not exist', async () => {
		await ownerAgent.delete('/role-mapping-rule/0000000000000099').expect(404);
	});

	it('should compact remaining rules after deleting a rule from the middle', async () => {
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, order: 0 })
			.expect(200);
		const second = await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.b', order: 1 })
			.expect(200);
		await ownerAgent
			.post('/role-mapping-rule')
			.send({ ...validInstancePayload, expression: 'claims.c', order: 2 })
			.expect(200);

		await ownerAgent.delete(`/role-mapping-rule/${second.body.data.id}`).expect(200);

		const repo = Container.get(RoleMappingRuleRepository);
		const remaining = await repo.find({ where: { type: 'instance' }, order: { order: 'ASC' } });
		expect(remaining).toHaveLength(2);
		expect(remaining.map((r) => r.order)).toEqual([0, 1]);
	});

	it('should delete a rule and remove it from the database', async () => {
		const createRes = await ownerAgent
			.post('/role-mapping-rule')
			.send(validInstancePayload)
			.expect(200);
		const ruleId = createRes.body.data.id as string;

		const response = await ownerAgent.delete(`/role-mapping-rule/${ruleId}`).expect(200);

		expect(response.body.data).toEqual({ success: true });

		const repo = Container.get(RoleMappingRuleRepository);
		const stored = await repo.findOne({ where: { id: ruleId } });
		expect(stored).toBeNull();
	});
});
