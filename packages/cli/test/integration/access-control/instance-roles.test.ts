import { mockInstance, randomCredentialPayload, testDb } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { GLOBAL_MEMBER_ROLE } from '@n8n/db';
import type { User } from '@n8n/db';

import { InstanceRedactionEnforcementService } from '@/modules/redaction/instance-redaction-enforcement.service';
import { SecuritySettingsService } from '@/services/security-settings.service';

import { createGlobalRoleUser } from './shared-setup';
import { saveCredential } from '../shared/db/credentials';
import { cleanupRolesAndScopes, createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createOwner } from '../shared/db/users';
import { initCredentialsTypes, setupTestServer } from '../shared/utils';

/**
 * Authorization safety net for *instance* (global) custom roles.
 *
 * The project-level matrix in this directory proves scope-driven access for
 * `roleType: 'project'` roles. These tests do the same for `roleType: 'global'`
 * roles, guarding that instance-level gates flow through scope checks
 * (`@GlobalScope` / `hasGlobalScope`) rather than literal role-slug equality.
 * Each behavior gets a positive (has scope -> allowed) and a negative
 * (lacks scope -> 403 / restricted) case, both driven by a custom global role.
 */
describe('Instance (global) custom role authorization', () => {
	// Mocked so the security-settings handler returns deterministically once the
	// scope gate is passed; authorization itself runs through the real middleware.
	mockInstance(SecuritySettingsService);
	mockInstance(InstanceRedactionEnforcementService);
	mockInstance(InstanceSettingsLoaderConfig, { securityPolicyManagedByEnv: false });

	const testServer = setupTestServer({
		endpointGroups: ['credentials', 'role', 'security-settings'],
		enabledFeatures: ['feat:sharing', 'feat:customRoles', 'feat:personalSpacePolicy'],
	});

	beforeAll(async () => {
		await initCredentialsTypes();
	});

	afterEach(async () => {
		// Users hold FK refs to the custom roles, so truncate them before the role
		// cleanup (which deletes by FK-respecting `repository.delete`). Runs in
		// `afterEach` because the DI `Connection` is only live during test hooks.
		await testDb.truncate(['SharedCredentials', 'CredentialsEntity', 'ProjectRelation', 'User']);
		await cleanupRolesAndScopes();
	});

	describe('credential listing — all vs own (credential:list)', () => {
		let owner: User;

		beforeEach(async () => {
			await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
			owner = await createOwner();
		});

		test('a custom global role with credential:list sees every credential', async () => {
			const { user, agent } = await createGlobalRoleUser(
				testServer,
				['credential:read', 'credential:list'],
				'Global Credential Lister',
			);

			const ownerCredential = await saveCredential(randomCredentialPayload(), {
				user: owner,
				role: 'credential:owner',
			});
			const ownCredential = await saveCredential(randomCredentialPayload(), {
				user,
				role: 'credential:owner',
			});

			const response = await agent.get('/credentials').expect(200);
			const ids = response.body.data.map((c: { id: string }) => c.id);

			expect(ids).toContain(ownerCredential.id);
			expect(ids).toContain(ownCredential.id);
		});

		test('a custom global role without credential:list sees only its own credentials', async () => {
			// A role lacking any global credential scope must not see other users'
			// credentials — only the ones it owns.
			const { user, agent } = await createGlobalRoleUser(
				testServer,
				['workflow:list'],
				'Global Non-Credential Role',
			);

			const ownerCredential = await saveCredential(randomCredentialPayload(), {
				user: owner,
				role: 'credential:owner',
			});
			const ownCredential = await saveCredential(randomCredentialPayload(), {
				user,
				role: 'credential:owner',
			});

			const response = await agent.get('/credentials').expect(200);
			const ids = response.body.data.map((c: { id: string }) => c.id);

			expect(ids).toContain(ownCredential.id);
			expect(ids).not.toContain(ownerCredential.id);
		});
	});

	describe('role administration (role:manage / role:read)', () => {
		test('a custom global role with role:manage can create, read assignments for, and delete roles', async () => {
			const { agent } = await createGlobalRoleUser(
				testServer,
				['role:manage'],
				'Global Role Manager',
			);

			const created = await agent
				.post('/roles')
				.send({ displayName: 'Created By Custom', roleType: 'project', scopes: ['workflow:read'] })
				.expect(200);

			await agent.get(`/roles/${GLOBAL_MEMBER_ROLE.slug}/assignments`).expect(200);
			await agent.delete(`/roles/${created.body.data.slug}`).expect(200);
		});

		test('a custom global role without role:manage cannot create, read assignments for, or delete roles', async () => {
			const { agent } = await createGlobalRoleUser(
				testServer,
				['workflow:list'],
				'Global Role Outsider',
			);
			const target = await createCustomRoleWithScopeSlugs(['workflow:read'], {
				roleType: 'project',
				displayName: 'Delete Target',
			});

			await agent
				.post('/roles')
				.send({ displayName: 'Forbidden Role', roleType: 'project', scopes: ['workflow:read'] })
				.expect(403);
			await agent.get(`/roles/${GLOBAL_MEMBER_ROLE.slug}/assignments`).expect(403);
			await agent.delete(`/roles/${target.slug}`).expect(403);
		});

		test('a custom global role with role:read can list a role’s members', async () => {
			const { agent } = await createGlobalRoleUser(testServer, ['role:read'], 'Global Role Reader');

			await agent.get(`/roles/${GLOBAL_MEMBER_ROLE.slug}/members`).expect(200);
		});

		test('a custom global role without role:read cannot list a role’s members', async () => {
			const { agent } = await createGlobalRoleUser(
				testServer,
				['workflow:list'],
				'Global Members Outsider',
			);

			await agent.get(`/roles/${GLOBAL_MEMBER_ROLE.slug}/members`).expect(403);
		});
	});

	describe('security settings (securitySettings:manage)', () => {
		test('a custom global role with securitySettings:manage can read and update security settings', async () => {
			const { agent } = await createGlobalRoleUser(
				testServer,
				['securitySettings:manage'],
				'Global Settings Manager',
			);

			await agent.get('/settings/security').expect(200);
			await agent.post('/settings/security').send({}).expect(200);
		});

		test('a custom global role without securitySettings:manage gets 403', async () => {
			const { agent } = await createGlobalRoleUser(
				testServer,
				['workflow:list'],
				'Global Settings Outsider',
			);

			await agent.get('/settings/security').expect(403);
			await agent.post('/settings/security').send({}).expect(403);
		});
	});
});
