import { testDb } from '@n8n/backend-test-utils';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	PERSONAL_SPACE_PUBLISHING_SETTING,
	PERSONAL_SPACE_SHARING_SETTING,
} from '@n8n/permissions';
import { In } from '@n8n/typeorm';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { CacheService } from '@/services/cache/cache.service';
import { createMemberWithApiKey, createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

// Mirrors the private key in InstanceRedactionEnforcementService so tests can reset stored state.
const REDACTION_SETTING_KEY = 'redaction.enforcement';

describe('Security policy in Public API', () => {
	let owner: User;
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });
	const licenseErrorMessage = new FeatureNotLicensedError('feat:personalSpacePolicy').message;

	const setManagedByEnv = (value: boolean) => {
		Container.get(InstanceSettingsLoaderConfig).securityPolicyManagedByEnv = value;
	};

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
		await Container.get(SettingsRepository).delete({
			key: In([
				PERSONAL_SPACE_PUBLISHING_SETTING.key,
				PERSONAL_SPACE_SHARING_SETTING.key,
				REDACTION_SETTING_KEY,
			]),
		});
		await Container.get(CacheService).delete(REDACTION_SETTING_KEY);
		setManagedByEnv(false);

		owner = await createOwnerWithApiKey();
	});

	afterEach(() => {
		setManagedByEnv(false);
	});

	describe('GET /settings/security-policy', () => {
		it('returns the current policy when licensed', async () => {
			testServer.license.enable('feat:personalSpacePolicy');

			const response = await testServer.publicApiAgentFor(owner).get('/settings/security-policy');

			expect(response.status).toBe(200);
			expect(response.body).toEqual({
				personalSpacePublishing: true,
				personalSpaceSharing: true,
				publishedPersonalWorkflowsCount: 0,
				sharedPersonalWorkflowsCount: 0,
				sharedPersonalCredentialsCount: 0,
				redactionEnforcement: { floor: 'off' },
			});
		});

		it('still allows reads when the policy is env-managed', async () => {
			testServer.license.enable('feat:personalSpacePolicy');
			setManagedByEnv(true);

			const response = await testServer.publicApiAgentFor(owner).get('/settings/security-policy');

			expect(response.status).toBe(200);
			expect(response.body.personalSpacePublishing).toBe(true);
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer.publicApiAgentFor(owner).get('/settings/security-policy');

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('rejects with 403 when the API key lacks the securitySettings:manage scope', async () => {
			testServer.license.enable('feat:personalSpacePolicy');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.get('/settings/security-policy');

			expect(response.status).toBe(403);
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:personalSpacePolicy');

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.get('/settings/security-policy');

			expect(response.status).toBe(401);
		});
	});

	describe('PUT /settings/security-policy', () => {
		it('updates the policy and returns the new values', async () => {
			testServer.license.enable('feat:personalSpacePolicy');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/security-policy')
				.send({ personalSpacePublishing: false, redactionEnforcement: { floor: 'production' } });

			expect(response.status).toBe(200);
			expect(response.body).toMatchObject({
				personalSpacePublishing: false,
				personalSpaceSharing: true,
				redactionEnforcement: { floor: 'production' },
			});

			// The change is persisted and readable.
			const readResponse = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/security-policy');
			expect(readResponse.body).toMatchObject({
				personalSpacePublishing: false,
				redactionEnforcement: { floor: 'production' },
			});
		});

		it('rejects a malformed request body with 400', async () => {
			testServer.license.enable('feat:personalSpacePolicy');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/security-policy')
				.send({ personalSpacePublishing: 'not-a-boolean', redactionEnforcement: 'nope' });

			expect(response.status).toBe(400);
		});

		it('rejects a well-formed body with invalid values with 400', async () => {
			testServer.license.enable('feat:personalSpacePolicy');

			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/security-policy')
				.send({ redactionEnforcement: { floor: 'bogus' } });

			expect(response.status).toBe(400);
			expect(response.body).toHaveProperty('message');
		});

		it('rejects with 401 without a valid API key', async () => {
			testServer.license.enable('feat:personalSpacePolicy');

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.put('/settings/security-policy')
				.send({ personalSpacePublishing: false });

			expect(response.status).toBe(401);
		});

		it('rejects with 403 when not licensed', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/security-policy')
				.send({ personalSpacePublishing: false });

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', licenseErrorMessage);
		});

		it('rejects with 403 when the API key lacks the securitySettings:manage scope', async () => {
			testServer.license.enable('feat:personalSpacePolicy');
			const scopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });

			const response = await testServer
				.publicApiAgentFor(scopedOwner)
				.put('/settings/security-policy')
				.send({ personalSpacePublishing: false });

			expect(response.status).toBe(403);
		});

		it('rejects a write with 409 when the group is managed declaratively, but still allows reads', async () => {
			testServer.license.enable('feat:personalSpacePolicy');
			setManagedByEnv(true);

			const writeResponse = await testServer
				.publicApiAgentFor(owner)
				.put('/settings/security-policy')
				.send({ personalSpacePublishing: false });

			expect(writeResponse.status).toBe(409);

			// The value was not changed.
			const readResponse = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/security-policy');
			expect(readResponse.status).toBe(200);
			expect(readResponse.body.personalSpacePublishing).toBe(true);
		});

		it('is available to a default owner API key (default scopes include the scope)', async () => {
			testServer.license.enable('feat:personalSpacePolicy');
			const member = await createMemberWithApiKey();

			// A member's default key does not include securitySettings:manage.
			const memberResponse = await testServer
				.publicApiAgentFor(member)
				.get('/settings/security-policy');
			expect(memberResponse.status).toBe(403);

			// The owner's default key does.
			const ownerResponse = await testServer
				.publicApiAgentFor(owner)
				.get('/settings/security-policy');
			expect(ownerResponse.status).toBe(200);
		});
	});
});
