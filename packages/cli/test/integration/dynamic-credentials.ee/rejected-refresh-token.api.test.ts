import { LicenseState } from '@n8n/backend-common';
import { createWorkflow, getPersonalProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity, Person } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type {
	ICredentialContext,
	IExecutionContext,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import { CredentialsHelper } from '@/credentials-helper';
import {
	SYSTEM_RESOLVER_ID,
	SYSTEM_RESOLVER_NAME,
	SYSTEM_RESOLVER_TYPE,
} from '@/modules/dynamic-credentials.ee/constants';
import { DynamicCredentialResolverRepository } from '@/modules/dynamic-credentials.ee/database/repositories/credential-resolver.repository';
import { DynamicCredentialsConfig } from '@/modules/dynamic-credentials.ee/dynamic-credentials.config';
import { DynamicCredentialResolverRegistry } from '@/modules/dynamic-credentials.ee/services/credential-resolver-registry.service';
import { CredentialResolverWorkflowService } from '@/modules/dynamic-credentials.ee/services/credential-resolver-workflow.service';
import { Telemetry } from '@/telemetry';

import { createCredentials } from '../shared/db/credentials';
import { createMember, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

mockInstance(Telemetry);

const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';

mockInstance(DynamicCredentialsConfig, {
	endpointAuthToken: 'static-test-token',
	corsOrigin: 'https://app.example.com',
	corsAllowCredentials: false,
});

setupTestServer({
	endpointGroups: ['credentials'],
	modules: ['dynamic-credentials'],
});

const CREDENTIAL_TYPE = 'oAuth2Api';
const resolverHandle = {
	configuration: {},
	resolverId: SYSTEM_RESOLVER_ID,
	resolverName: SYSTEM_RESOLVER_NAME,
};

let owner: Person;
let member: Person;
let credential: CredentialsEntity;
let workflowId: string;

/** The caller identity that an editor run carries: the user's own auth cookie. */
const credentialContextFor = (person: Person): ICredentialContext => ({
	version: 1,
	identity: Container.get(AuthService).issueJWT(person, person.mfaEnabled, 'browser-1'),
	metadata: { source: 'manual-execution' },
});

const additionalDataFor = async (context: ICredentialContext) => {
	const executionContext: IExecutionContext = {
		version: 1,
		establishedAt: Date.now(),
		source: 'manual',
		credentials: await Container.get(Cipher).encryptV2(JSON.stringify(context)),
	};
	return { executionContext, workflowSettings: {} } as IWorkflowExecuteAdditionalData;
};

const resolver = () => {
	const instance = Container.get(DynamicCredentialResolverRegistry).getResolverByTypename(
		SYSTEM_RESOLVER_TYPE,
	);
	if (!instance) throw new Error('n8n resolver is not registered');
	return instance;
};

const storeToken = async (context: ICredentialContext, refreshToken: string) =>
	await resolver().setSecret(
		credential.id,
		context,
		{ oauthTokenData: { access_token: 'access', refresh_token: refreshToken } },
		resolverHandle,
	);

const statusFor = async (context: ICredentialContext) => {
	const [status] = await Container.get(CredentialResolverWorkflowService).getWorkflowStatus(
		workflowId,
		context,
	);
	return status?.status;
};

const discardRejectedToken = async (context: ICredentialContext, rejectedRefreshToken: string) =>
	await Container.get(CredentialsHelper).discardRejectedOauthTokenData(
		{ id: credential.id, name: credential.name },
		CREDENTIAL_TYPE,
		rejectedRefreshToken,
		await additionalDataFor(context),
	);

beforeEach(async () => {
	await testDb.truncate([
		'DynamicCredentialUserEntry',
		'DynamicCredentialResolver',
		'SharedCredentials',
		'CredentialsEntity',
		'SharedWorkflow',
		'WorkflowEntity',
	]);

	owner = await createOwner();
	member = await createMember();

	const resolverRepository = Container.get(DynamicCredentialResolverRepository);
	await resolverRepository.save(
		resolverRepository.create({
			id: SYSTEM_RESOLVER_ID,
			name: SYSTEM_RESOLVER_NAME,
			type: SYSTEM_RESOLVER_TYPE,
			config: await Container.get(Cipher).encryptV2('{}'),
		}),
	);

	credential = await createCredentials(
		{
			name: 'Acme OAuth2',
			type: CREDENTIAL_TYPE,
			data: '',
			isResolvable: true,
			resolverId: SYSTEM_RESOLVER_ID,
		},
		await getPersonalProject(owner),
	);

	const workflow = await createWorkflow(
		{
			nodes: [
				{
					id: uuid(),
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4,
					position: [0, 0],
					parameters: {},
					credentials: { [CREDENTIAL_TYPE]: { id: credential.id, name: credential.name } },
				},
			],
		},
		owner,
	);
	workflowId = workflow.id;
});

describe('end-user credential with a rejected refresh token', () => {
	test('the next status check reports the credential as missing', async () => {
		const context = credentialContextFor(owner);
		await storeToken(context, 'rejected-refresh');
		expect(await statusFor(context)).toBe('configured');

		await discardRejectedToken(context, 'rejected-refresh');

		expect(await statusFor(context)).toBe('missing');
	});

	test('keeps a token that the caller stored after the rejected one', async () => {
		const context = credentialContextFor(owner);
		await storeToken(context, 'new-refresh');

		await discardRejectedToken(context, 'rejected-refresh');

		expect(await statusFor(context)).toBe('configured');
	});

	test("keeps another user's connection to the same credential", async () => {
		const ownerContext = credentialContextFor(owner);
		const memberContext = credentialContextFor(member);
		await storeToken(ownerContext, 'shared-looking-refresh');
		await storeToken(memberContext, 'shared-looking-refresh');

		await discardRejectedToken(ownerContext, 'shared-looking-refresh');

		expect(await statusFor(ownerContext)).toBe('missing');
		await expect(
			resolver().getSecret(credential.id, memberContext, resolverHandle),
		).resolves.toMatchObject({ oauthTokenData: { refresh_token: 'shared-looking-refresh' } });
	});
});
