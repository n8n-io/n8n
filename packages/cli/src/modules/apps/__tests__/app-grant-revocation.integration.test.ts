import { CreateAppDto } from '@n8n/api-types';
import {
	AppHostService,
	AppsConfig,
	AppsService,
	registerAppGrantRevocation,
} from '@n8n/backend-module-apps';
import { ModulesConfig } from '@n8n/backend-common';
import { OAuth2FlowProxy } from '@n8n/backend-services/auth';
import {
	createTeamProject,
	getPersonalProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { createMember, createOwner } from '@test-integration/db/users';

import { packagedModules } from '@/modules/modules.manifest';
import { AccessToken } from '@/modules/oauth-server/database/entities/oauth-access-token.entity';
import { OAuthClient } from '@/modules/oauth-server/database/entities/oauth-client.entity';
import { UserConsent } from '@/modules/oauth-server/database/entities/oauth-user-consent.entity';
import { OAuthClientRepository } from '@/modules/oauth-server/database/repositories/oauth-client.repository';
import { OAuth2FlowService } from '@/modules/oauth-server/oauth-flow.service';
import { ProjectService } from '@/services/project.service.ee';
import { UserService } from '@/services/user.service';

const appId = '11111111-1111-4111-8111-111111111111';

let owner: User;
let apps: AppsService;
let hosts: AppHostService;

async function grantAccess(app: { id: string; namespace: string }, user: User) {
	const dataSource = Container.get(DataSource);
	for (const url of hosts.callbackUrls(app)) {
		await Container.get(OAuthClientRepository).upsertVirtualClient(
			{
				id: url,
				name: 'App',
				redirectUris: [url],
				grantTypes: ['authorization_code', 'refresh_token'],
				tokenEndpointAuthMethod: 'none',
				clientSecret: null,
				clientSecretExpiresAt: null,
				isFirstParty: true,
			},
			{},
		);
		await dataSource
			.getRepository(UserConsent)
			.save({ clientId: url, userId: user.id, grantedAt: Date.now(), scope: [] });
		await dataSource
			.getRepository(AccessToken)
			.save({ clientId: url, userId: user.id, token: `token-${url}` });
	}
}

async function grantRowsFor(app: { id: string; namespace: string }) {
	const dataSource = Container.get(DataSource);
	const urls = hosts.callbackUrls(app);
	const counts = await Promise.all(
		[OAuthClient, UserConsent, AccessToken].map(
			async (entity) =>
				await dataSource
					.getRepository(entity)
					.createQueryBuilder('row')
					.where(`row.${entity === OAuthClient ? 'id' : 'clientId'} IN (:...urls)`, { urls })
					.getCount(),
		),
	);
	return counts.reduce((sum, count) => sum + count, 0);
}

beforeAll(async () => {
	// The apps module is opt-in.
	Container.get(ModulesConfig).enabledModules = ['apps'];
	await testModules.loadModules(['oauth-server', 'apps'], packagedModules);
	await testDb.init();
	Container.get(AppsConfig).baseUrl = 'https://apps.example.com';
	Container.get(OAuth2FlowProxy).registerProvider(Container.get(OAuth2FlowService));
	registerAppGrantRevocation();
	apps = Container.get(AppsService);
	hosts = Container.get(AppHostService);
	owner = await createOwner();
});

afterEach(async () => {
	// Keep `Project`: the owner and its personal project live for the whole file.
	await testDb.truncate(['OAuthClient', 'App']);
});

afterAll(async () => {
	await testDb.terminate();
});

test('a new app with the ID and namespace of a deleted app has no consents or tokens', async () => {
	const project = await createTeamProject('Apps', owner);
	const app = await apps.createApp(
		project.id,
		CreateAppDto.parse({ name: 'Sales', namespace: 'sales' }),
		{ id: appId },
	);
	await grantAccess(app, owner);
	expect(await grantRowsFor(app)).toBe(6);

	await apps.deleteApp(project.id, appId);
	await apps.createApp(project.id, CreateAppDto.parse({ name: 'Sales', namespace: 'sales' }), {
		id: appId,
	});

	expect(await grantRowsFor(app)).toBe(0);
});

test('a namespace change removes the consents and tokens of the old namespace', async () => {
	const project = await createTeamProject('Apps', owner);
	const app = await apps.createApp(
		project.id,
		CreateAppDto.parse({ name: 'Sales', namespace: 'sales' }),
		{ id: appId },
	);
	await grantAccess(app, owner);

	await apps.updateApp(project.id, appId, { namespace: 'sales-new' });

	expect(await grantRowsFor(app)).toBe(0);
});

test('a project deletion removes the consents and tokens of its apps', async () => {
	const project = await createTeamProject('Apps', owner);
	const kept = await createTeamProject('Other apps', owner);
	const app = await apps.createApp(
		project.id,
		CreateAppDto.parse({ name: 'Sales', namespace: 'sales' }),
		{ id: appId },
	);
	const other = await apps.createApp(
		kept.id,
		CreateAppDto.parse({ name: 'Support', namespace: 'support' }),
	);
	await grantAccess(app, owner);
	await grantAccess(other, owner);

	await Container.get(ProjectService).deleteProject(owner, project.id);

	expect(await grantRowsFor(app)).toBe(0);
	expect(await grantRowsFor(other)).toBe(6);
});

test.each([
	{ case: 'without a transfer', transfer: false },
	{ case: 'with a transfer', transfer: true },
])('a user deletion $case removes the consents and tokens of their apps', async ({ transfer }) => {
	const member = await createMember();
	const personalProject = await getPersonalProject(member);
	const app = await apps.createApp(
		personalProject.id,
		CreateAppDto.parse({ name: 'Sales', namespace: 'sales' }),
		{ id: appId },
	);
	await grantAccess(app, member);
	const target = transfer ? await createTeamProject('Transfer target', owner) : undefined;

	await Container.get(UserService).deleteUser(owner, member.id, target?.id);

	expect(await grantRowsFor(app)).toBe(0);
});
