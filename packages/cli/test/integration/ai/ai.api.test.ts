import { testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	CredentialsRepository,
	ProjectRepository,
	SharedCredentialsRepository,
	UserRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'crypto';
import { mock } from 'jest-mock-extended';
import { OPEN_AI_API_CREDENTIAL_TYPE } from 'n8n-workflow';

import { FREE_AI_CREDITS_CREDENTIAL_NAME } from '@/constants';
import { AiService } from '@/services/ai.service';

import { createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

const createAiCreditsResponse = {
	apiKey: randomUUID(),
	url: 'https://api.openai.com',
};

Container.set(
	AiService,
	mock<AiService>({
		createFreeAiCredits: async () => createAiCreditsResponse,
	}),
);

const testServer = setupTestServer({ endpointGroups: ['ai'] });

let owner: User;
let ownerPersonalProject: Project;

let authOwnerAgent: SuperAgentTest;

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);

	owner = await createOwner();

	ownerPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);

	authOwnerAgent = testServer.authAgentFor(owner);
});

describe('POST /ai/free-credits', () => {
	test('should create OpenAI managed credential', async () => {
		// Act
		const response = await authOwnerAgent.post('/ai/free-credits').send({
			projectId: ownerPersonalProject.id,
		});

		// Assert

		expect(response.statusCode).toBe(200);

		const { id, name, type, data: encryptedData, scopes } = response.body.data;

		expect(name).toBe(FREE_AI_CREDITS_CREDENTIAL_NAME);
		expect(type).toBe(OPEN_AI_API_CREDENTIAL_TYPE);
		expect(encryptedData).not.toBe(createAiCreditsResponse);

		expect(scopes).toEqual(
			[
				'credential:create',
				'credential:delete',
				'credential:list',
				'credential:move',
				'credential:read',
				'credential:share',
				'credential:update',
			].sort(),
		);

		const credential = await Container.get(CredentialsRepository).findOneByOrFail({ id });

		expect(credential.name).toBe(FREE_AI_CREDITS_CREDENTIAL_NAME);
		expect(credential.type).toBe(OPEN_AI_API_CREDENTIAL_TYPE);
		expect(credential.data).not.toBe(createAiCreditsResponse);
		expect(credential.isManaged).toBe(true);

		const sharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			relations: { project: true, credentials: true },
			where: { credentialsId: credential.id },
		});

		expect(sharedCredential.project.id).toBe(ownerPersonalProject.id);
		expect(sharedCredential.credentials.name).toBe(FREE_AI_CREDITS_CREDENTIAL_NAME);
		expect(sharedCredential.credentials.isManaged).toBe(true);

		const user = await Container.get(UserRepository).findOneOrFail({ where: { id: owner.id } });

		expect(user.settings?.userClaimedAiCredits).toBe(true);
	});
});
