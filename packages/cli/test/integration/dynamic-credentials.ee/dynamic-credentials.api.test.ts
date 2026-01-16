import { LicenseState } from '@n8n/backend-common';
import { mockInstance, getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity } from '@n8n/db';
import { GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import * as utils from '../shared/utils/';
import { DynamicCredentialResolverService } from '@/modules/dynamic-credentials.ee/services/credential-resolver.service';
import { Telemetry } from '@/telemetry';
import { createCredentials } from '../shared/db/credentials';
import { DynamicCredentialsConfig } from '@/modules/dynamic-credentials.ee/dynamic-credentials.config';

import { createUser } from '../shared/db/users';

mockInstance(Telemetry);

const licenseMock = mock<LicenseState>();
licenseMock.isLicensed.mockReturnValue(true);
Container.set(LicenseState, licenseMock);

process.env.N8N_ENV_FEAT_DYNAMIC_CREDENTIALS = 'true';

mockInstance(DynamicCredentialsConfig, {
	endpointAuthToken: '',
	corsOrigin: 'https://app.example.com',
	corsAllowCredentials: false,
});

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['dynamic-credentials'],
});

const setupWorkflow = async () => {
	const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	const resolverService = Container.get(DynamicCredentialResolverService);

	const resolver = await resolverService.create({
		name: 'Test Resolver',
		type: 'credential-resolver.stub-1.0',
		config: { prefix: 'test-' },
		user: owner,
	});

	const personalProject = await getPersonalProject(owner);

	const savedCredential = await createCredentials(
		{
			name: 'Test Dynamic Credential',
			type: 'oauth2',
			data: '',
			isResolvable: true,
			resolverId: resolver.id,
		},
		personalProject,
	);
	return savedCredential;
};

describe('Workflow Status API', () => {
	let savedCredential: CredentialsEntity;

	beforeAll(async () => {
		await testDb.truncate(['User', 'CredentialsEntity', 'DynamicCredentialResolver']);

		savedCredential = await setupWorkflow();
	});

	afterAll(async () => {
		await testDb.terminate();
		testServer.httpServer.close();
	});

	describe('GET /credentials/:id/authorize', () => {
		describe('when no static auth token is provided', () => {
			it('should return the execution status of a workflow', async () => {
				const response = await testServer.authlessAgent
					.post(`/credentials/${savedCredential.id}/authorize`)
					.expect(200);

				expect(response.body.data).toMatchObject({
					authorizationUrl: expect.any(String),
				});
			});
		});
	});
});
