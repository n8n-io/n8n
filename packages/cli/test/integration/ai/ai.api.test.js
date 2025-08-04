'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const crypto_1 = require('crypto');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const constants_1 = require('@/constants');
const ai_service_1 = require('@/services/ai.service');
const users_1 = require('../shared/db/users');
const utils_1 = require('../shared/utils');
const createAiCreditsResponse = {
	apiKey: (0, crypto_1.randomUUID)(),
	url: 'https://api.openai.com',
};
di_1.Container.set(
	ai_service_1.AiService,
	(0, jest_mock_extended_1.mock)({
		createFreeAiCredits: async () => createAiCreditsResponse,
	}),
);
const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['ai'] });
let owner;
let ownerPersonalProject;
let authOwnerAgent;
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
	owner = await (0, users_1.createOwner)();
	ownerPersonalProject = await di_1.Container.get(
		db_1.ProjectRepository,
	).getPersonalProjectForUserOrFail(owner.id);
	authOwnerAgent = testServer.authAgentFor(owner);
});
describe('POST /ai/free-credits', () => {
	test('should create OpenAI managed credential', async () => {
		const response = await authOwnerAgent.post('/ai/free-credits').send({
			projectId: ownerPersonalProject.id,
		});
		expect(response.statusCode).toBe(200);
		const { id, name, type, data: encryptedData, scopes } = response.body.data;
		expect(name).toBe(constants_1.FREE_AI_CREDITS_CREDENTIAL_NAME);
		expect(type).toBe(n8n_workflow_1.OPEN_AI_API_CREDENTIAL_TYPE);
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
		const credential = await di_1.Container.get(db_1.CredentialsRepository).findOneByOrFail({ id });
		expect(credential.name).toBe(constants_1.FREE_AI_CREDITS_CREDENTIAL_NAME);
		expect(credential.type).toBe(n8n_workflow_1.OPEN_AI_API_CREDENTIAL_TYPE);
		expect(credential.data).not.toBe(createAiCreditsResponse);
		expect(credential.isManaged).toBe(true);
		const sharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneOrFail({
			relations: { project: true, credentials: true },
			where: { credentialsId: credential.id },
		});
		expect(sharedCredential.project.id).toBe(ownerPersonalProject.id);
		expect(sharedCredential.credentials.name).toBe(constants_1.FREE_AI_CREDITS_CREDENTIAL_NAME);
		expect(sharedCredential.credentials.isManaged).toBe(true);
		const user = await di_1.Container.get(db_1.UserRepository).findOneOrFail({
			where: { id: owner.id },
		});
		expect(user.settings?.userClaimedAiCredits).toBe(true);
	});
});
//# sourceMappingURL=ai.api.test.js.map
