import {
	SKILL_SYNC_FLAG,
	type SkillSourceConnectResponse,
	type SkillSourceCredentialOption,
	type SkillSourceDiscovery,
	type SkillSourceRepositoryList,
	type SkillSourceListItem,
} from '@n8n/api-types';
import { PostHogClient } from '@n8n/backend-services';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testModules,
} from '@n8n/backend-test-utils';
import { CredentialsEntity, CredentialsRepository, type Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { GithubAppApi } from 'n8n-nodes-base/credentials/GithubAppApi.credentials';
import { GithubOAuth2Api } from 'n8n-nodes-base/credentials/GithubOAuth2Api.credentials';
import { OAuth2Api } from 'n8n-nodes-base/credentials/OAuth2Api.credentials';
import nock from 'nock';
import { generateKeyPairSync } from 'node:crypto';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { deleteAllSkills } from '../../testing';
import { FakeGitHub } from '../test-utils/fake-github';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { SkillSyncService } from '../../services/skill-sync.service';
import { SkillsTelemetry } from '../../services/skills-telemetry.service';
import { SkillSourceLink } from '../../database/entities/skill-source-link.entity';
import { GitHubSkillSourceClient } from '../../sources/github/github-skill-source-client';
import { SkillSourceReadError } from '../../errors/skill-source-read.error';
import { OauthService } from '@/oauth/oauth.service';

import {
	encryptCredentialData,
	saveCredential,
	shareCredentialWithProjects,
} from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import { initCredentialsTypes, setupTestServer } from '@test-integration/utils';

const PRIVATE = 'https://github.com/acme/private';
const TOKEN = 'ghp_team';

const skillMd = (name: string) =>
	`---\nname: ${name}\ndescription: ${name} description\n---\n\nFollow ${name}.\n`;

beforeAll(async () => {
	await testModules.loadModules(['skills', 'agents']);
	// The test server loads no node packages. Decrypting a credential needs its type.
	await initCredentialsTypes();
	const { credentials } = Container.get(LoadNodesAndCredentials).loaded;
	credentials.githubAppApi = { type: new GithubAppApi(), sourcePath: '' };
	// GitHub OAuth2 extends the generic OAuth2 type, so both must load.
	credentials.oAuth2Api = { type: new OAuth2Api(), sourcePath: '' };
	credentials.githubOAuth2Api = { type: new GithubOAuth2Api(), sourcePath: '' };
	nock.disableNetConnect();
	nock.enableNetConnect(/127\.0\.0\.1|localhost/);
});

afterAll(() => {
	nock.enableNetConnect();
});

type Body<T> = { data: T; meta?: { reason: string } };

describe('Skill Sync with credentials', () => {
	const server = setupTestServer({ endpointGroups: ['ai'] });
	const postHog = mockInstance(PostHogClient);
	const github = new FakeGitHub();
	let owner: SuperAgentTest;
	let editor: SuperAgentTest;
	let member: SuperAgentTest;
	let viewer: SuperAgentTest;
	let team: Project;
	let personal: Project;
	let teamCredential: CredentialsEntity;
	let otherTeamCredential: CredentialsEntity;
	let oauthCredential: CredentialsEntity;
	let badCredential: CredentialsEntity;
	let ownerCredential: CredentialsEntity;
	let memberCredential: CredentialsEntity;
	let appCredential: CredentialsEntity;
	let enterpriseAppCredential: CredentialsEntity;
	let restrictedAppCredential: CredentialsEntity;
	let sharedCredential: CredentialsEntity;
	let globalCredential: CredentialsEntity;

	const ghCredential = (name: string, accessToken: string, type = 'githubApi') => ({
		name,
		type,
		data: { accessToken },
	});

	beforeAll(async () => {
		const ownerUser = await createOwner();
		const editorUser = await createMember();
		const memberUser = await createMember();
		owner = server.authAgentFor(ownerUser);
		editor = server.authAgentFor(editorUser);
		member = server.authAgentFor(memberUser);
		team = await createTeamProject('Marketing');
		const otherTeam = await createTeamProject('Sales');
		personal = await getPersonalProject(memberUser);
		await linkUserToProject(editorUser, team, 'project:editor');
		await linkUserToProject(editorUser, otherTeam, 'project:editor');
		const viewerUser = await createMember();
		viewer = server.authAgentFor(viewerUser);
		await linkUserToProject(viewerUser, team, 'project:viewer');
		const inProject = (project: Project) => ({ project, role: 'credential:owner' as const });
		teamCredential = await saveCredential(ghCredential('Team GitHub', TOKEN), inProject(team));
		otherTeamCredential = await saveCredential(
			ghCredential('Sales GitHub', TOKEN),
			inProject(otherTeam),
		);
		// OAuth2 keeps the token of the connected account in `oauthTokenData`.
		oauthCredential = await saveCredential(
			{
				name: 'Team OAuth',
				type: 'githubOAuth2Api',
				data: { oauthTokenData: { access_token: TOKEN } },
			},
			inProject(team),
		);
		badCredential = await saveCredential(ghCredential('Expired', 'ghp_expired'), inProject(team));
		// Owned by another project and shared with the team: the team accepts it too.
		sharedCredential = await saveCredential(
			ghCredential('Shared GitHub', TOKEN),
			inProject(otherTeam),
		);
		await shareCredentialWithProjects(sharedCredential, [team]);
		// Owned by another project and made global: every project accepts it, as in a workflow.
		globalCredential = await saveCredential(
			{ ...ghCredential('Global GitHub', TOKEN), isGlobal: true },
			inProject(otherTeam),
		);
		ownerCredential = await saveCredential(ghCredential('Owner GitHub', TOKEN), {
			user: ownerUser,
			role: 'credential:owner',
		});
		memberCredential = await saveCredential(ghCredential('Member GitHub', TOKEN), {
			user: memberUser,
			role: 'credential:owner',
		});
		const { privateKey } = generateKeyPairSync('rsa', {
			modulusLength: 2048,
			privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
			publicKeyEncoding: { type: 'spki', format: 'pem' },
		});
		const app = { appId: '1', installationId: '42', privateKey, accessToken: '' };
		appCredential = await saveCredential(
			{ name: 'Team GitHub App', type: 'githubAppApi', data: app },
			inProject(team),
		);
		enterpriseAppCredential = await saveCredential(
			{
				name: 'Enterprise GitHub App',
				type: 'githubAppApi',
				data: { ...app, server: 'https://git.acme.dev/api/v3' },
			},
			inProject(team),
		);
		restrictedAppCredential = await saveCredential(
			{
				name: 'Restricted GitHub App',
				type: 'githubAppApi',
				data: { ...app, allowedHttpRequestDomains: 'domains', allowedDomains: 'example.com' },
			},
			inProject(team),
		);
	});

	beforeEach(async () => {
		await deleteAllSkills();
		await Container.get(DataSource).manager.delete(SkillSourceConnection, {});
		postHog.getFeatureFlags.mockResolvedValue({ [SKILL_SYNC_FLAG]: true });
		github.start();
		github.push('acme/private', { 'skills/pdf/SKILL.md': skillMd('pdf') }, 'main', {
			private: true,
		});
		github.grant(TOKEN, ['acme/private']);
	});

	afterEach(() => {
		github.stop();
		vi.restoreAllMocks();
	});

	const get = async <T>(agent: SuperAgentTest, path: string, status = 200) =>
		(await agent.get(path).expect(status)).body as Body<T>;

	const post = async <T>(agent: SuperAgentTest, path: string, body: object, status = 200) =>
		(await agent.post(path).send(body).expect(status)).body as Body<T>;

	const names = (options: SkillSourceCredentialOption[]) => options.map(({ name }) => name).sort();

	describe('credential select', () => {
		it('lists the GitHub credentials that the project can use', async () => {
			const { data } = await get<SkillSourceCredentialOption[]>(
				editor,
				`/skill-sources/credentials?scope=project&projectId=${team.id}`,
			);

			expect(names(data)).toEqual([
				'Enterprise GitHub App',
				'Expired',
				'Global GitHub',
				'Restricted GitHub App',
				'Shared GitHub',
				'Team GitHub',
				'Team GitHub App',
				'Team OAuth',
			]);
			expect(data.map(({ id }) => id)).not.toContain(otherTeamCredential.id);
		});

		it('lists for Global only the credentials that an admin owns', async () => {
			const { data } = await get<SkillSourceCredentialOption[]>(
				owner,
				'/skill-sources/credentials?scope=instance',
			);

			expect(data.map(({ id }) => id)).toContain(ownerCredential.id);
			expect(data.map(({ id }) => id)).not.toContain(memberCredential.id);
		});

		it('lists the repositories that a credential can read', async () => {
			const { data } = await get<SkillSourceRepositoryList>(
				editor,
				`/skill-sources/repositories?scope=project&projectId=${team.id}&credentialId=${teamCredential.id}`,
			);

			expect(data).toEqual({
				repositories: [{ owner: 'acme', name: 'private', private: true, url: PRIVATE }],
				truncated: false,
			});
		});

		describe('refusals', () => {
			const credentials = (query: string) => `/skill-sources/credentials?${query}`;
			const repositories = (query: string) => `/skill-sources/repositories?${query}`;

			it('refuses the Global credential list to a member', async () => {
				await get(member, credentials('scope=instance'), 403);
			});

			it('refuses the team credential list to a user outside the team, with no names', async () => {
				const response = await member
					.get(credentials(`scope=project&projectId=${team.id}`))
					.expect(403);

				expect(JSON.stringify(response.body)).not.toContain('Team GitHub');
			});

			it.each([
				['a credential of another project', () => otherTeamCredential.id],
				['an unknown credential', () => 'no-such-credential'],
			])('refuses to list repositories with %s', async (_case, credentialId) => {
				const { meta } = await get(
					editor,
					repositories(`scope=project&projectId=${team.id}&credentialId=${credentialId()}`),
					403,
				);

				expect(meta).toEqual({ reason: 'credential_out_of_scope' });
			});

			it('refuses to list Global repositories with a project credential', async () => {
				const { meta } = await get(
					owner,
					repositories(`scope=instance&credentialId=${teamCredential.id}`),
					403,
				);

				expect(meta).toEqual({ reason: 'credential_out_of_scope' });
			});

			it('answers 404 on both routes with the Skill Sync flag off', async () => {
				postHog.getFeatureFlags.mockResolvedValue({});

				await get(editor, credentials(`scope=project&projectId=${team.id}`), 404);
				await get(
					editor,
					repositories(`scope=project&projectId=${team.id}&credentialId=${teamCredential.id}`),
					404,
				);
			});
		});
	});

	describe('private import', () => {
		const scope = () => ({ scope: 'project', projectId: team.id });

		it('reads a private repository with a connected OAuth2 account', async () => {
			const { data } = await post<SkillSourceDiscovery>(editor, '/skill-sources/discover', {
				url: PRIVATE,
				...scope(),
				credentialId: oauthCredential.id,
			});

			expect(data.skills.map(({ name }) => name)).toEqual(['pdf']);
		});

		it('refreshes an expired OAuth2 token before it reads a private repository', async () => {
			const expired = await saveCredential(
				{
					name: 'Expiring OAuth',
					type: 'githubOAuth2Api',
					data: {
						clientId: 'client-id',
						clientSecret: 'client-secret',
						oauthTokenData: {
							access_token: 'ghu_expired',
							refresh_token: 'ghr_first',
							token_type: 'bearer',
							expires_in: 28800,
							n8n_expires_at: String(Date.now() - 1000),
						},
					},
				},
				{ project: team, role: 'credential:owner' },
			);
			const exchange = nock('https://github.com').post('/login/oauth/access_token').reply(200, {
				access_token: TOKEN,
				refresh_token: 'ghr_second',
				token_type: 'bearer',
				expires_in: 28800,
			});

			const { data } = await post<SkillSourceDiscovery>(editor, '/skill-sources/discover', {
				url: PRIVATE,
				...scope(),
				credentialId: expired.id,
			});

			expect(exchange.isDone()).toBe(true);
			expect(data.skills.map(({ name }) => name)).toEqual(['pdf']);
		});

		describe('a credential that allows only some domains', () => {
			const expiringWith = async (allowedDomains: string) =>
				await saveCredential(
					{
						name: `Restricted OAuth ${allowedDomains}`,
						type: 'githubOAuth2Api',
						data: {
							clientId: 'client-id',
							clientSecret: 'client-secret',
							allowedHttpRequestDomains: 'domains',
							allowedDomains,
							oauthTokenData: {
								access_token: 'ghu_expired',
								refresh_token: 'ghr_first',
								token_type: 'bearer',
								expires_in: 28800,
								n8n_expires_at: String(Date.now() - 1000),
							},
						},
					},
					{ project: team, role: 'credential:owner' },
				);
			const tokenExchange = () =>
				nock('https://github.com').post('/login/oauth/access_token').reply(200, {
					access_token: TOKEN,
					refresh_token: 'ghr_second',
					token_type: 'bearer',
					expires_in: 28800,
				});

			it('refuses to refresh the token when the token URL is not allowed', async () => {
				const restricted = await expiringWith('example.com');
				const exchange = tokenExchange();

				const response = await editor
					.post('/skill-sources/discover')
					.send({ url: PRIVATE, ...scope(), credentialId: restricted.id });

				expect(response.status).toBeGreaterThanOrEqual(400);
				expect(exchange.isDone()).toBe(false);
			});

			it('refreshes the token when the token URL is allowed', async () => {
				const restricted = await expiringWith('github.com');
				const exchange = tokenExchange();

				const { data } = await post<SkillSourceDiscovery>(editor, '/skill-sources/discover', {
					url: PRIVATE,
					...scope(),
					credentialId: restricted.id,
				});

				expect(exchange.isDone()).toBe(true);
				expect(data.skills.map(({ name }) => name)).toEqual(['pdf']);
			});
		});

		it('uses the token that another caller refreshed first, with no second exchange', async () => {
			const expiring = {
				clientId: 'client-id',
				clientSecret: 'client-secret',
				oauthTokenData: {
					access_token: 'ghu_expired',
					refresh_token: 'ghr_first',
					token_type: 'bearer',
					expires_in: 28800,
					n8n_expires_at: String(Date.now() - 1000),
				},
			};
			const expired = await saveCredential(
				{ name: 'Raced OAuth', type: 'githubOAuth2Api', data: expiring },
				{ project: team, role: 'credential:owner' },
			);
			const exchange = nock('https://github.com').post('/login/oauth/access_token').reply(200, {
				access_token: 'ghu_unexpected',
				refresh_token: 'ghr_unexpected',
				token_type: 'bearer',
				expires_in: 28800,
			});
			// Another caller saves a new token after this resolve read the old one, and before
			// its refresh runs.
			const oauthService = Container.get(OauthService);
			const refresh = oauthService.refreshOAuth2CredentialById.bind(oauthService);
			const refreshSpy = vi
				.spyOn(oauthService, 'refreshOAuth2CredentialById')
				.mockImplementation(async (...args) => {
					const refreshed = Object.assign(new CredentialsEntity(), {
						id: expired.id,
						name: expired.name,
						type: expired.type,
						data: {
							...expiring,
							oauthTokenData: {
								...expiring.oauthTokenData,
								access_token: TOKEN,
								refresh_token: 'ghr_second',
								n8n_expires_at: String(Date.now() + 28_800_000),
							},
						},
					});
					await encryptCredentialData(refreshed);
					await Container.get(CredentialsRepository).update(expired.id, {
						data: refreshed.data,
					});
					return await refresh(...args);
				});

			try {
				const { data } = await post<SkillSourceDiscovery>(editor, '/skill-sources/discover', {
					url: PRIVATE,
					...scope(),
					credentialId: expired.id,
				});

				expect(refreshSpy).toHaveBeenCalledWith(expired.id, team.id, {
					accessToken: 'ghu_expired',
					expiresAt: Number(expiring.oauthTokenData.n8n_expires_at),
				});
				expect(exchange.isDone()).toBe(false);
				expect(data.skills.map(({ name }) => name)).toEqual(['pdf']);
			} finally {
				refreshSpy.mockRestore();
			}
		});

		it('imports from a private repository and stores the credential on the source', async () => {
			const body = { url: PRIVATE, ...scope(), credentialId: teamCredential.id };
			const { data: discovery } = await post<SkillSourceDiscovery>(
				editor,
				'/skill-sources/discover',
				body,
			);
			const { data } = await post<SkillSourceConnectResponse>(editor, '/skill-sources', {
				...body,
				skillKeys: discovery.skills.map(({ key }) => key),
			});

			expect(data.imported.map(({ name }) => name)).toEqual(['pdf']);
			const source = await Container.get(DataSource).manager.findOneByOrFail(
				SkillSourceConnection,
				{ id: data.sourceId },
			);
			expect(source.credentialId).toBe(teamCredential.id);
		});

		it('cannot read the private repository without a credential', async () => {
			const { meta } = await post(
				editor,
				'/skill-sources/discover',
				{ url: PRIVATE, ...scope() },
				404,
			);

			expect(meta).toEqual({ reason: 'not_found' });
		});

		it.each([
			['a credential of another project', () => otherTeamCredential.id],
			['a credential that does not exist', () => 'no-such-credential'],
		])('refuses %s as out of scope', async (_case, credentialId) => {
			const { meta } = await post(
				editor,
				'/skill-sources/discover',
				{ url: PRIVATE, ...scope(), credentialId: credentialId() },
				403,
			);

			expect(meta).toEqual({ reason: 'credential_out_of_scope' });
		});

		it('refuses a member credential for a Global source', async () => {
			const { meta } = await post(
				owner,
				'/skill-sources/discover',
				{ url: PRIVATE, scope: 'instance', credentialId: memberCredential.id },
				403,
			);

			expect(meta).toEqual({ reason: 'credential_out_of_scope' });
		});

		it('accepts a global credential, as the workflow credential select does', async () => {
			const { data } = await post<SkillSourceDiscovery>(editor, '/skill-sources/discover', {
				url: PRIVATE,
				...scope(),
				credentialId: globalCredential.id,
			});

			expect(data.skills.map(({ name }) => name)).toEqual(['pdf']);
		});

		it('accepts a credential that another project shares with the project', async () => {
			const { data } = await post<SkillSourceDiscovery>(editor, '/skill-sources/discover', {
				url: PRIVATE,
				...scope(),
				credentialId: sharedCredential.id,
			});

			expect(data.skills.map(({ name }) => name)).toEqual(['pdf']);
		});

		it('reports access: credential to telemetry, on a connect and on a refused discover', async () => {
			const connectedSource = vi.spyOn(Container.get(SkillsTelemetry), 'connectedSource');
			const body = { url: PRIVATE, ...scope(), credentialId: teamCredential.id };
			const { data: discovery } = await post<SkillSourceDiscovery>(
				editor,
				'/skill-sources/discover',
				body,
			);
			await post(editor, '/skill-sources', {
				...body,
				skillKeys: discovery.skills.map(({ key }) => key),
			});
			await post(
				editor,
				'/skill-sources/discover',
				{ ...body, credentialId: otherTeamCredential.id },
				403,
			);

			expect(connectedSource.mock.calls.map(([props]) => props)).toEqual([
				expect.objectContaining({ access: 'credential', status: 'success' }),
				expect.objectContaining({
					access: 'credential',
					status: 'failure',
					reason: 'credential_out_of_scope',
				}),
			]);
			connectedSource.mockRestore();
		});

		it('reports a GitHub App that cannot get a token as credential_invalid', async () => {
			nock('https://api.github.com')
				.post('/app/installations/42/access_tokens')
				.reply(401, { message: 'A JSON web token could not be decoded' });

			const { meta } = await post(
				editor,
				'/skill-sources/discover',
				{ url: PRIVATE, ...scope(), credentialId: appCredential.id },
				400,
			);

			expect(meta).toEqual({ reason: 'credential_invalid' });
		});

		it('mints a fresh installation token for a GitHub App credential', async () => {
			const exchange = nock('https://api.github.com')
				.post('/app/installations/42/access_tokens')
				.reply(201, { token: TOKEN });

			await post(editor, '/skill-sources/discover', {
				url: PRIVATE,
				...scope(),
				credentialId: appCredential.id,
			});

			expect(exchange.isDone()).toBe(true);
		});

		it('refuses a GitHub App for another server before it mints a token', async () => {
			const exchange = nock('https://git.acme.dev')
				.post('/api/v3/app/installations/42/access_tokens')
				.reply(201, { token: TOKEN });

			const { meta } = await post(
				editor,
				'/skill-sources/discover',
				{ url: PRIVATE, ...scope(), credentialId: enterpriseAppCredential.id },
				400,
			);

			expect(meta).toEqual({ reason: 'host_blocked' });
			expect(exchange.isDone()).toBe(false);
		});

		it('holds the token exchange of a GitHub App to the allowed domains of the credential', async () => {
			const exchange = nock('https://api.github.com')
				.post('/app/installations/42/access_tokens')
				.reply(201, { token: TOKEN });

			const response = await editor
				.post('/skill-sources/discover')
				.send({ url: PRIVATE, ...scope(), credentialId: restrictedAppCredential.id });

			expect(response.status).toBeGreaterThanOrEqual(400);
			expect(exchange.isDone()).toBe(false);
		});

		it('reports a token that GitHub refuses as credential_invalid', async () => {
			const { meta } = await post(
				editor,
				'/skill-sources/discover',
				{ url: PRIVATE, ...scope(), credentialId: badCredential.id },
				400,
			);

			expect(meta).toEqual({ reason: 'credential_invalid' });
		});

		it('lets a member use their own credential in their personal project', async () => {
			await post(
				member,
				'/skill-sources/discover',
				{
					url: PRIVATE,
					scope: 'project',
					projectId: personal.id,
					credentialId: memberCredential.id,
				},
				200,
			);
		});
	});

	describe('the check of a private source', () => {
		const db = () => Container.get(DataSource).manager;

		/** Imports the private repository into the team with the credential. */
		const importPrivate = async () => {
			const body = {
				url: PRIVATE,
				scope: 'project',
				projectId: team.id,
				credentialId: teamCredential.id,
			};
			const { data: discovery } = await post<SkillSourceDiscovery>(
				editor,
				'/skill-sources/discover',
				body,
			);
			const { data } = await post<SkillSourceConnectResponse>(editor, '/skill-sources', {
				...body,
				skillKeys: discovery.skills.map(({ key }) => key),
			});
			return { sourceId: data.sourceId, skillId: data.imported[0].skillId };
		};

		const lastErrorOf = async (sourceId: string) =>
			(await db().findOneByOrFail(SkillSourceConnection, { id: sourceId })).lastErrorReason;

		const credentialPath = (sourceId: string) =>
			`/projects/${team.id}/skill-sources/${sourceId}/credential`;
		const sourceRow = async (agent: SuperAgentTest, sourceId: string) => {
			const { data } = await get<SkillSourceListItem[]>(agent, '/skill-sources');
			return data.find(({ id }) => id === sourceId)!;
		};

		it.each(['expired', 'deleted'] as const)(
			'recovers a source with a %s credential after replacement',
			async (failure) => {
				const updated = vi.spyOn(Container.get(SkillsTelemetry), 'updatedSourceCredential');
				const healthChanged = vi.spyOn(Container.get(SkillsTelemetry), 'sourceHealthChanged');
				const { sourceId, skillId } = await importPrivate();
				const original = await db().findOneByOrFail(SkillSourceLink, { skillId });
				if (failure === 'expired') {
					await db().update(
						SkillSourceConnection,
						{ id: sourceId },
						{ credentialId: badCredential.id },
					);
				} else {
					const temporary = await saveCredential(ghCredential('Temporary GitHub', TOKEN), {
						project: team,
						role: 'credential:owner',
					});
					await db().update(
						SkillSourceConnection,
						{ id: sourceId },
						{ credentialId: temporary.id },
					);
					await db().delete(CredentialsEntity, { id: temporary.id });
					expect((await sourceRow(viewer, sourceId)).health).toBe('credential_issue');
				}
				github.requests.refs = 0;
				await Container.get(SkillSyncService).checkAll();
				const row = await sourceRow(viewer, sourceId);
				expect(row).toMatchObject({ health: 'credential_issue', canReplaceCredential: false });
				expect(row).not.toHaveProperty('credentialId');
				expect(row).not.toHaveProperty('credentialName');
				if (failure === 'deleted') expect(github.requests.refs).toBe(0);
				expect((await sourceRow(editor, sourceId)).canReplaceCredential).toBe(true);
				await post(editor, credentialPath(sourceId), { credentialId: oauthCredential.id });
				expect((await sourceRow(viewer, sourceId)).health).toBe('connected');
				expect(await db().findOneByOrFail(SkillSourceLink, { skillId })).toEqual(original);
				await Container.get(SkillSyncService).checkAll();
				expect(await lastErrorOf(sourceId)).toBeNull();
				expect(updated).toHaveBeenCalledWith(
					{ provider: 'github', status: 'success' },
					expect.any(String),
				);
				expect(healthChanged.mock.calls.map(([props]) => props)).toEqual([
					{ provider: 'github', previous_health: 'connected', health: 'credential_issue' },
					{ provider: 'github', previous_health: 'credential_issue', health: 'connected' },
				]);
			},
		);

		it('keeps the current credential when the replacement cannot read the source', async () => {
			const { sourceId } = await importPrivate();
			const { meta } = await post(
				editor,
				credentialPath(sourceId),
				{ credentialId: badCredential.id },
				400,
			);
			expect(meta).toEqual({ reason: 'credential_invalid' });
			expect(
				(await db().findOneByOrFail(SkillSourceConnection, { id: sourceId })).credentialId,
			).toBe(teamCredential.id);
		});

		it('keeps replacement health when a check with the old credential fails later', async () => {
			const { sourceId } = await importPrivate();
			const started = createDeferredPromise<undefined>();
			const oldResult = createDeferredPromise<string>();
			vi.spyOn(Container.get(GitHubSkillSourceClient), 'probe').mockImplementationOnce(async () => {
				started.resolve(undefined);
				return await oldResult.promise;
			});
			const check = Container.get(SkillSyncService).checkAll();
			await started.promise;
			await post(editor, credentialPath(sourceId), { credentialId: oauthCredential.id });
			oldResult.reject(
				new SkillSourceReadError('credential_invalid', 'The old credential expired.'),
			);
			await check;
			expect((await sourceRow(viewer, sourceId)).health).toBe('connected');
		});

		it('keeps a deleted credential visible while public access waits after a rate limit', async () => {
			const { sourceId } = await importPrivate();
			await db().update(SkillSourceConnection, { id: sourceId }, { credentialId: null });
			const backoff = Reflect.get(Container.get(SkillSyncService), 'backoff') as Map<
				string,
				{ until: number; attempts: number }
			>;
			backoff.set('public:github', { until: Date.now() + 3_600_000, attempts: 1 });
			try {
				await Container.get(SkillSyncService).checkAll();
				expect(await lastErrorOf(sourceId)).toBe('credential_missing');
			} finally {
				backoff.clear();
			}
		});

		it('lists only usable replacements and refuses viewers, outsiders, other scopes, and the flag off', async () => {
			const { sourceId } = await importPrivate();
			const path = credentialPath(sourceId);
			const { data } = await get<SkillSourceCredentialOption[]>(editor, `${path}s`);
			expect(data.map(({ id }) => id)).toContain(oauthCredential.id);
			expect(data.map(({ id }) => id)).not.toContain(otherTeamCredential.id);
			await get(viewer, `${path}s`, 403);
			await post(viewer, path, { credentialId: oauthCredential.id }, 403);
			await post(member, path, { credentialId: oauthCredential.id }, 404);
			await post(editor, path, { credentialId: otherTeamCredential.id }, 403);
			await post(editor, path, { credentialId: 'unknown' }, 403);
			await post(
				owner,
				`/skill-sources/${sourceId}/credential`,
				{ credentialId: ownerCredential.id },
				404,
			);
			await post(editor, path, {}, 400);
			postHog.getFeatureFlags.mockResolvedValue({});
			await get(editor, `${path}s`, 404);
			await post(editor, path, { credentialId: oauthCredential.id }, 404);
			await get(viewer, `${path}s`, 404);
			await get(member, `${path}s`, 404);
			await get(member, `/skill-sources/${sourceId}/credentials`, 404);
		});

		it('repairs a private source whose credential was deleted before credentialRequired existed', async () => {
			const { sourceId } = await importPrivate();
			// The migration backfill leaves this state, and the first check then fails.
			await db().update(
				SkillSourceConnection,
				{ id: sourceId },
				{ credentialId: null, credentialRequired: false, lastErrorReason: 'not_found' },
			);
			expect((await sourceRow(editor, sourceId)).canReplaceCredential).toBe(true);

			await post(editor, credentialPath(sourceId), { credentialId: teamCredential.id });

			const stored = await db().findOneByOrFail(SkillSourceConnection, { id: sourceId });
			expect(stored).toMatchObject({ credentialId: teamCredential.id, credentialRequired: true });
			expect((await sourceRow(editor, sourceId)).health).toBe('connected');
		});

		it('replaces a Global source credential only with an admin-owned credential', async () => {
			const payload = { url: PRIVATE, scope: 'instance', credentialId: ownerCredential.id };
			const { data: discovery } = await post<SkillSourceDiscovery>(
				owner,
				'/skill-sources/discover',
				payload,
			);
			const { data: source } = await post<SkillSourceConnectResponse>(owner, '/skill-sources', {
				...payload,
				skillKeys: discovery.skills.map(({ key }) => key),
			});
			const path = `/skill-sources/${source.sourceId}/credential`;
			await post(owner, path, { credentialId: memberCredential.id }, 403);
			await post(editor, path, { credentialId: teamCredential.id }, 403);
			await post(owner, path, { credentialId: ownerCredential.id });
		});

		it('reads the source with its stored credential, without a user', async () => {
			const { sourceId, skillId } = await importPrivate();
			github.push(
				'acme/private',
				{ 'skills/pdf/SKILL.md': skillMd('pdf').replace('Follow', 'Use') },
				'main',
				{
					private: true,
				},
			);

			await Container.get(SkillSyncService).checkAll();

			expect(await lastErrorOf(sourceId)).toBeNull();
			expect(await db().findOneByOrFail(SkillSourceLink, { skillId })).toMatchObject({
				state: 'update_available',
			});
		});

		it('reports credential_missing when the scope no longer accepts the credential', async () => {
			const { sourceId } = await importPrivate();
			await db().update(
				SkillSourceConnection,
				{ id: sourceId },
				{ credentialId: otherTeamCredential.id },
			);

			await Container.get(SkillSyncService).checkAll();

			expect(await lastErrorOf(sourceId)).toBe('credential_missing');
		});

		it('reports credential_invalid when GitHub refuses the token', async () => {
			const { sourceId } = await importPrivate();
			await db().update(
				SkillSourceConnection,
				{ id: sourceId },
				{ credentialId: badCredential.id },
			);

			await Container.get(SkillSyncService).checkAll();

			expect(await lastErrorOf(sourceId)).toBe('credential_invalid');
		});

		describe('the wait after a rate limit, for each access', () => {
			const backoff = () =>
				Reflect.get(Container.get(SkillSyncService), 'backoff') as Map<
					string,
					{ until: number; attempts: number }
				>;

			/** Imports a public repository into the team, with no credential. */
			const importPublic = async () => {
				github.push('acme/public', { 'skills/doc/SKILL.md': skillMd('doc') });
				const body = {
					url: 'https://github.com/acme/public',
					scope: 'project',
					projectId: team.id,
				};
				const { data: discovery } = await post<SkillSourceDiscovery>(
					editor,
					'/skill-sources/discover',
					body,
				);
				const { data } = await post<SkillSourceConnectResponse>(editor, '/skill-sources', {
					...body,
					skillKeys: discovery.skills.map(({ key }) => key),
				});
				return data.sourceId;
			};

			beforeEach(() => backoff().clear());

			it('refuses a credential for a healthy public source', async () => {
				const publicSource = await importPublic();
				expect((await sourceRow(editor, publicSource)).canReplaceCredential).toBe(false);
				await post(editor, credentialPath(publicSource), { credentialId: teamCredential.id }, 400);
				expect(
					(await db().findOneByOrFail(SkillSourceConnection, { id: publicSource })).credentialId,
				).toBeNull();
			});

			it('still reads a source with a credential while public access waits', async () => {
				const privateSource = (await importPrivate()).sourceId;
				const publicSource = await importPublic();
				backoff().set('public:github', { until: Date.now() + 3_600_000, attempts: 1 });
				github.requests.refs = 0;

				await Container.get(SkillSyncService).checkAll();

				expect(github.requests.refs).toBe(1);
				expect(await lastErrorOf(privateSource)).toBeNull();
				expect(await lastErrorOf(publicSource)).toBe('rate_limited');
			});

			it('still reads a public source while a credential waits', async () => {
				const privateSource = (await importPrivate()).sourceId;
				const publicSource = await importPublic();
				backoff().set(`credential:${teamCredential.id}`, {
					until: Date.now() + 3_600_000,
					attempts: 1,
				});
				github.requests.refs = 0;

				await Container.get(SkillSyncService).checkAll();

				expect(github.requests.refs).toBe(1);
				expect(await lastErrorOf(privateSource)).toBe('rate_limited');
				expect(await lastErrorOf(publicSource)).toBeNull();
			});
		});

		it('reports host_blocked for a credential of another GitHub server', async () => {
			const { sourceId } = await importPrivate();
			await db().update(
				SkillSourceConnection,
				{ id: sourceId },
				{ credentialId: enterpriseAppCredential.id },
			);

			await Container.get(SkillSyncService).checkAll();

			expect(await lastErrorOf(sourceId)).toBe('host_blocked');
		});
	});
});
