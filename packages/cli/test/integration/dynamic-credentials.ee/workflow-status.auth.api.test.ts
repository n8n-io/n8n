import { LicenseState } from '@n8n/backend-common';
import { mockInstance, getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity } from '@n8n/db';
import {
	GLOBAL_OWNER_ROLE,
	WorkflowRepository,
	SharedWorkflowRepository,
	WorkflowEntity,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';
import type { INode } from 'n8n-workflow';

import * as utils from '../shared/utils';
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

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['dynamic-credentials'],
});

mockInstance(DynamicCredentialsConfig, {
	corsOrigin: 'https://app.example.com',
	corsAllowCredentials: false,
	endpointAuthToken: 'static-test-token',
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
			type: 'OAuth2',
			data: '',
			isResolvable: true,
			resolverId: resolver.id,
		},
		personalProject,
	);

	const node: INode = {
		id: uuid(),
		name: 'Test Node',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		credentials: {
			oAuth2Api: {
				id: savedCredential.id,
				name: savedCredential.name,
			},
		},
	};

	const workflow = new WorkflowEntity();
	workflow.name = 'Test Workflow';
	workflow.nodes = [node];
	workflow.active = true;
	workflow.versionId = uuid();
	workflow.connections = {};

	const workflowRepository = Container.get(WorkflowRepository);
	const savedWorkflow = await workflowRepository.save(workflow);

	await Container.get(SharedWorkflowRepository).save({
		workflow: savedWorkflow,
		user: owner,
		project: personalProject,
		role: 'workflow:owner',
	});

	return { savedWorkflow, savedCredential };
};

describe('Workflow Status API', () => {
	let savedWorkflow: WorkflowEntity;
	let savedCredential: CredentialsEntity;

	beforeAll(async () => {
		await testDb.truncate([
			'User',
			'SharedWorkflow',
			'WorkflowEntity',
			'CredentialsEntity',
			'DynamicCredentialResolver',
		]);

		({ savedWorkflow, savedCredential } = await setupWorkflow());
	});

	afterAll(async () => {
		await testDb.terminate();
		testServer.httpServer.close();
	});

	describe('GET /workflows/:workflowId/execution-status', () => {
		describe('when a static auth token is provided', () => {
			it('should return the execution status of a workflow', async () => {
				const response = await testServer.authlessAgent
					.get(`/workflows/${savedWorkflow.id}/execution-status`)
					.set('Authorization', 'Bearer test-token')
					.set('X-Authorization', 'Bearer static-test-token')
					.expect(200);

				expect(response.body.data).toMatchObject({
					workflowId: savedWorkflow.id,
					readyToExecute: expect.any(Boolean),
					credentials: expect.arrayContaining([
						expect.objectContaining({
							credentialId: savedCredential.id,
							credentialName: savedCredential.name,
							credentialType: savedCredential.type,
							credentialStatus: expect.any(String),
						}),
					]),
				});
			});

			it('should return 401 if the static auth token is invalid', async () => {
				await testServer.authlessAgent
					.get(`/workflows/${savedWorkflow.id}/execution-status`)
					.set('Authorization', 'Bearer test-token')
					.set('X-Authorization', 'Bearer invalid-token')
					.expect(401);
			});

			it('should return 401 if the static auth token is missing', async () => {
				await testServer.authlessAgent
					.get(`/workflows/${savedWorkflow.id}/execution-status`)
					.set('Authorization', 'Bearer test-token')
					.expect(401);
			});

			it('should return 401 if the static auth token is empty', async () => {
				await testServer.authlessAgent
					.get(`/workflows/${savedWorkflow.id}/execution-status`)
					.set('Authorization', 'Bearer test-token')
					.set('X-Authorization', 'Bearer ')
					.expect(401);
			});
		});

		it('should return 401 if the authorization header is missing', async () => {
			await testServer.authlessAgent
				.get(`/workflows/${savedWorkflow.id}/execution-status`)
				.set('X-Authorization', 'Bearer static-test-token')
				.expect(401);
		});
	});
});
