process.env.N8N_ENV_FEAT_SERVICE_ACCOUNTS = 'true';

import {
	createWorkflow,
	mockInstance,
	shareWorkflowWithProjects,
	testDb,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { GLOBAL_MEMBER_ROLE, ProjectRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { AuthService } from '@/auth/auth.service';
import { AUTH_COOKIE_NAME } from '@/constants';
import { JwtService } from '@/services/jwt.service';
import { createMember, createOwner, createUser } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: [
		'service-accounts',
		'users',
		'auth',
		'apiKeys',
		'me',
		'mfa',
		'invitations',
		'owner',
		'workflows',
	],
	modules: ['service-accounts'],
});

let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;

const createServiceAccount = async (name = 'Deploy Bot', role = 'global:member') => {
	const response = await ownerAgent.post('/service-accounts').send({ name, role }).expect(201);
	return response.body.data as { id: string; name: string; email: string; role: string };
};

beforeEach(async () => {
	// `/api-keys` is behind `isApiEnabledMiddleware`, which 404s when the public
	// API is disabled — the default in tests.
	mockInstance(GlobalConfig, { publicApi: { disabled: false } });

	await testDb.truncate([
		'ApiKey',
		'SharedWorkflow',
		'WorkflowEntity',
		'ProjectRelation',
		'Project',
		'User',
	]);
	ownerAgent = testServer.authAgentFor(await createOwner());
	memberAgent = testServer.authAgentFor(await createMember());
});

describe('POST /service-accounts', () => {
	test('creates a service account with a synthesized .invalid email and a personal project', async () => {
		const serviceAccount = await createServiceAccount();

		expect(serviceAccount.name).toBe('Deploy Bot');
		expect(serviceAccount.email).toMatch(/^deploy-bot-[0-9a-f]{8}@service-accounts\.invalid$/);
		expect(serviceAccount.role).toBe('global:member');

		const stored = await Container.get(UserRepository).findOneByOrFail({ id: serviceAccount.id });
		expect(stored.type).toBe('serviceAccount');
		expect(stored.password).toBeNull();
		expect(stored.isPending).toBe(false);

		const personalProject = await Container.get(ProjectRepository).getPersonalProjectForUser(
			serviceAccount.id,
		);
		expect(personalProject).not.toBeNull();
	});

	test('rejects a member without serviceAccount:create', async () => {
		await memberAgent.post('/service-accounts').send({ name: 'Nope' }).expect(403);
	});

	test.each(['global:owner', 'global:chatUser'])('rejects the %s role', async (role) => {
		await ownerAgent.post('/service-accounts').send({ name: 'Nope', role }).expect(400);
	});
});

describe('GET /service-accounts', () => {
	test('lists only service accounts', async () => {
		const serviceAccount = await createServiceAccount();

		const response = await ownerAgent.get('/service-accounts').expect(200);

		expect(response.body.data.count).toBe(1);
		expect(response.body.data.items).toHaveLength(1);
		expect(response.body.data.items[0].id).toBe(serviceAccount.id);
	});

	test('rejects a member without serviceAccount:list', async () => {
		await memberAgent.get('/service-accounts').expect(403);
	});
});

describe('GET /users', () => {
	test('excludes service accounts by default', async () => {
		const serviceAccount = await createServiceAccount();

		const response = await ownerAgent.get('/users').expect(200);

		expect(response.body.data.items.map((u: { id: string }) => u.id)).not.toContain(
			serviceAccount.id,
		);
	});

	test('includes them when explicitly filtered', async () => {
		const serviceAccount = await createServiceAccount();

		const response = await ownerAgent
			.get('/users')
			.query({ filter: JSON.stringify({ type: 'serviceAccount' }) })
			.expect(200);

		expect(response.body.data.items.map((u: { id: string }) => u.id)).toEqual([serviceAccount.id]);
	});
});

describe('PATCH & DELETE /service-accounts/:id', () => {
	test('renames a service account', async () => {
		const serviceAccount = await createServiceAccount();

		const response = await ownerAgent
			.patch(`/service-accounts/${serviceAccount.id}`)
			.send({ name: 'Renamed Bot' })
			.expect(200);

		expect(response.body.data.name).toBe('Renamed Bot');
	});

	test('disables a service account', async () => {
		const serviceAccount = await createServiceAccount();

		const response = await ownerAgent
			.patch(`/service-accounts/${serviceAccount.id}`)
			.send({ disabled: true })
			.expect(200);

		expect(response.body.data.disabled).toBe(true);
	});

	test('changes the role', async () => {
		const serviceAccount = await createServiceAccount();

		await ownerAgent
			.patch(`/service-accounts/${serviceAccount.id}/role`)
			.send({ newRoleName: 'global:admin' })
			.expect(200);

		const stored = await Container.get(UserRepository).findOneOrFail({
			where: { id: serviceAccount.id },
			relations: ['role'],
		});
		expect(stored.role.slug).toBe('global:admin');
	});

	test('deletes a service account and its personal project', async () => {
		const serviceAccount = await createServiceAccount();

		await ownerAgent.delete(`/service-accounts/${serviceAccount.id}`).expect(200);

		expect(await Container.get(UserRepository).findOneBy({ id: serviceAccount.id })).toBeNull();
		expect(
			await Container.get(ProjectRepository).getPersonalProjectForUser(serviceAccount.id),
		).toBeNull();
	});

	test('404s for a human user id, keeping the id namespaces separate', async () => {
		const human = await createUser({ role: GLOBAL_MEMBER_ROLE });

		await ownerAgent.get(`/service-accounts/${human.id}`).expect(404);
		await ownerAgent.patch(`/service-accounts/${human.id}`).send({ name: 'x' }).expect(404);
		await ownerAgent.delete(`/service-accounts/${human.id}`).expect(404);
	});
});

describe('POST & DELETE /impersonation', () => {
	test('round trip: enter, act as the SA, exit back to the operator', async () => {
		const serviceAccount = await createServiceAccount();

		const start = await ownerAgent
			.post('/impersonation')
			.send({ serviceAccountId: serviceAccount.id })
			.expect(200);

		expect(start.body.data).toMatchObject({
			id: serviceAccount.id,
			impersonating: true,
			actor: { email: expect.stringContaining('@') },
		});

		// The agent's cookie jar now holds the impersonation cookie, so subsequent
		// requests are made as the service account.
		const asServiceAccount = await ownerAgent.get('/login').expect(200);
		expect(asServiceAccount.body.data).toMatchObject({
			id: serviceAccount.id,
			impersonating: true,
		});
		// Survives a refresh — the only way the operator can find the exit.
		expect(asServiceAccount.body.data.actor.id).toBe(start.body.data.actor.id);

		const stop = await ownerAgent.delete('/impersonation').expect(200);
		expect(stop.body.data).toMatchObject({ id: start.body.data.actor.id, impersonating: false });

		const asHuman = await ownerAgent.get('/login').expect(200);
		expect(asHuman.body.data.id).toBe(start.body.data.actor.id);
		expect(asHuman.body.data.impersonating).toBeUndefined();
	});

	test('retires the operator cookie so it cannot be replayed', async () => {
		const owner = await createOwner();
		const serviceAccount = await createServiceAccount();

		// Hand both agents the same token, standing in for a cookie that leaked before
		// impersonation started.
		const token = Container.get(AuthService).issueJWT(owner, false, 'test-browser-id');
		const agent = testServer.authAgentFor(owner);
		const replayAgent = testServer.authAgentFor(owner);
		agent.jar.setCookie(`${AUTH_COOKIE_NAME}=${token}`);
		replayAgent.jar.setCookie(`${AUTH_COOKIE_NAME}=${token}`);

		await agent.post('/impersonation').send({ serviceAccountId: serviceAccount.id }).expect(200);

		// The pre-impersonation token was invalidated, so the replay fails.
		await replayAgent.get('/login').expect(401);
	});

	test('creates API keys owned by the service account, outliving the session', async () => {
		const serviceAccount = await createServiceAccount();

		await ownerAgent
			.post('/impersonation')
			.send({ serviceAccountId: serviceAccount.id })
			.expect(200);

		const created = await ownerAgent
			.post('/api-keys')
			.send({ label: 'deploy-key', expiresAt: null, scopes: ['workflow:list'] })
			.expect(200);

		expect(created.body.data.label).toBe('deploy-key');

		await ownerAgent.delete('/impersonation').expect(200);

		// The key belongs to the SA and survives the exit — this is the feature.
		const keys = await Container.get(UserRepository).findOneOrFail({
			where: { id: serviceAccount.id },
			relations: ['apiKeys'],
		});
		expect(keys.apiKeys.map(({ label }) => label)).toEqual(['deploy-key']);
	});

	test('API key labels are unique per user, not globally', async () => {
		const serviceAccount = await createServiceAccount();

		// The operator takes the label first...
		await ownerAgent
			.post('/api-keys')
			.send({ label: 'shared-label', expiresAt: null, scopes: ['workflow:list'] })
			.expect(200);

		await ownerAgent
			.post('/impersonation')
			.send({ serviceAccountId: serviceAccount.id })
			.expect(200);

		// ...and the service account can still use it. People assume @Unique is global.
		await ownerAgent
			.post('/api-keys')
			.send({ label: 'shared-label', expiresAt: null, scopes: ['workflow:list'] })
			.expect(200);
	});

	describe('authorization matrix', () => {
		test('403s a member without serviceAccount:impersonate', async () => {
			const serviceAccount = await createServiceAccount();

			await memberAgent
				.post('/impersonation')
				.send({ serviceAccountId: serviceAccount.id })
				.expect(403);
		});

		test('404s a non-service-account target, so it is not an existence oracle', async () => {
			const human = await createUser({ role: GLOBAL_MEMBER_ROLE });

			await ownerAgent.post('/impersonation').send({ serviceAccountId: human.id }).expect(404);
			await ownerAgent.post('/impersonation').send({ serviceAccountId: 'no-such-id' }).expect(404);
		});

		test('403s a disabled service account', async () => {
			const serviceAccount = await createServiceAccount();
			await ownerAgent
				.patch(`/service-accounts/${serviceAccount.id}`)
				.send({ disabled: true })
				.expect(200);

			await ownerAgent
				.post('/impersonation')
				.send({ serviceAccountId: serviceAccount.id })
				.expect(403);
		});

		test('400s a nested impersonation attempt', async () => {
			const first = await createServiceAccount('First Bot');
			const second = await createServiceAccount('Second Bot');

			await ownerAgent.post('/impersonation').send({ serviceAccountId: first.id }).expect(200);

			// req.user is now the SA, which holds neither the scope nor a human type.
			await ownerAgent.post('/impersonation').send({ serviceAccountId: second.id }).expect(403);
		});

		test('403s an impersonated session from the service-accounts surface', async () => {
			const serviceAccount = await createServiceAccount();

			await ownerAgent
				.post('/impersonation')
				.send({ serviceAccountId: serviceAccount.id })
				.expect(200);

			await ownerAgent.get('/service-accounts').expect(403);
		});

		test('400s exit when not impersonating', async () => {
			await ownerAgent.delete('/impersonation').expect(400);
		});

		test('401s the next request after the service account is disabled mid-session', async () => {
			const serviceAccount = await createServiceAccount();
			const adminAgent = testServer.authAgentFor(await createOwner());

			await ownerAgent
				.post('/impersonation')
				.send({ serviceAccountId: serviceAccount.id })
				.expect(200);

			await adminAgent
				.patch(`/service-accounts/${serviceAccount.id}`)
				.send({ disabled: true })
				.expect(200);

			await ownerAgent.get('/login').expect(401);
		});
	});

	describe('human-only flows reject the service-account principal', () => {
		test('PATCH /me is forbidden while impersonating', async () => {
			const serviceAccount = await createServiceAccount();

			await ownerAgent
				.post('/impersonation')
				.send({ serviceAccountId: serviceAccount.id })
				.expect(200);

			await ownerAgent.patch('/me').send({ email: 'stolen@example.com' }).expect(403);
		});

		test('MFA enrolment is forbidden while impersonating', async () => {
			const serviceAccount = await createServiceAccount();

			await ownerAgent
				.post('/impersonation')
				.send({ serviceAccountId: serviceAccount.id })
				.expect(200);

			await ownerAgent.get('/mfa/qr').expect(403);
		});

		test('the personalization survey is forbidden and leaves the answers unset', async () => {
			const serviceAccount = await createServiceAccount();

			await ownerAgent
				.post('/impersonation')
				.send({ serviceAccountId: serviceAccount.id })
				.expect(200);

			await ownerAgent
				.post('/me/survey')
				.send({
					version: 'v4',
					personalization_survey_submitted_at: new Date().toISOString(),
					personalization_survey_n8n_version: '1.0.0',
				})
				.expect(403);

			// `personalizationAnswers` therefore stays null for the whole session, which is
			// why the frontend must not gate the survey modal on that field alone — see
			// `showPersonalizationSurvey` in `@n8n/stores`.
			const stored = await Container.get(UserRepository).findOneByOrFail({
				id: serviceAccount.id,
			});
			expect(stored.personalizationAnswers).toBeNull();
		});
	});

	describe('resources reachable while impersonating', () => {
		test('reads a workflow shared with the service account', async () => {
			const serviceAccount = await createServiceAccount();
			const serviceAccountProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(serviceAccount.id);

			const owner = await Container.get(UserRepository).findOneByOrFail({ type: 'user' });
			const workflow = await createWorkflow({ name: 'Shared With Bot' }, owner);
			await shareWorkflowWithProjects(workflow, [
				{ project: serviceAccountProject, role: 'workflow:editor' },
			]);

			await ownerAgent
				.post('/impersonation')
				.send({ serviceAccountId: serviceAccount.id })
				.expect(200);

			const response = await ownerAgent.get(`/workflows/${workflow.id}`).expect(200);

			expect(response.body.data.id).toBe(workflow.id);
			expect(response.body.data.scopes).toContain('workflow:read');
		});

		test('lists a workflow shared with the service account', async () => {
			const serviceAccount = await createServiceAccount();
			const serviceAccountProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(serviceAccount.id);

			const owner = await Container.get(UserRepository).findOneByOrFail({ type: 'user' });
			const workflow = await createWorkflow({ name: 'Shared With Bot' }, owner);
			await shareWorkflowWithProjects(workflow, [
				{ project: serviceAccountProject, role: 'workflow:editor' },
			]);

			await ownerAgent
				.post('/impersonation')
				.send({ serviceAccountId: serviceAccount.id })
				.expect(200);

			const response = await ownerAgent.get('/workflows').expect(200);

			expect(response.body.data.map(({ id }: { id: string }) => id)).toEqual([workflow.id]);
		});
	});
});

describe('human-only flows reject a service-account id', () => {
	/** The token `POST /users/:id/invite-link` would have produced. */
	const signInviteToken = (inviterId: string, inviteeId: string): string =>
		Container.get(JwtService).sign({ inviterId, inviteeId });

	test('POST /:id/invite-link 404s for a service account', async () => {
		const serviceAccount = await createServiceAccount();

		await ownerAgent.post(`/users/${serviceAccount.id}/invite-link`).expect(404);
	});

	test('GET /resolve-signup-token rejects a token naming a service account', async () => {
		const serviceAccount = await createServiceAccount();
		const owner = await Container.get(UserRepository).findOneByOrFail({ type: 'user' });

		const token = signInviteToken(owner.id, serviceAccount.id);

		await testServer.authlessAgent.get('/resolve-signup-token').query({ token }).expect(400);
	});

	test('POST /invitations/accept rejects a token naming a service account', async () => {
		const serviceAccount = await createServiceAccount();
		const owner = await Container.get(UserRepository).findOneByOrFail({ type: 'user' });
		const token = signInviteToken(owner.id, serviceAccount.id);

		// Without the guard this writes a name and a bcrypt password onto the SA and
		// issues it a cookie — converting it into a loginable human.
		await testServer.authlessAgent
			.post('/invitations/accept')
			.send({
				token,
				firstName: 'Stolen',
				lastName: 'Identity',
				password: 'Passw0rd!',
			})
			.expect(403);

		const stored = await Container.get(UserRepository).findOneByOrFail({ id: serviceAccount.id });
		expect(stored.password).toBeNull();
		expect(stored.firstName).toBe('Deploy Bot');
	});

	test('POST /login with a service account email 401s and issues no cookie', async () => {
		const serviceAccount = await createServiceAccount();

		const response = await testServer.authlessAgent
			.post('/login')
			.send({ emailOrLdapLoginId: serviceAccount.email, password: 'Passw0rd!' })
			.expect(401);

		expect(response.headers['set-cookie']).toBeUndefined();
	});
});
