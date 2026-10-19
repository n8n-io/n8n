import {
	createTeamProject,
	getProjectRoleForUser,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { RoleMappingRuleRepository, RoleRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { CHANGE_ROLE_ERROR_MESSAGES } from '@/services/user.service';
import {
	getCurrentAuthenticationMethod,
	setCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';
import { Telemetry } from '@/telemetry';

import { sampleConfig } from './saml/sample-metadata';
import { createMember, createOwnerWithApiKey, getUserById } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

mockInstance(Telemetry);

const testServer = utils.setupTestServer({
	endpointGroups: ['saml', 'users', 'project', 'publicApi'],
	enabledFeatures: [
		'feat:saml',
		'feat:advancedPermissions',
		'feat:projectRole:admin',
		'feat:projectRole:editor',
		'feat:projectRole:viewer',
	],
	quotas: { 'quota:maxTeamProjects': -1 },
});

const PROJECT_ROLES_MANAGED =
	'Project roles are managed automatically and cannot be changed manually';

let owner: User;
// An instance admin cannot hold a project role, so the global change uses another user.
let globalRoleTarget: User;
let member: User;
let project: Project;
let ownerAgent: SuperAgentTest;
let provisioningService: ProvisioningService;
let savedConfig: Record<string, unknown>;

const toggleSamlLogin = async (loginEnabled: boolean) =>
	await ownerAgent.post('/sso/saml/config/toggle').send({ loginEnabled }).expect(200);

const changeGlobalRole = async () =>
	await ownerAgent
		.patch(`/users/${globalRoleTarget.id}/role`)
		.send({ newRoleName: 'global:admin' });

const changeProjectRole = async () =>
	await ownerAgent
		.patch(`/projects/${project.id}/users/${member.id}`)
		.send({ role: 'project:editor' });

const changeProjectRoleThroughPublicApi = async () =>
	await testServer
		.publicApiAgentFor(owner)
		.patch(`/projects/${project.id}/users/${member.id}`)
		.send({ role: 'project:editor' });

const getRolesManaged = async () =>
	(
		(await ownerAgent.get(`/projects/${project.id}`).expect(200)).body as {
			data: { rolesManaged: boolean };
		}
	).data.rolesManaged;

const expectRolesLocked = async () => {
	const globalRoleResponse = await changeGlobalRole();
	expect(globalRoleResponse.status).toBe(403);
	expect(globalRoleResponse.body.message).toBe(CHANGE_ROLE_ERROR_MESSAGES.INSTANCE_ROLES_MANAGED);

	const projectRoleResponse = await changeProjectRole();
	expect(projectRoleResponse.status).toBe(403);
	expect(projectRoleResponse.body.message).toBe(PROJECT_ROLES_MANAGED);

	const publicApiResponse = await changeProjectRoleThroughPublicApi();
	expect(publicApiResponse.status).toBe(403);
	expect(publicApiResponse.body.message).toBe(PROJECT_ROLES_MANAGED);

	expect(await getRolesManaged()).toBe(true);
	expect((await getUserById(globalRoleTarget.id)).role.slug).toBe('global:member');
	expect(await getProjectRoleForUser(project.id, member.id)).toBe('project:viewer');
};

const expectRolesEditable = async () => {
	expect(await getRolesManaged()).toBe(false);

	expect((await changeGlobalRole()).status).toBe(200);
	expect((await getUserById(globalRoleTarget.id)).role.slug).toBe('global:admin');

	expect((await changeProjectRole()).status).toBe(204);
	expect(await getProjectRoleForUser(project.id, member.id)).toBe('project:editor');

	await ownerAgent
		.patch(`/projects/${project.id}/users/${member.id}`)
		.send({ role: 'project:viewer' })
		.expect(204);
	expect((await changeProjectRoleThroughPublicApi()).status).toBe(204);
	expect(await getProjectRoleForUser(project.id, member.id)).toBe('project:editor');
};

beforeAll(async () => {
	provisioningService = Container.get(ProvisioningService);
	await provisioningService.getConfig();
});

beforeEach(async () => {
	await testDb.truncate(['ProjectRelation', 'Project', 'User']);
	owner = await createOwnerWithApiKey();
	globalRoleTarget = await createMember();
	member = await createMember();
	project = await createTeamProject('Team Project', owner);
	await linkUserToProject(member, project, 'project:viewer');
	ownerAgent = testServer.authAgentFor(owner);

	// @ts-expect-error - provisioningConfig is private
	savedConfig = { ...provisioningService.provisioningConfig };
	// @ts-expect-error - provisioningConfig is private
	provisioningService.provisioningConfig.scopesProvisionInstanceRole = true;
	// @ts-expect-error - provisioningConfig is private
	provisioningService.provisioningConfig.scopesProvisionProjectRoles = true;

	// The toggle needs stored metadata, so save a full SAML config with login on.
	await ownerAgent
		.post('/sso/saml/config')
		.send({ ...sampleConfig, loginEnabled: true })
		.expect(200);
});

afterEach(async () => {
	// @ts-expect-error - provisioningConfig is private
	provisioningService.provisioningConfig = { ...savedConfig };
	await Container.get(RoleMappingRuleRepository).delete({});
	await setCurrentAuthenticationMethod('email');
});

describe('SSO role lock', () => {
	test('locks global and project roles while SAML login is on', async () => {
		expect(getCurrentAuthenticationMethod()).toBe('saml');

		await expectRolesLocked();
	});

	test('unlocks global and project roles after SAML login is turned off through the toggle', async () => {
		await toggleSamlLogin(false);
		expect(getCurrentAuthenticationMethod()).toBe('email');

		await expectRolesEditable();
	});

	test('unlocks roles from expression mapping after SAML login is turned off', async () => {
		// @ts-expect-error - provisioningConfig is private
		provisioningService.provisioningConfig.scopesProvisionInstanceRole = false;
		// @ts-expect-error - provisioningConfig is private
		provisioningService.provisioningConfig.scopesProvisionProjectRoles = false;
		// @ts-expect-error - provisioningConfig is private
		provisioningService.provisioningConfig.scopesUseExpressionMapping = true;

		const roleRepository = Container.get(RoleRepository);
		const ruleRepository = Container.get(RoleMappingRuleRepository);
		await ruleRepository.save(
			ruleRepository.create({
				expression: '{{ true }}',
				role: await roleRepository.findOneOrFail({ where: { slug: 'global:admin' } }),
				type: 'instance',
				order: 0,
			}),
		);
		const projectRule = ruleRepository.create({
			expression: '{{ true }}',
			role: await roleRepository.findOneOrFail({ where: { slug: 'project:editor' } }),
			type: 'project',
			order: 1,
		});
		projectRule.projects = [project];
		await ruleRepository.save(projectRule);

		await expectRolesLocked();

		await toggleSamlLogin(false);

		await expectRolesEditable();
	});

	test('locks roles again when SAML login is turned on again', async () => {
		await toggleSamlLogin(false);
		await toggleSamlLogin(true);

		await expectRolesLocked();
	});

	test('locks roles while OIDC is the authentication method', async () => {
		await toggleSamlLogin(false);
		await setCurrentAuthenticationMethod('oidc');

		await expectRolesLocked();
	});

	test('does not lock roles while LDAP is the authentication method', async () => {
		await toggleSamlLogin(false);
		await setCurrentAuthenticationMethod('ldap');

		await expectRolesEditable();
	});
});
