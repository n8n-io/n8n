import { BLOCK_ACCESS_ASSIGNMENT } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import { RoleMappingRuleRepository, RoleRepository, SettingsRepository, type User } from '@n8n/db';
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

let owner: User;
let ownerAgent: SuperAgentTest;
let memberAgent: SuperAgentTest;

beforeAll(async () => {
	owner = await createOwner();
	ownerAgent = testServer.authAgentFor(owner);
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

describe('PATCH /sso/provisioning/config events', () => {
	const spyOnEmit = () => vi.spyOn(Container.get(EventService), 'emit');
	let emitSpy: ReturnType<typeof spyOnEmit>;
	const savedEvents = () =>
		emitSpy.mock.calls.filter(([eventName]) => eventName === 'provisioning-settings-updated');

	const createRule = async (type: 'instance' | 'project', order: number) => {
		const roleSlug = type === 'instance' ? 'global:member' : 'project:editor';
		const role = await Container.get(RoleRepository).findBySlug(roleSlug);
		const repo = Container.get(RoleMappingRuleRepository);
		await repo.save(repo.create({ expression: 'true', type, order, role: role!, projects: [] }));
	};

	beforeEach(() => {
		emitSpy = spyOnEmit();
	});

	afterEach(async () => {
		emitSpy.mockRestore();
		await Container.get(RoleMappingRuleRepository).delete({});
	});

	it('should report the save with the rule counts after it', async () => {
		await createRule('instance', 0);
		await createRule('project', 0);
		await createRule('project', 1);

		await ownerAgent
			.patch('/sso/provisioning/config')
			.send({ scopesProvisionInstanceRole: true, scopesProvisionProjectRoles: true })
			.expect(200);

		expect(savedEvents()).toEqual([
			[
				'provisioning-settings-updated',
				{
					user: expect.objectContaining({ id: owner.id }),
					authenticationMethod: 'email',
					assignmentMethod: 'instance_and_project_roles',
					roleMappingMethod: 'idp_rule_mapping',
					instanceRuleCount: 1,
					projectRuleCount: 2,
				},
			],
		]);
	});

	it('should count the project rules that the save deleted as gone', async () => {
		await createRule('project', 0);

		await ownerAgent
			.patch('/sso/provisioning/config')
			.send({ scopesProvisionInstanceRole: true, deleteProjectRules: true })
			.expect(200);

		const [[, payload]] = savedEvents();
		expect(payload).toMatchObject({
			assignmentMethod: 'instance_role',
			instanceRuleCount: 0,
			projectRuleCount: 0,
		});
		expect(await Container.get(RoleMappingRuleRepository).count()).toBe(0);
	});

	it('should not report a rejected save', async () => {
		await ownerAgent
			.patch('/sso/provisioning/config')
			.send({ defaultInstanceRole: 'global:owner' })
			.expect(400);

		expect(savedEvents()).toHaveLength(0);
	});
});
