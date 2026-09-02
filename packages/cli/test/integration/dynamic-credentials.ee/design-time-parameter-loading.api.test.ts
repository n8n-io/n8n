/**
 * Design-time parameter loading against end-user credentials.
 *
 * The subject is a real resource locator: the Google Sheets node's `documentId`
 * parameter, whose "From list" mode calls the `spreadSheetsSearch` listSearch method.
 *
 * These paths run through `LoadOptionsContext` in mode `internal`, which
 * `CredentialsHelper.getDecrypted` skips dynamic resolution for unless the execution
 * context carries a credential context. The controller seals the requesting user's own
 * identity into one, so the list loads against the connection they already made instead
 * of against static data that holds no per-user token.
 *
 * Two hazards are covered alongside the happy path: an unconnected user must get an
 * error instead of a token-shaped failure, and a credential whose resolver keys on an
 * external subject must never be handed the n8n session token.
 */

import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	randomCredentialPayload,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type { NodeLoadingDetails } from 'n8n-workflow';
import nock from 'nock';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import {
	SYSTEM_RESOLVER_ID,
	SYSTEM_RESOLVER_NAME,
	SYSTEM_RESOLVER_TYPE,
} from '@/modules/dynamic-credentials.ee/constants';
import { DynamicCredentialUserEntryStorage } from '@/modules/dynamic-credentials.ee/credential-resolvers/storage/dynamic-credential-user-entry-storage';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';
import { DynamicCredentialsConfig } from '@/modules/dynamic-credentials.ee/dynamic-credentials.config';
import { Telemetry } from '@/telemetry';

import { decryptCredentialData, saveCredential } from '../shared/db/credentials';
import { createMember } from '../shared/db/users';
import { initNodeTypes, setupTestServer } from '../shared/utils';
import { loadNodesFromDist } from '../shared/utils/node-types-data';

mockInstance(Telemetry);

process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';

mockInstance(DynamicCredentialsConfig, {
	endpointAuthToken: 'static-test-token',
	corsOrigin: 'https://app.example.com',
	corsAllowCredentials: false,
});

const testServer = setupTestServer({
	endpointGroups: ['dynamic-node-parameters', 'credentials'],
	enabledFeatures: ['feat:sharing', 'feat:dynamicCredentials'],
	modules: ['dynamic-credentials'],
});

/** Resolves the requested credential types (and everything they extend) out of `nodes-base/dist`. */
function registerCredentialTypesFromDist(credentialTypeNames: string[]) {
	const baseDir = path.resolve(__dirname, '../../../../nodes-base');
	const known = JSON.parse(
		readFileSync(path.join(baseDir, 'dist/known/credentials.json'), 'utf-8'),
	) as Record<string, NodeLoadingDetails & { extends?: string[]; supportedNodes?: string[] }>;

	const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
	const pending = [...credentialTypeNames];

	while (pending.length > 0) {
		const name = pending.shift()!;
		if (name in loadNodesAndCredentials.loadedCredentials) continue;

		const loadInfo = known[name];
		if (!loadInfo) throw new Error(`Unknown credential type in dist: ${name}`);

		const CredentialClass = require(path.join(baseDir, loadInfo.sourcePath))[loadInfo.className];
		loadNodesAndCredentials.loadedCredentials[name] = {
			type: new CredentialClass(),
			sourcePath: '',
		};
		loadNodesAndCredentials.knownCredentials[name] = {
			className: loadInfo.className,
			sourcePath: loadInfo.sourcePath,
			extends: loadInfo.extends,
			supportedNodes: loadInfo.supportedNodes,
		};

		pending.push(...(loadInfo.extends ?? []));
	}
}

/** Google Sheets `documentId` → "From list" → `spreadSheetsSearch`. */
const GOOGLE_SHEETS = { name: 'n8n-nodes-base.googleSheets', version: 4.7 };
const DRIVE_HOST = 'https://www.googleapis.com';
const DRIVE_FILES_PATH = '/drive/v3/files';
const PER_USER_ACCESS_TOKEN = 'per-user-access-token';
/**
 * The OAuth2 resolver keys on a subject the external IdP names, not on an n8n user.
 * Ids are 16-char nanoids in production, and Postgres enforces that column width.
 */
const EXTERNAL_RESOLVER_ID = 'external-oauth';
const EXTERNAL_RESOLVER_TYPE = 'credential-resolver.oauth2-1.0';

let member: User;
let otherMember: User;
let viewer: User;
let teamProject: Project;

beforeAll(async () => {
	await initNodeTypes(loadNodesFromDist([GOOGLE_SHEETS.name]));
	registerCredentialTypesFromDist(['googleSheetsOAuth2Api']);
});

beforeEach(async () => {
	await testDb.truncate([
		'DynamicCredentialUserEntry',
		'DynamicCredentialResolver',
		'SharedCredentials',
		'CredentialsEntity',
	]);
	nock.cleanAll();

	member = await createMember();
	otherMember = await createMember();
	viewer = await createMember();
	// End-user credentials live in team projects only.
	teamProject = await createTeamProject(undefined, member);
	await linkUserToProject(otherMember, teamProject, 'project:editor');
	// A viewer can read the credential but not connect an account to it.
	await linkUserToProject(viewer, teamProject, 'project:viewer');

	const resolverRepository = Container.get(DynamicCredentialResolverRepository);
	const config = await Container.get(Cipher).encryptV2({});
	await resolverRepository.save([
		resolverRepository.create({
			id: SYSTEM_RESOLVER_ID,
			name: SYSTEM_RESOLVER_NAME,
			type: SYSTEM_RESOLVER_TYPE,
			config,
		}),
		resolverRepository.create({
			id: EXTERNAL_RESOLVER_ID,
			name: 'External IdP',
			type: EXTERNAL_RESOLVER_TYPE,
			config,
		}),
	]);
});

/**
 * An end-user OAuth2 credential: the shared fields (client id/secret) are static, the
 * token is not — it lives per user under the resolver.
 */
const createEndUserCredential = async ({ resolverId }: { resolverId?: string } = {}) => {
	const credential = await saveCredential(
		{
			...randomCredentialPayload({ isResolvable: true, type: 'googleSheetsOAuth2Api' }),
			// What the credential editor stores for a `googleSheetsOAuth2Api`, hidden
			// fields included — everything except the token.
			data: {
				grantType: 'authorizationCode',
				clientId: 'shared-client-id',
				clientSecret: 'shared-client-secret',
				authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
				accessTokenUrl: 'https://oauth2.googleapis.com/token',
				scope: 'https://www.googleapis.com/auth/drive',
				authQueryParameters: 'access_type=offline&prompt=consent',
				authentication: 'body',
			},
		},
		{ project: teamProject, role: 'credential:owner' },
	);

	if (resolverId) {
		await Container.get(CredentialsRepository).update(credential.id, { resolverId });
	}

	return credential;
};

/** What the connect flow stores: per-user data, encrypted, keyed by n8n user id. */
const connect = async (
	credentialId: string,
	user: User,
	oauthTokenData: object = { access_token: PER_USER_ACCESS_TOKEN, token_type: 'Bearer' },
) => {
	const encrypted = await Container.get(Cipher).encryptV2({ oauthTokenData });
	await Container.get(DynamicCredentialUserEntryStorage).setCredentialData(
		credentialId,
		user.id,
		SYSTEM_RESOLVER_ID,
		encrypted,
		{},
	);
};

const requestBody = (credential: { id: string; name: string }) => ({
	nodeTypeAndVersion: GOOGLE_SHEETS,
	path: 'parameters.documentId',
	methodName: 'spreadSheetsSearch',
	currentNodeParameters: { authentication: 'oAuth2', resource: 'sheet' },
	credentials: { googleSheetsOAuth2Api: { id: credential.id, name: credential.name } },
});

const listResources = async (user: User, credential: { id: string; name: string }) =>
	await testServer
		.authAgentFor(user)
		.post('/dynamic-node-parameters/resource-locator-results')
		.send(requestBody(credential));

/** The Drive listing, answered only for a request bearing the given user's token. */
const mockDriveListing = (accessToken = PER_USER_ACCESS_TOKEN) =>
	nock(DRIVE_HOST)
		.get(DRIVE_FILES_PATH)
		.query(true)
		.matchHeader('authorization', `Bearer ${accessToken}`)
		.reply(200, {
			files: [{ id: 'sheet-1', name: 'Q3 Forecast', webViewLink: 'https://example.com/sheet-1' }],
		});

describe('design-time parameter loading with end-user credentials', () => {
	test("resolves the requesting user's own connection", async () => {
		const credential = await createEndUserCredential();
		await connect(credential.id, member);
		const driveScope = mockDriveListing();

		const response = await listResources(member, credential);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.results).toEqual([
			{ name: 'Q3 Forecast', value: 'sheet-1', url: 'https://example.com/sheet-1' },
		]);
		// The interceptor only matches the per-user token, so a match proves the listing
		// ran on the user's own connection rather than on the static credential data.
		expect(driveScope.isDone()).toBe(true);
	});

	test('resolves per user, not per credential', async () => {
		// The same credential, shared through the same project, lists against whichever
		// user asked — the second user's token, not the first's.
		const credential = await createEndUserCredential();
		await connect(credential.id, member);
		await connect(credential.id, otherMember, {
			access_token: 'other-members-token',
			token_type: 'Bearer',
		});
		const otherMemberScope = mockDriveListing('other-members-token');

		const response = await listResources(otherMember, credential);

		expect(response.statusCode).toBe(200);
		expect(otherMemberScope.isDone()).toBe(true);
	});

	test('tells a user who has not connected, without calling the vendor', async () => {
		const credential = await createEndUserCredential();
		const driveScope = mockDriveListing();

		const response = await listResources(member, credential);

		expect(response.statusCode).toBe(500);
		expect(response.body.message).toContain('is not connected for you');
		expect(driveScope.isDone()).toBe(false);
	});

	test('refuses to send the n8n session token to an external-subject resolver', async () => {
		// This resolver's identifier reads the context identity as a token its own provider
		// issued, so resolution must be refused rather than handing over an n8n session token.
		const credential = await createEndUserCredential({ resolverId: EXTERNAL_RESOLVER_ID });
		const driveScope = mockDriveListing();

		const response = await listResources(member, credential);

		expect(response.statusCode).toBe(500);
		expect(response.body.message).toContain('resolves credentials per external user');
		expect(driveScope.isDone()).toBe(false);
	});

	test('refuses a user who may read the credential but not connect it', async () => {
		// Resolution would key on this user's own connection, which they are not allowed
		// to hold — so say that, rather than listing anything.
		const credential = await createEndUserCredential();
		const driveScope = mockDriveListing();

		const response = await listResources(viewer, credential);

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toContain('permission to connect');
		expect(driveScope.isDone()).toBe(false);
	});

	test('leaves a credential that is not end-user alone', async () => {
		const credential = await saveCredential(
			{
				...randomCredentialPayload({ isResolvable: false, type: 'googleSheetsOAuth2Api' }),
				data: {
					grantType: 'authorizationCode',
					clientId: 'shared-client-id',
					clientSecret: 'shared-client-secret',
					authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
					accessTokenUrl: 'https://oauth2.googleapis.com/token',
					scope: 'https://www.googleapis.com/auth/drive',
					oauthTokenData: { access_token: 'shared-token', token_type: 'Bearer' },
				},
			},
			{ project: teamProject, role: 'credential:owner' },
		);
		const driveScope = mockDriveListing('shared-token');

		const response = await listResources(member, credential);

		expect(response.statusCode).toBe(200);
		expect(driveScope.isDone()).toBe(true);
	});

	test('writes a refreshed token to the connection, not to the shared credential', async () => {
		const credential = await createEndUserCredential();
		await connect(credential.id, member, {
			access_token: 'expired-token',
			refresh_token: 'per-user-refresh-token',
			token_type: 'Bearer',
		});

		// Google rejects the stale token, n8n refreshes it, and the retry succeeds.
		const rejection = nock(DRIVE_HOST)
			.get(DRIVE_FILES_PATH)
			.query(true)
			.matchHeader('authorization', 'Bearer expired-token')
			.reply(401, { error: { message: 'Invalid Credentials' } });
		const refresh = nock('https://oauth2.googleapis.com')
			.post('/token', /per-user-refresh-token/)
			.reply(200, { access_token: 'refreshed-token', token_type: 'Bearer' });
		const retry = mockDriveListing('refreshed-token');

		const response = await listResources(member, credential);

		expect(response.statusCode).toBe(200);
		expect([rejection.isDone(), refresh.isDone(), retry.isDone()]).toEqual([true, true, true]);

		// The refreshed token belongs to this user alone, so it must land on their
		// connection and leave the shared credential's static data untouched.
		const entry = await Container.get(DynamicCredentialUserEntryStorage).getCredentialData(
			credential.id,
			member.id,
			SYSTEM_RESOLVER_ID,
			{},
		);
		expect(await Container.get(Cipher).decryptV2(entry!)).toContain('refreshed-token');

		const stored = await Container.get(CredentialsRepository).findOneByOrFail({
			id: credential.id,
		});
		expect(await decryptCredentialData(stored)).not.toHaveProperty('oauthTokenData');
	});
});
