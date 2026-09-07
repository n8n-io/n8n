import { BLOCK_ACCESS_ASSIGNMENT } from '@n8n/api-types';
import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { PROVISIONING_PREFERENCES_DB_KEY } from '@/modules/provisioning.ee/constants';
import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';

import { createMember, createOwner } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['provisioning'],
	enabledFeatures: ['feat:saml'],
});

let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;

beforeAll(async () => {
	ownerAgent = testServer.authAgentFor(await createOwner());
	memberAgent = testServer.authAgentFor(await createMember());
});

afterEach(async () => {
	await Container.get(SettingsRepository).delete({ key: PROVISIONING_PREFERENCES_DB_KEY });
	await Container.get(ProvisioningService).handleReloadSsoProvisioningConfiguration();
});

describe('PATCH /sso/provisioning/config defaultInstanceRole', () => {
	it('should return 403 when user lacks provisioning:manage', async () => {
		await memberAgent
			.patch('/sso/provisioning/config')
			.send({ defaultInstanceRole: BLOCK_ACCESS_ASSIGNMENT })
			.expect(403);
	});

	it('should persist block access and return it on subsequent reads', async () => {
		const patchResponse = await ownerAgent
			.patch('/sso/provisioning/config')
			.send({ defaultInstanceRole: BLOCK_ACCESS_ASSIGNMENT })
			.expect(200);
		expect(patchResponse.body.data.defaultInstanceRole).toBe(BLOCK_ACCESS_ASSIGNMENT);

		const getResponse = await ownerAgent.get('/sso/provisioning/config').expect(200);
		expect(getResponse.body.data.defaultInstanceRole).toBe(BLOCK_ACCESS_ASSIGNMENT);

		// Round-trips through the persisted settings row, not just the in-memory cache
		const stored = await Container.get(SettingsRepository).findByKey(
			PROVISIONING_PREFERENCES_DB_KEY,
		);
		expect(JSON.parse(stored!.value).defaultInstanceRole).toBe(BLOCK_ACCESS_ASSIGNMENT);
	});

	it('should persist an assignable global role', async () => {
		const response = await ownerAgent
			.patch('/sso/provisioning/config')
			.send({ defaultInstanceRole: 'global:admin' })
			.expect(200);
		expect(response.body.data.defaultInstanceRole).toBe('global:admin');
	});

	it('should reject the owner role', async () => {
		await ownerAgent
			.patch('/sso/provisioning/config')
			.send({ defaultInstanceRole: 'global:owner' })
			.expect(400);
	});

	it('should reject a role that does not exist', async () => {
		await ownerAgent
			.patch('/sso/provisioning/config')
			.send({ defaultInstanceRole: 'global:does-not-exist' })
			.expect(400);
	});

	it('should reject a non-global role', async () => {
		await ownerAgent
			.patch('/sso/provisioning/config')
			.send({ defaultInstanceRole: 'project:editor' })
			.expect(400);
	});

	it('should clear the field when patched with null', async () => {
		await ownerAgent
			.patch('/sso/provisioning/config')
			.send({ defaultInstanceRole: BLOCK_ACCESS_ASSIGNMENT })
			.expect(200);

		const response = await ownerAgent
			.patch('/sso/provisioning/config')
			.send({ defaultInstanceRole: null })
			.expect(200);
		expect(response.body.data.defaultInstanceRole).toBeUndefined();

		const getResponse = await ownerAgent.get('/sso/provisioning/config').expect(200);
		expect(getResponse.body.data.defaultInstanceRole).toBeUndefined();
	});
});
