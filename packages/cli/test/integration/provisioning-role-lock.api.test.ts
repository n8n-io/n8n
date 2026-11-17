import {
	createTeamProject,
	getProjectRoleForUser,
	linkUserToProject,
	mockInstance,
} from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import { getCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';
import { Telemetry } from '@/telemetry';

import { sampleConfig } from './saml/sample-metadata';
import { createMember, createOwnerWithApiKey, getUserById } from './shared/db/users';
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

// The unit tests cover the lock for each sign-in state. Only the toggle sets
// the method back to email, so this test runs it through the API.
test('unlocks global and project roles after SAML login is turned off through the toggle', async () => {
	const provisioningService = Container.get(ProvisioningService);
	await provisioningService.getConfig();
	// @ts-expect-error - provisioningConfig is private
	provisioningService.provisioningConfig.scopesProvisionInstanceRole = true;
	// @ts-expect-error - provisioningConfig is private
	provisioningService.provisioningConfig.scopesProvisionProjectRoles = true;

	const owner = await createOwnerWithApiKey();
	// An instance admin cannot hold a project role, so the global change uses another user.
	const globalRoleTarget = await createMember();
	const member = await createMember();
	const project = await createTeamProject('Team Project', owner);
	await linkUserToProject(member, project, 'project:viewer');
	const ownerAgent = testServer.authAgentFor(owner);

	const getRolesManaged = async () =>
		(
			(await ownerAgent.get(`/projects/${project.id}`).expect(200)).body as {
				data: { rolesManaged: boolean };
			}
		).data.rolesManaged;

	// The toggle needs stored metadata, so save a full SAML config with login on.
	await ownerAgent
		.post('/sso/saml/config')
		.send({ ...sampleConfig, loginEnabled: true })
		.expect(200);
	expect(await getRolesManaged()).toBe(true);

	await ownerAgent.post('/sso/saml/config/toggle').send({ loginEnabled: false }).expect(200);
	expect(getCurrentAuthenticationMethod()).toBe('email');
	expect(await getRolesManaged()).toBe(false);

	await ownerAgent
		.patch(`/users/${globalRoleTarget.id}/role`)
		.send({ newRoleName: 'global:admin' })
		.expect(200);
	expect((await getUserById(globalRoleTarget.id)).role.slug).toBe('global:admin');

	await ownerAgent
		.patch(`/projects/${project.id}/users/${member.id}`)
		.send({ role: 'project:editor' })
		.expect(204);
	expect(await getProjectRoleForUser(project.id, member.id)).toBe('project:editor');

	await testServer
		.publicApiAgentFor(owner)
		.patch(`/projects/${project.id}/users/${member.id}`)
		.send({ role: 'project:viewer' })
		.expect(204);
	expect(await getProjectRoleForUser(project.id, member.id)).toBe('project:viewer');
});
