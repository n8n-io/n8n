import {
	SKILL_SYNC_FLAG,
	type SkillSourceConnectResponse,
	type SkillSourceCredentialOption,
	type SkillSourceDiscovery,
	type SkillSourceRepositoryList,
} from '@n8n/api-types';
import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	testModules,
} from '@n8n/backend-test-utils';
import type { CredentialsEntity, Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { GithubAppApi } from 'n8n-nodes-base/credentials/GithubAppApi.credentials';
import { GithubOAuth2Api } from 'n8n-nodes-base/credentials/GithubOAuth2Api.credentials';
import nock from 'nock';
import { generateKeyPairSync } from 'node:crypto';

import { SkillSourceConnection } from '../../database/entities/skill-source-connection.entity';
import { deleteAllSkills } from '../../testing';
import { FakeGitHub } from '../test-utils/fake-github';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { SkillsTelemetry } from '../../services/skills-telemetry.service';
import { PostHogClient } from '@/posthog';

import { saveCredential, shareCredentialWithProjects } from '@test-integration/db/credentials';
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
		const inProject = (project: Project) => ({ project, role: 'credential:owner' as const });
		teamCredential = await saveCredential(ghCredential('Team GitHub', TOKEN), inProject(team));
		otherTeamCredential = await saveCredential(
			ghCredential('Sales GitHub', TOKEN),
			inProject(otherTeam),
		);
		oauthCredential = await saveCredential(
			ghCredential('Team OAuth', TOKEN, 'githubOAuth2Api'),
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
	});

	const get = async <T>(agent: SuperAgentTest, path: string, status = 200) =>
		(await agent.get(path).expect(status)).body as Body<T>;

	const post = async <T>(agent: SuperAgentTest, path: string, body: object, status = 200) =>
		(await agent.post(path).send(body).expect(status)).body as Body<T>;

	const names = (options: SkillSourceCredentialOption[]) => options.map(({ name }) => name).sort();

	describe('credential select', () => {
		it('lists the GitHub token credentials that the project can use, and never OAuth2', async () => {
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
			]);
			expect(data.map(({ id }) => id)).not.toContain(oauthCredential.id);
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
			['an OAuth2 credential', () => oauthCredential.id],
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
});
